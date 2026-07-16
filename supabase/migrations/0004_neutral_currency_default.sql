-- ============================================================================
-- Migration 0004: Region-neutral currency default
--
-- The initial schema defaulted `institutes.currency` to 'Rs.', which gave new
-- institutes a region-specific feel. Ordiso is a global product, so new
-- signups now default to '$' and pick their own currency in Settings.
--
-- Existing institutes are intentionally NOT rewritten — their currency is a
-- real choice we shouldn't silently change.
-- ============================================================================

alter table institutes
  alter column currency set default '$';
