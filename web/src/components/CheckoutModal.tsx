import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, CheckCircle2, ShoppingBag } from 'lucide-react';
import { api } from '../lib/api';
import { stripePromise } from '../lib/stripe';
import { Button, Input } from './ui/index';

interface CheckoutAd {
  campaign_id: string;
  product: string;
  brand: string;
  cashback_rate: number;
  estimated_cashback_rupees: number;
}

interface CheckoutModalProps {
  ad: CheckoutAd;
  onClose: () => void;
}

type Step = 'amount' | 'card' | 'processing' | 'success' | 'error';

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { error?: { message?: string } } } }).response;
    if (response?.data?.error?.message) return response.data.error.message;
  }
  return 'Something went wrong. Please try again.';
}

const cardElementOptions = {
  style: {
    base: {
      color: '#e2e8f0',
      fontSize: '14px',
      '::placeholder': { color: '#64748b' },
    },
    invalid: { color: '#f87171' },
  },
};

function PaymentForm({
  clientSecret,
  amount,
  onPaid,
  onError,
}: {
  clientSecret: string;
  amount: string;
  onPaid: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });
    setSubmitting(false);

    if (error) {
      onError(error.message ?? 'Payment failed. Please try another card.');
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onPaid();
    } else {
      onError('Payment did not complete. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-400">
        Amount: <span className="text-slate-200 font-semibold">₹{amount}</span>
      </p>
      <div className="rounded-lg bg-white/[0.06] border border-white/[0.10] px-3 py-3">
        <CardElement options={cardElementOptions} />
      </div>
      <p className="text-[11px] text-slate-500">
        Test mode — use card 4242 4242 4242 4242, any future expiry, any CVC.
      </p>
      <Button onClick={() => void handlePay()} loading={submitting} disabled={!stripe} className="w-full">
        Pay ₹{amount}
      </Button>
    </div>
  );
}

export function CheckoutModal({ ad, onClose }: CheckoutModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState(
    String(Math.round(ad.estimated_cashback_rupees / ad.cashback_rate)),
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [cashbackAmount, setCashbackAmount] = useState<number | null>(null);

  const handleContinue = async () => {
    const purchaseAmount = Number(amount);
    if (!purchaseAmount || purchaseAmount <= 0) {
      setError('Enter a valid purchase amount.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await api.post(`/feed/${ad.campaign_id}/view`);
      const startRes = await api.post('/attribution/start', {
        campaign_id: ad.campaign_id,
        purchase_amount: purchaseAmount,
      });
      const startedSessionId = startRes.data.data.session_id as string;

      const payRes = await api.post(`/attribution/${startedSessionId}/pay`);
      const secret = payRes.data.data.client_secret as string;

      setSessionId(startedSessionId);
      setClientSecret(secret);
      setStep('card');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const pollForConversion = async (id: string) => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      try {
        const res = await api.get(`/attribution/${id}`);
        const session = res.data.data as { status: string; cashback_amount: number | null };

        if (session.status === 'converted') {
          setCashbackAmount(session.cashback_amount);
          setStep('success');
          void queryClient.invalidateQueries({ queryKey: ['wallet'] });
          void queryClient.invalidateQueries({ queryKey: ['transactions'] });
          void queryClient.invalidateQueries({ queryKey: ['feed'] });
          return;
        }

        if (session.status === 'expired') {
          setError('Attribution session expired before cashback could be processed.');
          setStep('error');
          return;
        }
      } catch {
        // transient poll failure — keep retrying until POLL_MAX_ATTEMPTS
      }
      await sleep(POLL_INTERVAL_MS);
    }

    setError('Payment succeeded, but cashback is still processing. Check your wallet shortly.');
    setStep('error');
  };

  const handlePaid = () => {
    setStep('processing');
    if (sessionId) void pollForConversion(sessionId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-[420px] rounded-[14px] p-6 relative"
        style={{
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-teal-300/10 border border-teal-300/20 flex items-center justify-center text-teal-300 font-bold text-sm">
            {ad.brand.charAt(0)}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-500">
              {ad.brand}
            </p>
            <p className="text-sm font-semibold text-slate-200">{ad.product}</p>
          </div>
        </div>

        {step === 'amount' && (
          <div className="flex flex-col gap-4">
            <Input
              label="Purchase Amount (₹)"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-teal-300">
              You'll earn ~{(ad.cashback_rate * 100).toFixed(1)}% cashback (₹
              {((Number(amount) || 0) * ad.cashback_rate).toFixed(2)})
            </p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button onClick={() => void handleContinue()} loading={submitting} className="w-full">
              Continue to Payment
            </Button>
          </div>
        )}

        {step === 'card' && clientSecret && (
          <Elements stripe={stripePromise}>
            <PaymentForm
              clientSecret={clientSecret}
              amount={amount}
              onPaid={handlePaid}
              onError={(message) => {
                setError(message);
              }}
            />
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </Elements>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-teal-300/30 border-t-teal-300 animate-spin" />
            <p className="text-sm text-slate-300">Payment received — processing your cashback…</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-teal-300" />
            <p className="text-base font-semibold text-slate-100">Purchase complete!</p>
            {cashbackAmount !== null && (
              <p className="text-sm text-slate-400">
                ₹{Number(cashbackAmount).toFixed(2)} cashback added to your wallet.
              </p>
            )}
            <Button onClick={onClose} className="w-full mt-2">
              Done
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <ShoppingBag className="w-10 h-10 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <Button variant="ghost" onClick={onClose} className="w-full mt-2">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
