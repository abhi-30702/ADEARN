import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Star, CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { submitAdReview } from '../lib/api';
import type { AdReviewInput } from '../lib/api';
import { Button } from './ui/Button';

interface AdReviewModalProps {
  campaignId: string;
  transactionId: string;
  campaignName: string;
  onClose: () => void;
}

const CRITERIA = [
  { key: 'relevance_score', label: 'Relevance', hint: 'Did this ad match your interests?' },
  { key: 'honesty_score', label: 'Honesty', hint: 'Were the claims truthful?' },
  { key: 'value_score', label: 'Value', hint: 'Was the product worth it?' },
] as const;

const FLAGS: { value: NonNullable<AdReviewInput['flag_reason']>; label: string }[] = [
  { value: 'misleading_claim', label: 'Misleading claim' },
  { value: 'price_surge', label: 'Price surge' },
  { value: 'irrelevant', label: 'Irrelevant' },
  { value: 'spam', label: 'Spam' },
];

function StarRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <span className="text-[11px] text-slate-500">{hint}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= (hover || value);
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onChange(n)}
              className="transition-transform duration-100 hover:scale-110"
              aria-label={`${label} ${n} star`}
            >
              <Star
                className={filled ? 'w-7 h-7 text-teal-300' : 'w-7 h-7 text-slate-600'}
                fill={filled ? '#5eead4' : 'none'}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdReviewModal({
  campaignId,
  transactionId,
  campaignName,
  onClose,
}: AdReviewModalProps) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState({ relevance_score: 0, honesty_score: 0, value_score: 0 });
  const [flag, setFlag] = useState<AdReviewInput['flag_reason']>();
  const [error, setError] = useState('');

  const allRated = Object.values(scores).every((s) => s > 0);

  const mutation = useMutation({
    mutationFn: () =>
      submitAdReview({
        campaign_id: campaignId,
        transaction_id: transactionId,
        ...scores,
        flag_reason: flag,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? ((err.response?.data as { error?: { message?: string } })?.error?.message ??
            'Could not submit review.')
          : 'Could not submit review.';
      setError(msg);
    },
  });

  const composite =
    (scores.relevance_score + scores.honesty_score + scores.value_score) / 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-[440px] rounded-[14px] p-6 relative"
        style={{
          background: 'rgba(15,23,42,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {mutation.isSuccess ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-teal-300" />
            <p className="text-base font-semibold text-slate-100">Thanks for your review!</p>
            <p className="text-sm text-slate-400">
              You rated this ad{' '}
              <span className="text-teal-300 font-semibold">
                {mutation.data.composite_score.toFixed(1)}/5
              </span>
              . Your feedback shapes advertiser quality scores.
            </p>
            <Button onClick={onClose} className="w-full mt-2">
              Done
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-base font-semibold text-slate-100 mb-1">Rate this ad</h2>
            <p className="text-sm text-slate-400 mb-5 truncate">{campaignName}</p>

            <div className="flex flex-col gap-5 mb-5">
              {CRITERIA.map((c) => (
                <StarRow
                  key={c.key}
                  label={c.label}
                  hint={c.hint}
                  value={scores[c.key]}
                  onChange={(v) => setScores((s) => ({ ...s, [c.key]: v }))}
                />
              ))}
            </div>

            {/* Optional flag */}
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-500 mb-2">
                Report an issue (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {FLAGS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFlag((cur) => (cur === f.value ? undefined : f.value))}
                    className={
                      flag === f.value
                        ? 'px-3 py-1.5 rounded-lg border text-xs font-medium bg-red-400/[0.12] border-red-400/30 text-red-400'
                        : 'px-3 py-1.5 rounded-lg border text-xs font-medium bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200'
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {allRated && (
              <p className="text-xs text-slate-400 mb-3">
                Composite score:{' '}
                <span className="text-teal-300 font-semibold">{composite.toFixed(1)}/5</span>
              </p>
            )}
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

            <Button
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!allRated}
              className="w-full"
            >
              Submit Review
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
