// Cleanup-only companion to lib/integrationCheckinToAlert.test.ts.
//
// That test's own afterAll already does this cleanup — but only when it runs,
// which means re-running the WHOLE test just to trigger cleanup wastes a
// second real, paid Anthropic call for no new test value. This script does
// exactly the same deletes, standalone, with zero risk-agent invocation and
// zero cost beyond ordinary Supabase admin calls.
//
// Deletes, for the integration fixture patient only:
//   - chat_conversations (cascades to chat_messages)
//   - alerts
//   - agent_runs
//   - today's checkins row (scoped to patient_id + today's date specifically,
//     never touching any other check-in)
//   - resets flagged_for_urgent_review to false
//
// Safe to run any time, including when there's nothing to clean (every delete
// is a no-op if the row doesn't exist).
//
// HOW TO RUN (service-role key required — never commit it):
//   PowerShell:
//     $env:SUPABASE_URL="https://<project-ref>.supabase.co";
//     $env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key>";
//     node supabase/scripts/cleanup-integration-test-fixture.mjs

import { createClient } from '@supabase/supabase-js';

const PATIENT_FULL_NAME = 'TEST FIXTURE — Patient Integration (E2E)';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.');
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

// Mauritius (UTC+4) "today" — same convention as the fixture/test scripts.
const TODAY = new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 10);

const { data: patient, error: lookupError } = await admin
  .from('profiles')
  .select('id')
  .eq('full_name', PATIENT_FULL_NAME)
  .eq('role', 'patient')
  .maybeSingle();

if (lookupError) {
  console.error(`Could not look up the fixture patient: ${lookupError.message}`);
  process.exit(1);
}
if (!patient) {
  console.log(`Fixture patient '${PATIENT_FULL_NAME}' not found — nothing to clean up.`);
  process.exit(0);
}

const patientId = patient.id;
const log = (label, error) => console.log(`cleanup ${label}: ${error ? `FAILED ${error.message}` : 'ok'}`);

log('chat_conversations', (await admin.from('chat_conversations').delete().eq('patient_id', patientId)).error);
log('alerts', (await admin.from('alerts').delete().eq('patient_id', patientId)).error);
log('agent_runs', (await admin.from('agent_runs').delete().eq('patient_id', patientId)).error);
log('checkins (today only)', (await admin.from('checkins').delete().eq('patient_id', patientId).eq('date', TODAY)).error);
log(
  'reset flagged_for_urgent_review',
  (await admin.from('profiles').update({ flagged_for_urgent_review: false }).eq('id', patientId)).error
);

console.log(`\nFixture patient ${patientId} is clean. Safe to re-run the integration test.`);
