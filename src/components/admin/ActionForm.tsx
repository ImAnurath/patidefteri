'use client';
import { useActionState } from 'react';
import { INITIAL_ACTION_STATE, type ActionState } from '@/lib/action-state';

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
};

export function ActionForm({ action, children, submitLabel = 'Kaydet', className }: Props) {
  const [state, formAction, pending] = useActionState(action, INITIAL_ACTION_STATE);
  return (
    <form action={formAction} className={className ?? 'flex flex-col gap-3 max-w-xl'}>
      {children}
      {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
      {state.ok && <p className="text-green-700">Kaydedildi.</p>}
      <button type="submit" disabled={pending} className="border px-3 py-1 self-start">{pending ? '…' : submitLabel}</button>
    </form>
  );
}
