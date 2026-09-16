import type { TransactionRow } from '@/db/queries/ledger';
export function TransactionFields({ tx }: { tx?: TransactionRow }) {
  return (
    <>
      {tx && <input type="hidden" name="id" value={tx.id} />}
      {tx?.receiptAttachmentId && <input type="hidden" name="existingReceipt" value={tx.receiptAttachmentId} />}
      <label>Yön <select name="direction" defaultValue={tx?.direction ?? 'in'} className="border"><option value="in">Gelen (bağış)</option><option value="out">Giden (harcama)</option></select></label>
      <label>Tutar (TL) <input name="amount" defaultValue={tx ? (tx.amountKurus / 100).toString().replace('.', ',') : ''} required className="border px-2 py-1" placeholder="1.250,50" /></label>
      <label>Banka tarihi <input type="date" name="occurredAt" defaultValue={tx?.occurredAt ?? ''} required className="border" /></label>
      <label>Açıklama (dekonttaki) <input name="rawNote" defaultValue={tx?.rawNote ?? ''} className="border px-2 py-1 w-full" /></label>
      <label>Gönderen (maskeli, ör. O*** G***) <input name="displayName" defaultValue={tx?.displayName ?? ''} className="border px-2 py-1 w-full" /></label>
      <label>Dekont / fatura {tx?.receiptAttachmentId && <a href={`/dosya/${tx.receiptAttachmentId}`} target="_blank" className="underline">mevcut dosya</a>} <input type="file" name="receipt" accept="application/pdf,image/*" /></label>
      <label><input type="checkbox" name="redactionConfirmed" defaultChecked={tx?.redactionConfirmed ?? false} /> Dosyada ad, IBAN gibi kişisel veriler gizlendi</label>
    </>
  );
}
