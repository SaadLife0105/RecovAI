-- Lower the minimum allowed zone radius from 100m to 50m. A 100m minimum
-- looked disproportionately large on the map for small, precise locations
-- (e.g. a specific doorway or corner) — 50m is a more usable floor.
--
-- This is paired with switching both zone-proximity watchers
-- (lib/hooks/useZoneMonitor.ts and lib/backgroundLocationTask.ts) from
-- Location.Accuracy.Balanced (~100m target, often WiFi/cell-based, not GPS)
-- to Location.Accuracy.High (~10m target, actually uses GPS), plus an
-- accuracy-aware safeguard that skips any in/out determination when the
-- device's own reported position uncertainty exceeds the zone's radius.
-- Without that pairing, a 50m zone would be smaller than the position noise
-- Balanced alone could introduce, making small zones unreliable.
alter table public.risk_zones drop constraint if exists risk_zones_radius_m_check;
alter table public.risk_zones add constraint risk_zones_radius_m_check check (radius_m between 50 and 1000);
