import { ActionForm } from '@/components/admin/ActionForm';
import { createTransactionAction } from '../actions';
import { TransactionFields } from '../TransactionFields';

export default function NewTransaction() {
  return (
    <div>
      <h1 className="text-xl mb-4">Yeni işlem</h1>
      <ActionForm action={createTransactionAction} submitLabel="Kaydet ve dağıtıma geç">
        <TransactionFields />
      </ActionForm>
    </div>
  );
}
