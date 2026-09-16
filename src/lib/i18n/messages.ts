import type { Locale } from './locale';

const tr = {
  'site.name': 'Pati Defteri',
  'nav.home': 'Ana sayfa', 'nav.donate': 'Bağış', 'nav.ledger': 'Defter', 'nav.campaigns': 'Kampanyalar',
  'nav.general': 'Genel bütçe', 'nav.animals': 'Hayvanlar', 'nav.vets': 'Veterinerler', 'nav.posts': 'Yazılar', 'nav.adopt': 'Sahiplen',
  'home.generalBalance': 'Genel bütçe bakiyesi', 'home.activeCampaigns': 'Aktif kampanyalar', 'home.recentLedger': 'Son işlemler',
  'donate.title': 'Nasıl bağış yapılır', 'donate.iban': 'IBAN', 'donate.copy': 'Kopyala', 'donate.copied': 'Kopyalandı',
  'donate.noteFor': 'Açıklamaya şunu yazın', 'donate.noNote': 'Açıklama yazmazsanız bağış genel bütçeye gider.',
  'ledger.title': 'Defter', 'ledger.date': 'Tarih', 'ledger.direction': 'Yön', 'ledger.amount': 'Tutar', 'ledger.name': 'Gönderen',
  'ledger.note': 'Açıklama', 'ledger.allocatedTo': 'Nereye gitti', 'ledger.receipt': 'Dekont', 'ledger.in': 'Gelen', 'ledger.out': 'Giden',
  'ledger.monthTotal': 'Ay toplamı', 'ledger.filterCampaign': 'Kampanya', 'ledger.filterMonth': 'Ay', 'ledger.all': 'Tümü',
  'campaign.target': 'Hedef', 'campaign.raised': 'Toplanan', 'campaign.spent': 'Harcanan', 'campaign.fromGeneral': 'Genel bütçeden',
  'campaign.movedToGeneral': 'Genel bütçeye aktarılan', 'campaign.balance': 'Bakiye', 'campaign.surplus': 'Hedef aşıldı, fazlası',
  'campaign.completed': 'Tamamlandı', 'campaign.funded': 'Hedefe ulaşıldı', 'campaign.active': 'Devam ediyor', 'campaign.cancelled': 'İptal edildi',
  'campaign.acceptedQuote': 'Kabul edilen teklif', 'campaign.history': 'Hareketler', 'campaign.period': 'Dönem',
  'campaign.periodCovered': 'Bu ay karşılandı, fazlası sonraki aya aktarıldı', 'campaign.carriedIn': 'Önceki aydan devir', 'campaign.collected': 'Toplanan',
  'general.title': 'Genel bütçe', 'general.inflow': 'Girenler', 'general.outflow': 'Çıkanlar',
  'animal.status.street': 'Sokakta', 'animal.status.in_treatment': 'Tedavide', 'animal.status.adoptable': 'Sahiplendirilebilir',
  'animal.status.adopted': 'Sahiplendirildi', 'animal.status.deceased': 'Vefat etti',
  'vets.title': 'Veteriner ortaklarımız', 'vets.quotes': 'Teklifler',
  'adopt.title': 'Sahiplen', 'adopt.empty': 'Şu anda sahiplendirilebilecek hayvan yok.',
  'posts.title': 'Yazılar',
  'reason.note_match': 'Bağış', 'reason.manual': 'Bağış', 'reason.expense': 'Harcama', 'reason.carry_forward': 'Devir',
  'reason.surplus_to_general': 'Genel bütçeye aktarım', 'reason.top_up_from_general': 'Genel bütçeden takviye', 'reason.correction': 'Düzeltme',
} as const;

const en: Record<keyof typeof tr, string> = {
  'site.name': 'Pati Defteri',
  'nav.home': 'Home', 'nav.donate': 'Donate', 'nav.ledger': 'Ledger', 'nav.campaigns': 'Campaigns',
  'nav.general': 'General budget', 'nav.animals': 'Animals', 'nav.vets': 'Vets', 'nav.posts': 'Posts', 'nav.adopt': 'Adopt',
  'home.generalBalance': 'General budget balance', 'home.activeCampaigns': 'Active campaigns', 'home.recentLedger': 'Recent transactions',
  'donate.title': 'How to donate', 'donate.iban': 'IBAN', 'donate.copy': 'Copy', 'donate.copied': 'Copied',
  'donate.noteFor': 'Write this in the transfer note', 'donate.noNote': 'Without a note your donation goes to the general budget.',
  'ledger.title': 'Ledger', 'ledger.date': 'Date', 'ledger.direction': 'Direction', 'ledger.amount': 'Amount', 'ledger.name': 'Sender',
  'ledger.note': 'Note', 'ledger.allocatedTo': 'Allocated to', 'ledger.receipt': 'Receipt', 'ledger.in': 'In', 'ledger.out': 'Out',
  'ledger.monthTotal': 'Month total', 'ledger.filterCampaign': 'Campaign', 'ledger.filterMonth': 'Month', 'ledger.all': 'All',
  'campaign.target': 'Target', 'campaign.raised': 'Raised', 'campaign.spent': 'Spent', 'campaign.fromGeneral': 'From general budget',
  'campaign.movedToGeneral': 'Moved to general budget', 'campaign.balance': 'Balance', 'campaign.surplus': 'Target reached, surplus',
  'campaign.completed': 'Completed', 'campaign.funded': 'Target reached', 'campaign.active': 'Active', 'campaign.cancelled': 'Cancelled',
  'campaign.acceptedQuote': 'Accepted quote', 'campaign.history': 'History', 'campaign.period': 'Period',
  'campaign.periodCovered': 'This month is covered, surplus carried to next month', 'campaign.carriedIn': 'Carried from previous month', 'campaign.collected': 'Collected',
  'general.title': 'General budget', 'general.inflow': 'Inflows', 'general.outflow': 'Outflows',
  'animal.status.street': 'On the street', 'animal.status.in_treatment': 'In treatment', 'animal.status.adoptable': 'Adoptable',
  'animal.status.adopted': 'Adopted', 'animal.status.deceased': 'Deceased',
  'vets.title': 'Partner vets', 'vets.quotes': 'Quotes',
  'adopt.title': 'Adopt', 'adopt.empty': 'No animals available for adoption right now.',
  'posts.title': 'Posts',
  'reason.note_match': 'Donation', 'reason.manual': 'Donation', 'reason.expense': 'Expense', 'reason.carry_forward': 'Carry-forward',
  'reason.surplus_to_general': 'Moved to general budget', 'reason.top_up_from_general': 'Top-up from general budget', 'reason.correction': 'Correction',
};

export type MessageKey = keyof typeof tr;
const messages: Record<Locale, Record<MessageKey, string>> = { tr, en };
export function t(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
