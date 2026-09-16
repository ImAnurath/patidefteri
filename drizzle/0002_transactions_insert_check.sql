-- Custom SQL migration file, put your code below! --
DROP TRIGGER IF EXISTS transactions_sum_check ON transactions;

CREATE CONSTRAINT TRIGGER transactions_sum_check
  AFTER INSERT OR UPDATE OF amount_kurus, direction, published ON transactions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION transactions_sum_trigger();
