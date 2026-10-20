# Payment verification — provider comparison and choice

Organizations pay for Pro / Enterprise by telebirr or bank transfer and paste the
transaction reference. VolunTrack checks the receipt with the issuer automatically.

## Providers compared (October 2026)

| Rank | Provider | Cost | Coverage | API | Strengths | Weaknesses |
|---|---|---|---|---|---|---|
| 1 | **Verify.ET** | Free 200 checks/month · 500 ETB / 5,000 · 3,000 ETB / 30,000 (≈ 0.10 ETB per check) | CBE, telebirr, Dashen, BOA, Awash, CBE Birr, Siinqee, M-Pesa, Kaafi/Coopay e-Birr | Documented REST (`POST /api/verify`, `x-api-key`), idempotency keys, webhooks with HMAC, settlement-account match | Cheapest paid option at our volume (subscriptions are a few payments a month — the free tier is enough); returns receiver name/account so we can prove the money reached *our* account | Commercial service; credits don’t roll over |
| 2 | **cheki** (cheki.et) | Free, MIT open source | CBE, telebirr, BOA, Dashen, Awash, Siinqee, e-Birr, CBE Birr (M-Pesa, ZamZam beta) | Same-shape REST, no key; can be self-hosted with Docker | No cost; self-hosting from an Ethiopian IP avoids geo-blocking; good fallback | Public instance rate-limited (30/min per IP), no SLA |
| 3 | **ShegerPay** | Not published (free tier “meaningful volume”, per-check above; reported as expensive) | Ethiopian banks + telebirr/M-Pesa + PayPal/Wise/Payoneer | REST with `sk_test_…` keys, webhooks | International rails | Pricing opaque; more than we need |
| 4 | Ethio Verify / Tina Verify | App subscription | CBE, telebirr, Awash | Mobile/OCR apps, no public API | Good for cashiers | Can’t be called from our server |
| 5 | Tally Verifier (Sabi) | — | — | No public documentation found | — | Could not be evaluated |
| — | VerPay (open source, Node) | Free | CBE, telebirr (scraping + OCR) | Self-host | Screenshot OCR | Scraping is brittle |

## What we implemented

`App\Services\PaymentVerifier` tries drivers in order (`PAYMENT_VERIFY_DRIVERS=verifyet,cheki`):

1. **Verify.ET** when `VERIFYET_API_KEY` is set (primary).
2. **cheki** otherwise / when Verify.ET is down, rate-limited or out of credits.
3. If neither answers, the payment waits in **Platform → Payments** for a SuperAdmin.

A payment is accepted only if **all** hold: the issuer confirms it, the amount is at least
the invoice, it was paid to our account (`PAY_RECEIVER_ACCOUNT_SUFFIX` or `PAY_ACCOUNT_NAME`),
it is at most 30 days old, and the reference was never used before (unique per bank).
A verified payment extends the organization’s plan immediately.

**To go live:** create a Verify.ET account → put the key in `VERIFYET_API_KEY` on Render →
set `PAY_*` account details and `PAY_RECEIVER_ACCOUNT_SUFFIX`. Platform → System health shows
whether each driver answers.

Sources: verify.et/pricing, verify.et/docs/api, cheki.et/docs, shegerpay.com/faq.
