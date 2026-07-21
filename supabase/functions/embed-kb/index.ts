// embed-kb — one-off KB embedding seed (Development Plan.md §4.1).
//
// Embeds ONE curated KB_SEED_CONTENT chunk per invocation with Supabase's
// built-in gte-small model (384-dim, no external API key) and inserts it into
// kb_documents using the service role. The caller loops index 0..N-1 (see the
// PowerShell loop in the seeding notes). One chunk per request keeps each call
// well under the Edge Runtime per-isolate CPU/wall-clock budget — embedding
// all 19 in a single request tripped a 546 WORKER_LIMIT error.
//
// Deploy + call manually; not client-facing.
//
// Auth: this endpoint writes to kb_documents with the service role, so it
// must never be publicly callable with no auth. It requires a shared secret
// in the `x-seed-secret` header, checked against the KB_SEED_SECRET env var.
//
// Bundling note: KB_SEED_CONTENT is imported from a local ./kb-content.ts
// copy of supabase/seed/kb-content.ts — Edge Functions bundle per-function
// and can't reach supabase/seed/, so the seed file is duplicated here.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { KB_SEED_CONTENT } from './kb-content.ts';

// Supabase's in-Edge-Function embedding runtime (gte-small). Declared on the
// global `Supabase` object at runtime; typed loosely here since there's no
// Deno type for it in this project.
// deno-lint-ignore no-explicit-any
declare const Supabase: any;

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

  // --- Shared-secret gate ---
  const expectedSecret = Deno.env.get('KB_SEED_SECRET');
  if (!expectedSecret) {
    return jsonResponse({ error: 'KB_SEED_SECRET is not configured on the function' }, 500);
  }
  if (req.headers.get('x-seed-secret') !== expectedSecret) {
    return jsonResponse({ error: 'Missing or invalid x-seed-secret header' }, 401);
  }

  // --- Validate the requested chunk index ---
  let body: { index?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const index = body.index;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= KB_SEED_CONTENT.length) {
    return jsonResponse(
      { error: `index must be an integer 0..${KB_SEED_CONTENT.length - 1}` },
      400
    );
  }

  const chunk = KB_SEED_CONTENT[index];

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // --- Idempotency: on index 0 only, clear existing rows before seeding ---
  if (index === 0) {
    const { error: deleteError } = await adminClient
      .from('kb_documents')
      .delete()
      .not('id', 'is', null); // delete-all guard: PostgREST requires a filter
    if (deleteError) {
      return jsonResponse({ error: `Failed to clear kb_documents: ${deleteError.message}` }, 500);
    }
  }

  // --- Embed + insert this single chunk ---
  try {
    const session = new Supabase.ai.Session('gte-small');
    // gte-small returns a 384-dim vector when normalized.
    const embedding = (await session.run(chunk.content, {
      mean_pool: true,
      normalize: true,
    })) as number[];

    const { error: insertError } = await adminClient.from('kb_documents').insert({
      content: chunk.content,
      embedding,
      source: chunk.source,
      category: chunk.category,
      drug_class: chunk.drug_class,
    });

    if (insertError) {
      return jsonResponse({ index, inserted: false, source: chunk.source, error: insertError.message }, 500);
    }

    return jsonResponse({ index, inserted: true, source: chunk.source }, 200);
  } catch (e) {
    return jsonResponse(
      { index, inserted: false, source: chunk.source, error: e instanceof Error ? e.message : String(e) },
      500
    );
  }
});
