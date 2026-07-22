// create-patient — Phase 1.4 (Development Plan.md).
//
// Called by a logged-in doctor from add-patient.tsx. Creates a patient
// auth.users row (synthetic email, since patients log in with a username —
// see the 0001_initial_schema.sql migration header for why) using the
// service role, then inserts the profiles and patient_substances rows.
//
// This is NOT a single atomic transaction — it's three separate calls
// against Auth + two tables. If a later step fails, we best-effort roll
// back the steps that already succeeded (delete the orphaned auth user,
// etc.) rather than leaving a half-created account. This is a known
// limitation of doing this from an Edge Function instead of a single DB
// transaction; acceptable for a prototype's admin-only patient-creation
// path, worth flagging honestly rather than pretending it's atomic.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const DRUG_CLASSES = [
  'cannabis',
  'synthetic_cannabinoids',
  'heroin_opioids',
  'stimulants',
  'sedatives_benzo',
  'other_polydrug',
] as const;

interface DrugClassSelection {
  drugClass: (typeof DRUG_CLASSES)[number];
  isPrimary: boolean;
}

interface CreatePatientBody {
  fullName: string;
  username: string;
  password: string;
  startDate: string; // ISO date — used as both sobriety_start_date and recovery_start_date
  drugClasses: DrugClassSelection[];
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // --- Step 1: verify the caller is a real, logged-in, non-archived doctor ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401);
  }

  const { data: callerProfile, error: callerProfileError } = await callerClient
    .from('profiles')
    .select('role, archived')
    .eq('id', callerData.user.id)
    .single();

  if (callerProfileError || !callerProfile || callerProfile.role !== 'doctor' || callerProfile.archived) {
    return jsonResponse({ error: 'Only an active doctor account can create patients' }, 403);
  }

  const doctorId = callerData.user.id;

  // --- Step 2: validate the request body ---
  let body: CreatePatientBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const fullName = body.fullName?.trim();
  const username = body.username?.trim().toLowerCase();
  const { password, startDate, drugClasses } = body;

  if (!fullName) return jsonResponse({ error: 'fullName is required' }, 400);
  if (!username || !/^[a-z0-9_.]{3,32}$/.test(username)) {
    return jsonResponse({ error: 'username must be 3-32 characters: letters, numbers, underscore, or dot' }, 400);
  }
  if (!password || password.length < 8) {
    return jsonResponse({ error: 'password must be at least 8 characters' }, 400);
  }
  if (!startDate || Number.isNaN(Date.parse(startDate))) {
    return jsonResponse({ error: 'startDate must be a valid ISO date' }, 400);
  }
  if (!Array.isArray(drugClasses) || drugClasses.length === 0) {
    return jsonResponse({ error: 'At least one drug class must be selected' }, 400);
  }
  if (drugClasses.some((d) => !DRUG_CLASSES.includes(d.drugClass))) {
    return jsonResponse({ error: 'One or more drugClass values are not recognized' }, 400);
  }
  const primaryCount = drugClasses.filter((d) => d.isPrimary).length;
  if (primaryCount !== 1) {
    return jsonResponse({ error: 'Exactly one drug class must be marked primary' }, 400);
  }

  const syntheticEmail = `${username}@patients.recovai.internal`;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // --- Step 3: create the auth user ---
  const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true, // no real inbox for this address — skip confirmation
    user_metadata: { role: 'patient' }, // tells the doctor-signup trigger to skip itself
  });

  if (createUserError || !newUser.user) {
    const message = createUserError?.message.includes('already been registered')
      ? 'That username is already taken.'
      : createUserError?.message ?? 'Failed to create patient account.';
    return jsonResponse({ error: message }, 400);
  }

  const patientId = newUser.user.id;

  // --- Step 4: insert the profiles row ---
  const { error: profileError } = await adminClient.from('profiles').insert({
    id: patientId,
    role: 'patient',
    full_name: fullName,
    username,
    assigned_doctor_id: doctorId,
    sobriety_start_date: startDate,
    // The only place a profile is created with this false — the column
    // defaults to true so existing accounts never see the walkthrough.
    onboarding_completed: false,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(patientId); // best-effort rollback
    return jsonResponse({ error: `Failed to create patient profile: ${profileError.message}` }, 500);
  }

  // --- Step 5: insert patient_substances rows ---
  const { error: substancesError } = await adminClient.from('patient_substances').insert(
    drugClasses.map((d) => ({
      patient_id: patientId,
      drug_class: d.drugClass,
      is_primary: d.isPrimary,
      recovery_start_date: startDate,
    }))
  );

  if (substancesError) {
    // Best-effort rollback of everything created so far.
    await adminClient.from('profiles').delete().eq('id', patientId);
    await adminClient.auth.admin.deleteUser(patientId);
    return jsonResponse({ error: `Failed to assign drug class: ${substancesError.message}` }, 500);
  }

  return jsonResponse({ id: patientId, username }, 200);
});
