-- Custom SQL migration file, put your code below! --
CREATE OR REPLACE FUNCTION check_allocation_sums(p_transaction_id uuid, p_transfer_group_id uuid)
RETURNS void AS $$
DECLARE
  v_direction tx_direction;
  v_amount bigint;
  v_published boolean;
  v_sum bigint;
  v_count int;
BEGIN
  IF p_transaction_id IS NOT NULL THEN
    SELECT direction, amount_kurus, published INTO v_direction, v_amount, v_published
      FROM transactions WHERE id = p_transaction_id;
    IF NOT FOUND THEN RETURN; END IF; -- transaction deleted, cascade removed lines
    SELECT COALESCE(SUM(amount_kurus), 0), COUNT(*) INTO v_sum, v_count
      FROM allocations WHERE transaction_id = p_transaction_id;
    IF v_count = 0 AND v_published = false THEN RETURN; END IF; -- unallocated draft is fine
    IF v_count = 0 AND v_published = true THEN
      RAISE EXCEPTION 'published transaction % has no allocations', p_transaction_id;
    END IF;
    IF v_sum <> (CASE WHEN v_direction = 'in' THEN v_amount ELSE -v_amount END) THEN
      RAISE EXCEPTION 'allocation sum % does not match transaction % amount', v_sum, p_transaction_id;
    END IF;
    IF v_direction = 'in' AND EXISTS (SELECT 1 FROM allocations WHERE transaction_id = p_transaction_id AND amount_kurus < 0) THEN
      RAISE EXCEPTION 'incoming transaction % has a negative allocation', p_transaction_id;
    END IF;
    IF v_direction = 'out' AND EXISTS (SELECT 1 FROM allocations WHERE transaction_id = p_transaction_id AND amount_kurus > 0) THEN
      RAISE EXCEPTION 'outgoing transaction % has a positive allocation', p_transaction_id;
    END IF;
  ELSIF p_transfer_group_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount_kurus), 0), COUNT(*) INTO v_sum, v_count
      FROM allocations WHERE transfer_group_id = p_transfer_group_id;
    IF v_count = 0 THEN RETURN; END IF;
    IF v_count < 2 THEN RAISE EXCEPTION 'transfer group % needs at least two lines', p_transfer_group_id; END IF;
    IF v_sum <> 0 THEN RAISE EXCEPTION 'transfer group % does not net to zero (sum %)', p_transfer_group_id, v_sum; END IF;
  END IF;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION allocations_sum_trigger() RETURNS trigger AS $$
DECLARE r RECORD;
BEGIN
  r := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  PERFORM check_allocation_sums(r.transaction_id, r.transfer_group_id);
  IF TG_OP = 'UPDATE' AND (OLD.transaction_id IS DISTINCT FROM NEW.transaction_id OR OLD.transfer_group_id IS DISTINCT FROM NEW.transfer_group_id) THEN
    PERFORM check_allocation_sums(OLD.transaction_id, OLD.transfer_group_id);
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER allocations_sum_check
  AFTER INSERT OR UPDATE OR DELETE ON allocations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION allocations_sum_trigger();

CREATE OR REPLACE FUNCTION transactions_sum_trigger() RETURNS trigger AS $$
BEGIN
  PERFORM check_allocation_sums(NEW.id, NULL);
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER transactions_sum_check
  AFTER UPDATE OF amount_kurus, direction, published ON transactions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION transactions_sum_trigger();
