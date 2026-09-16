import Link from 'next/link';
import { resolveLocale } from '@/lib/i18n/params';
import { localePath } from '@/lib/i18n/locale';
import { pickLocalized } from '@/lib/i18n/localized';
import { t } from '@/lib/i18n/messages';
import { listCampaigns } from '@/db/queries/campaigns';
import type { MessageKey } from '@/lib/i18n/messages';
import type { CampaignStatus } from '@/lib/ledger/types';

const statusKey: Record<Exclude<CampaignStatus, 'draft'>, MessageKey> = {
  active: 'campaign.active', funded: 'campaign.funded', completed: 'campaign.completed', cancelled: 'campaign.cancelled',
};

export default async function Campaigns(props: PageProps<'/[locale]/kampanyalar'>) {
  const locale = await resolveLocale(props.params);
  const rows = (await listCampaigns({ kinds: ['one_off', 'recurring'] }))
    .filter((c): c is typeof c & { status: Exclude<CampaignStatus, 'draft'> } => c.status !== 'draft');
  return (
    <div>
      <h1 className="text-lg mb-4">{t(locale, 'nav.campaigns')}</h1>
      <ul className="flex flex-col gap-2">{rows.map((c) => <li key={c.id}><Link href={localePath(locale, `/kampanyalar/${c.slug}`)} className="underline">{pickLocalized(c.title, locale)}</Link> — {t(locale, statusKey[c.status])}</li>)}</ul>
    </div>
  );
}
