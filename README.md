# Pati Defteri

Ordu'daki sokak hayvanları için şeffaf bağış ve sahiplendirme sitesi.

## Kural

Bağış hesabına giren ve çıkan **her** işlem, dekontuyla birlikte herkese açık defterde listelenir.
Sitedeki her bakiye ve ilerleme çubuğu bu defterdeki satırların toplamıdır; elle yazılan bir sayı yoktur.

- Açıklamasında kampanya adı (örn. `kori`) geçen bağış o kampanyaya sayılır.
- Açıklamasız bağış genel bütçeye gider.
- Hedefi aşan tutar, kampanya tamamlanırken görünür şekilde genel bütçeye aktarılır.
- Aylık kampanyalarda (mama gibi) ayı aşan tutar sonraki aya devredilir.
- Kişisel veriler (ad, IBAN) yayınlanmaz; dekontlar maskelenmiş halde yüklenir.

## Geliştirme

```bash
cp .env.example .env        # değerleri düzenleyin
docker compose up -d        # Postgres + MinIO
npm install
npm run db:migrate
npm run db:seed             # genel bütçe, yönetici ve örnek veriler
npm run dev                 # http://localhost:3000, yönetim: /admin
```

Testler: `npm run test:unit`, `npm run test:integration` (Docker gerekir), `npm run e2e` (uygulama + seed gerekir).

> Dikkat: `npm run test:integration`, `DATABASE_URL` ile belirtilen veritabanındaki tabloları boşaltır; yerel kullanıma dönmek için sonrasında `npm run db:seed` komutunu tekrar çalıştırın.

## Yapı

- `src/db` — şema, migrasyonlar, sorgular, mutasyonlar
- `src/lib/ledger` — para kuralları (saf fonksiyonlar, birim testli)
- `src/app/[locale]` — herkese açık sayfalar (`/` Türkçe, `/en` İngilizce)
- `src/app/admin` — yönetim paneli

---

## English

A transparency-first donation and adoption site for street animals in Ordu, Turkey.
Every transaction on the donation account is public with its receipt, and every number on the site is a sum over those rows.
See the Turkish section for setup; commands are identical.

> Note: `npm run test:integration` truncates the tables of the database in `DATABASE_URL`; re-run `npm run db:seed` afterwards to get local data back.
