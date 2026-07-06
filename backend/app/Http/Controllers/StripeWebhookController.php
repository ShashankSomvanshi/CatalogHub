<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\Checkout\Session;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;
use Symfony\Component\HttpFoundation\Response;
use UnexpectedValueException;

class StripeWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $secret = config('services.stripe.webhook_secret');

        if (! $secret) {
            return response()->json(['message' => 'Stripe webhook is not configured.'], 503);
        }

        try {
            $event = Webhook::constructEvent(
                $request->getContent(),
                (string) $request->header('Stripe-Signature'),
                $secret,
            );
        } catch (UnexpectedValueException|SignatureVerificationException) {
            return response()->json(['message' => 'Invalid Stripe webhook.'], Response::HTTP_BAD_REQUEST);
        }

        if (in_array($event->type, [
            'checkout.session.completed',
            'checkout.session.async_payment_succeeded',
            'checkout.session.async_payment_failed',
            'checkout.session.expired',
        ], true)) {
            $this->syncTransaction($event->data->object, $event->type);
        }

        return response()->json(['received' => true]);
    }

    public function status(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => ['required', 'string', 'starts_with:cs_'],
        ]);

        $transaction = Transaction::with('order')
            ->where('payment_gateway', 'stripe')
            ->where('gateway_order_id', $validated['session_id'])
            ->firstOrFail();

        try {
            $session = (new StripeClient(config('services.stripe.secret')))
                ->checkout->sessions->retrieve($validated['session_id']);
            $this->syncTransaction($session, 'checkout.session.status_checked');
            $transaction->refresh();
        } catch (\Throwable $exception) {
            report($exception);
        }

        return response()->json([
            'order_number' => $transaction->order->order_number,
            'transaction_number' => $transaction->transaction_number,
            'status' => $transaction->status,
            'amount' => $transaction->amount,
            'currency' => $transaction->currency,
        ]);
    }

    private function syncTransaction(Session $session, string $eventType): void
    {
        $transaction = Transaction::with('order.user.cart')
            ->where('payment_gateway', 'stripe')
            ->where(function ($query) use ($session): void {
                $query->where('gateway_order_id', $session->id);

                if (! empty($session->metadata?->transaction_id)) {
                    $query->orWhere('id', $session->metadata->transaction_id);
                }
            })
            ->first();

        if (! $transaction) {
            return;
        }

        $completed = $session->payment_status === 'paid'
            || $eventType === 'checkout.session.async_payment_succeeded';
        $failed = in_array($eventType, [
            'checkout.session.async_payment_failed',
            'checkout.session.expired',
        ], true);

        $transaction->update([
            'gateway_transaction_id' => $session->payment_intent ?: $transaction->gateway_transaction_id,
            'status' => $completed ? 'completed' : ($failed ? 'failed' : 'pending'),
            'failure_reason' => $failed ? 'Stripe Checkout was unsuccessful or expired.' : null,
            'gateway_response' => [
                'checkout_session_id' => $session->id,
                'payment_intent_id' => $session->payment_intent,
                'payment_status' => $session->payment_status,
                'event_type' => $eventType,
            ],
            'paid_at' => $completed ? ($transaction->paid_at ?? now()) : null,
        ]);

        $transaction->order->update([
            'payment_status' => $completed ? 'completed' : ($failed ? 'failed' : 'pending'),
        ]);

        if ($completed) {
            $transaction->order->user?->cart?->items()->delete();
        }
    }
}
