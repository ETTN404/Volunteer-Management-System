<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Checks an Ethiopian bank / wallet receipt against the issuer's own record.
 *
 * Drivers run in the order of config('plans.verifier.drivers'):
 *   - verifyet: Verify.ET API (x-api-key). Skipped when no key is set.
 *   - cheki:    cheki.et open-source API (no key) or a self-hosted instance.
 * A driver either returns a normalized receipt or null (could not decide —
 * network error, rate limit, unsupported bank). Undecided payments stay
 * `pending` for a SuperAdmin.
 *
 * A receipt only verifies a payment when ALL of these hold:
 *   verified by the issuer · amount ≥ invoice · paid to our account · not older
 *   than `max_age_days` · reference never used before (unique index too).
 */
class PaymentVerifier
{
    public const OUTCOME_VERIFIED = 'verified';
    public const OUTCOME_REJECTED = 'rejected';
    public const OUTCOME_UNDECIDED = 'undecided';

    /** @return array{outcome: string, reason: string, source: ?string, receipt: ?array, attempts: array} */
    public function verify(Payment $payment): array
    {
        $attempts = [];
        foreach (config('plans.verifier.drivers', []) as $driver) {
            $started = microtime(true);
            try {
                $receipt = match (trim($driver)) {
                    'verifyet' => $this->verifyEt($payment),
                    'cheki'    => $this->cheki($payment),
                    default    => null,
                };
                $attempts[] = ['driver' => $driver, 'ok' => $receipt !== null, 'ms' => (int) ((microtime(true) - $started) * 1000)];
            } catch (\Throwable $e) {
                $attempts[] = ['driver' => $driver, 'ok' => false, 'error' => substr($e->getMessage(), 0, 200), 'ms' => (int) ((microtime(true) - $started) * 1000)];
                Log::warning("Payment verifier {$driver} failed: " . $e->getMessage());
                $receipt = null;
            }

            $this->recordHealth($driver, $attempts[array_key_last($attempts)]);

            if ($receipt === null) {
                continue;
            }

            [$outcome, $reason] = $this->judge($payment, $receipt);
            return ['outcome' => $outcome, 'reason' => $reason, 'source' => $driver, 'receipt' => $receipt, 'attempts' => $attempts];
        }

        return [
            'outcome'  => self::OUTCOME_UNDECIDED,
            'reason'   => 'Automatic check unavailable — a platform admin will confirm this payment.',
            'source'   => null,
            'receipt'  => null,
            'attempts' => $attempts,
        ];
    }

    /** @return array{0: string, 1: string} */
    private function judge(Payment $payment, array $r): array
    {
        if (!$r['verified']) {
            return [self::OUTCOME_REJECTED, 'The bank could not confirm this transaction reference.'];
        }
        if ($r['amount'] !== null && $r['amount'] + 0.009 < (float) $payment->amount) {
            return [self::OUTCOME_REJECTED, sprintf('Receipt amount %.2f ETB is less than the %.2f ETB due.', $r['amount'], $payment->amount)];
        }
        $toUs = $this->paidToUs($r);
        if ($toUs === false) {
            return [self::OUTCOME_REJECTED, 'This receipt was paid to a different account.'];
        }
        if ($toUs === null) {
            return [self::OUTCOME_UNDECIDED, 'The bank confirmed the transfer but not the receiving account — a platform admin will confirm it.'];
        }
        if ($r['date'] && strtotime($r['date']) < now()->subDays(config('plans.verifier.max_age_days', 30))->getTimestamp()) {
            return [self::OUTCOME_REJECTED, 'This receipt is older than ' . config('plans.verifier.max_age_days', 30) . ' days.'];
        }
        return [self::OUTCOME_VERIFIED, 'Confirmed with the bank.'];
    }

    /** true = our account, false = someone else's, null = cannot tell. */
    private function paidToUs(array $r): ?bool
    {
        $suffix = config('plans.verifier.receiver_account_suffix');
        $name   = config('plans.verifier.receiver_name');

        if ($suffix && !empty($r['receiver_account'])) {
            $digits = preg_replace('/\D/', '', $r['receiver_account']);
            return str_ends_with($digits, substr(preg_replace('/\D/', '', $suffix), -4));
        }
        if ($name && !empty($r['receiver_name'])) {
            $norm = fn ($s) => preg_replace('/[^a-z0-9]/', '', strtolower($s));
            return str_contains($norm($r['receiver_name']), $norm($name)) || str_contains($norm($name), $norm($r['receiver_name']));
        }
        // Issuer did not return a receiver: cannot prove it, leave the decision to a human.
        return null;
    }

    private function verifyEt(Payment $payment): ?array
    {
        $key = config('plans.verifier.verifyet.api_key');
        if (!$key) {
            return null;
        }

        $body = ['bank' => $payment->method, 'reference' => $payment->transaction_ref];
        if ($payment->payer_account_suffix) {
            $body[$payment->method === 'boa' ? 'accountSuffix' : 'suffix'] = $payment->payer_account_suffix;
        }
        if (in_array($payment->method, ['telebirr', 'mpesa'], true)) {
            $body['transactionNumber'] = $payment->transaction_ref;
        }

        $res = Http::timeout(config('plans.verifier.timeout', 20))
            ->withHeaders(['x-api-key' => $key, 'Idempotency-Key' => 'vt-payment-' . $payment->id])
            ->acceptJson()
            ->post(config('plans.verifier.verifyet.url') . '?waitMs=15000', $body);

        if (in_array($res->status(), [202, 402, 429, 503], true) || $res->serverError()) {
            return null; // queued, out of credits, throttled or down → undecided
        }
        if ($res->status() === 422 || $res->status() === 404) {
            return $this->normalize(false, null, null, null, null, $res->json());
        }

        $row = $res->json('data.0') ?? [];
        return $this->normalize(
            (bool) ($res->json('verification.verified') ?? $row['verified'] ?? false),
            isset($row['amount']) ? (float) $row['amount'] : null,
            $row['receiverName'] ?? null,
            $row['receiverAccount'] ?? null,
            $row['timestamp'] ?? null,
            $res->json(),
        );
    }

    private function cheki(Payment $payment): ?array
    {
        $body = ['bank' => $payment->method, 'reference' => $payment->transaction_ref];
        if ($payment->payer_account_suffix) {
            $body['accountNumber'] = $payment->payer_account_suffix;
        }

        $res = Http::timeout(config('plans.verifier.timeout', 20))->acceptJson()->post(config('plans.verifier.cheki.url'), $body);

        if ($res->status() === 429 || $res->serverError() || $res->json('isRateLimited')) {
            return null;
        }
        if ($res->status() === 404 && !$res->json('success')) {
            return null; // bank not supported by this instance
        }

        return $this->normalize(
            (bool) $res->json('verified', false) && !$res->json('decodedOnly', false),
            $res->json('amount') !== null ? (float) $res->json('amount') : null,
            $res->json('receiverName'),
            $res->json('receiverAccount'),
            $res->json('date'),
            $res->json(),
        );
    }

    private function normalize(bool $verified, ?float $amount, ?string $receiverName, ?string $receiverAccount, ?string $date, ?array $raw): array
    {
        return [
            'verified'         => $verified,
            'amount'           => $amount,
            'receiver_name'    => $receiverName,
            'receiver_account' => $receiverAccount,
            'date'             => $date,
            'raw'              => $raw,
        ];
    }

    /** Last outcome per driver, read by the platform health page. */
    private function recordHealth(string $driver, array $attempt): void
    {
        try {
            DB::table('system_settings')->updateOrInsert(
                ['key' => "payment_verifier.$driver"],
                ['value' => json_encode($attempt + ['at' => now()->toIso8601String()]), 'updated_at' => now()]
            );
        } catch (\Throwable) {
            // health bookkeeping must never fail a payment
        }
    }
}
