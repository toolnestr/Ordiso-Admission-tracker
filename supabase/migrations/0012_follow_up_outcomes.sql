-- ============================================================================
-- Migration 0012: Follow-up outcomes, rescheduling, and history
-- A follow-up isn't just "done" — staff need to record WHAT happened, and very
-- often the parent asks to be called back on another day. That reschedule
-- chain is the real history of a conversation, so it's modelled explicitly
-- rather than being crammed into the original remark.
-- ============================================================================

-- What happened on the call (free text, can be long — shown in a modal).
alter table follow_ups add column if not exists outcome text;

-- Quick categorisation of the call for reporting: Reached / No answer /
-- Call back later / Not interested / Visited / Other. Free text (not an enum)
-- so institutes aren't boxed in and no migration is needed to add one.
alter table follow_ups add column if not exists outcome_tag text;

-- Who closed it (staff_id records who *scheduled* it; these differ often).
alter table follow_ups add column if not exists resolved_by uuid
  references staff(id) on delete set null;

-- Reschedule chain: when completing a follow-up you can book the next one.
-- next_follow_up_id points at the newly created row, so the UI can render the
-- whole thread ("called 3 times, next on the 30th") and never loses the trail.
alter table follow_ups add column if not exists next_follow_up_id uuid
  references follow_ups(id) on delete set null;

create index if not exists follow_ups_next_idx
  on follow_ups(next_follow_up_id)
  where next_follow_up_id is not null;
