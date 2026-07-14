import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '../../components/AppLayout';
import { GlassCard, EmptyState, StatusBadge, Button } from '../../components/ui';
import { CheckoutModal } from '../../components/CheckoutModal';
import { api } from '../../lib/api';
import { ShoppingBag } from 'lucide-react';

interface AdCard {
  campaign_id: string;
  product: string;
  brand: string;
  cashback_rate: number;
  estimated_cashback_rupees: number;
}

export function FeedPage() {
  const [checkoutAd, setCheckoutAd] = useState<AdCard | null>(null);

  const { data: ads = [], isLoading } = useQuery<AdCard[]>({
    queryKey: ['feed'],
    queryFn: async () => {
      const res = await api.get('/feed');
      return (res.data.data?.ads ?? []) as AdCard[];
    },
    staleTime: 60_000,
  });

  return (
    <AppLayout title="Your Feed" subtitle="Ads matched to your purchase intent">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <GlassCard key={i} className="h-40 animate-pulse">{null}</GlassCard>
          ))}
        </div>
      ) : ads.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-10 h-10" />}
          title="No matched ads yet"
          description="Complete your shopping profile to see personalised ads here."
          action={{ label: 'Update Profile', onClick: () => { window.location.href = '/onboarding'; } }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map(ad => (
            <GlassCard key={ad.campaign_id} hover className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-white/[0.08] flex items-center justify-center text-slate-300 font-bold text-sm">
                  {ad.brand.charAt(0)}
                </div>
                <StatusBadge status="active" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-500">
                  {ad.brand}
                </p>
                <p className="text-sm font-semibold text-slate-200 mt-0.5 leading-snug">
                  {ad.product}
                </p>
              </div>
              <div
                className="flex items-center justify-between mt-auto pt-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-300/10 border border-teal-300/20 text-teal-300 text-xs font-bold">
                  {(ad.cashback_rate * 100).toFixed(1)}% cashback
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCheckoutAd(ad)}
                >
                  Shop Now
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {checkoutAd && (
        <CheckoutModal ad={checkoutAd} onClose={() => setCheckoutAd(null)} />
      )}
    </AppLayout>
  );
}
