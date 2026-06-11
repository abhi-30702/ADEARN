import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

interface Campaign {
  id: string;
  name: string;
  status: string;
  cashback_rate: string;
  spent_to_date: string;
  total_budget: string;
  created_at: string;
}

async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await api.get('/advertiser/campaigns');
  return res.data.data;
}

export function AdvertiserDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['advertiser-campaigns'],
    queryFn: fetchCampaigns,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-indigo-600">AdEarn for Business</span>
        <span className="text-sm text-gray-600">{user?.name}</span>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <a
            href="/advertiser/campaigns/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            New Campaign
          </a>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <p className="text-gray-500">No campaigns yet. Create your first campaign to start reaching customers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-500">
                    {Number(c.cashback_rate) * 100}% cashback · ₹{Number(c.spent_to_date).toFixed(2)} spent
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    c.status === 'active' ? 'bg-green-100 text-green-700' :
                    c.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {c.status.replace('_', ' ')}
                  </span>
                  <a href={`/advertiser/campaigns/${c.id}/stats`} className="text-indigo-600 text-sm hover:underline">
                    Stats
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
