-- Widen the binary safe/risk zone classification to 4 levels. Existing rows
-- (all currently 'safe' or 'risk') remain valid; 'risk' is renamed to
-- 'high_risk' for consistency with the new naming, existing data keeps its
-- meaning unchanged. Doctors can re-classify existing zones to the new
-- intermediate levels at their discretion; nothing is auto-migrated to them.
alter type zone_classification rename value 'risk' to 'high_risk';
alter type zone_classification add value 'low_risk' after 'safe';
alter type zone_classification add value 'medium_risk' after 'low_risk';

-- zone_type becomes optional (a secondary descriptive tag) — the label field
-- is now the primary identifier a doctor sets when creating a zone.
alter table public.risk_zones alter column zone_type drop not null;
