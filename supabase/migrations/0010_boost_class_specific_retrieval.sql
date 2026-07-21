-- ============================================================================
-- Boost class-specific KB retrieval ranking (Development Plan.md §4.5)
--
-- Found via the DeepEval evaluation harness's first run (2026-07-20):
-- contextual precision/recall on class_specific_coping questions (0.307 /
-- 0.300) was much lower than general_coping questions (0.783 / 0.833).
-- Root cause: the knowledge base has only ~19 chunks total, and most drug
-- classes have just ONE chunk specifically tagged to them, competing for a
-- top-5 slot against ~13 general (drug_class IS NULL) chunks that also pass
-- match_documents' filter for every patient. The original function ordered
-- purely by raw cosine distance with no preference for an exact class
-- match, so the one relevant chunk could easily be crowded out or diluted
-- by several general chunks that were merely semantically adjacent.
--
-- Fix: apply a modest similarity boost (0.05, on a [0,1] cosine-distance
-- scale since embeddings are stored normalized) to exact class matches
-- before ranking. This is a soft preference, not a hard partition —
-- general content (including crisis/safety material) can still outrank a
-- class-specific chunk if it's meaningfully more relevant to the actual
-- query; it only tips close calls in the class-specific chunk's favour.
-- Re-run the DeepEval harness after this to confirm the actual improvement
-- rather than assuming the fix worked — same "verify, don't assume"
-- discipline as everywhere else in this project.
-- ============================================================================

create or replace function public.match_documents(
  query_embedding vector(384),
  match_count int,
  patient_drug_class drug_class default null
)
returns table (
  id uuid,
  content text,
  source text,
  category text,
  similarity float
)
language sql stable
as $$
  select
    kb_documents.id,
    kb_documents.content,
    kb_documents.source,
    kb_documents.category,
    1 - (kb_documents.embedding <=> query_embedding) as similarity
  from public.kb_documents
  where kb_documents.drug_class is null
     or kb_documents.drug_class = patient_drug_class
  order by
    (kb_documents.embedding <=> query_embedding)
    - (case when kb_documents.drug_class = patient_drug_class then 0.05 else 0 end)
  limit match_count;
$$;
