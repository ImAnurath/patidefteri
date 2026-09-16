import { ActionForm } from '@/components/admin/ActionForm';
import { LocalizedFields } from '@/components/admin/LocalizedFields';
import { getCampaignById, getGeneralCampaign, toCampaignRef } from '@/db/queries/campaigns';
import { getCountedLines } from '@/db/queries/ledger';
import { getGeneralBalance } from '@/db/queries/summaries';
import { planCompletion } from '@/lib/ledger';
import { formatKurus } from '@/lib/money';
import { completeCampaignAction } from '../actions';

export async function CompletionPanel({ campaignId }: { campaignId: string }) {
  const c = await getCampaignById(campaignId);
  if (!c) return null;
  const general = await getGeneralCampaign();
  const plan = planCompletion({ campaign: toCampaignRef(c), lines: await getCountedLines(c.id), generalId: general.id, generalBalance: await getGeneralBalance() });
  const explain: Record<string, string> = {
    NO_EXPENSE: 'Önce harcama (vet ödemesi) kaydı girin.',
    BALANCE_POSITIVE: `Fazla ${formatKurus(plan.balance, 'tr')} tamamlarken genel bütçeye aktarılacak.`,
    BALANCE_NEGATIVE: `Açık ${formatKurus(-plan.balance, 'tr')} tamamlarken genel bütçeden karşılanacak.`,
    GENERAL_INSUFFICIENT: 'Genel bütçe açığı karşılayamıyor.',
    WRONG_STATUS: 'Kampanya bu durumda tamamlanamaz.',
  };
  const blocked = plan.blocker === 'NO_EXPENSE' || plan.blocker === 'GENERAL_INSUFFICIENT' || plan.blocker === 'WRONG_STATUS';
  return (
    <section className="border p-3">
      <h2 className="font-bold">Tamamla</h2>
      <p>Bakiye: {formatKurus(plan.balance, 'tr')}. {plan.blocker ? explain[plan.blocker] : 'Bakiye sıfır, tamamlanabilir.'}</p>
      {!blocked && (
        <ActionForm action={completeCampaignAction} submitLabel="Kampanyayı tamamla">
          <input type="hidden" name="id" value={c.id} />
          <LocalizedFields name="closingNote" label="Kapanış notu" required={false} />
        </ActionForm>
      )}
    </section>
  );
}
