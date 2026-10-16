-- Custom SQL migration: decision_status view and append-only trigger on decisions

CREATE OR REPLACE VIEW "decision_status" AS
SELECT DISTINCT ON ("decision_id")
  "id",
  "decision_id",
  "status",
  "circle_tx_id",
  "tx_hash",
  "error",
  "data",
  "created_at"
FROM "decision_events"
ORDER BY "decision_id", "created_at" DESC;

--> statement-breakpoint

CREATE OR REPLACE FUNCTION prevent_decision_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'decisions table is append-only: UPDATE and DELETE are prohibited';
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

CREATE TRIGGER trg_decisions_append_only
BEFORE UPDATE OR DELETE ON "decisions"
FOR EACH ROW
EXECUTE FUNCTION prevent_decision_modification();