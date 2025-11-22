-- Seats meta operations (no realtime tables changed)
-- seats table already created in 20251122_finance_and_seats.sql
-- add check-in helpers
ALTER TABLE seats
  ADD COLUMN IF NOT EXISTS last_check_in timestamptz,
  ADD COLUMN IF NOT EXISTS last_check_out timestamptz;

-- indexes
CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(org_id, status);
