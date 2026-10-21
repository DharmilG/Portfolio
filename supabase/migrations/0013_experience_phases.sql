-- 0013 — experience phases.
-- The Experience page reads an authored two-part narrative (Part 01 / Part 02)
-- with per-achievement lead-ins and tags. `highlights` stays the flat list used
-- by About and by the hackathon cards; `phases` is the richer editorial layer.
alter table experiences
  add column if not exists phases jsonb not null default '[]'::jsonb;

alter table experiences
  drop constraint if exists experiences_phases_array;
alter table experiences
  add constraint experiences_phases_array
  check (jsonb_typeof(phases) = 'array');
