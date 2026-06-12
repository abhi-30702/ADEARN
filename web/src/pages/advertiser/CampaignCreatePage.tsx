import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';

const createCampaignSchema = z.object({
  name: z.string().min(3).max(255),
  creative_url: z.string().url('Must be a valid URL'),
  creative_type: z.enum(['video', 'banner', 'audio']),
  target_categories: z.string().min(1),
  target_brands: z.string().min(1),
  cashback_rate: z.coerce.number().min(0.01).max(0.05),
  daily_cap: z.coerce.number().min(500),
  total_budget: z.coerce.number().positive(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
});

type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export function CampaignCreatePage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const form = useForm<CreateCampaignInput>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      creative_type: 'video',
      cashback_rate: 0.03,
      daily_cap: 10000,
      total_budget: 200000,
    },
  });

  async function onSubmit(data: CreateCampaignInput) {
    setError('');
    try {
      await api.post('/advertiser/campaigns', {
        name: data.name,
        creative_url: data.creative_url,
        creative_type: data.creative_type,
        target_profile: {
          categories: data.target_categories.split(',').map((s) => s.trim()).filter(Boolean),
          brands: data.target_brands.split(',').map((s) => s.trim()).filter(Boolean),
        },
        cashback_rate: data.cashback_rate,
        daily_cap: data.daily_cap,
        total_budget: data.total_budget,
        starts_at: data.starts_at || undefined,
        ends_at: data.ends_at || undefined,
      });
      setSuccess(true);
    } catch {
      setError('Failed to create campaign. Please check your details and try again.');
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-peach-light">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Campaign submitted!</h2>
          <p className="text-gray-500 text-sm mb-6">Your campaign is pending review. We&apos;ll approve it within 24 hours.</p>
          <a href="/advertiser" className="inline-block w-full bg-aqua text-white py-2 rounded-lg text-sm font-medium hover:bg-aqua-dark text-center">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-peach-light">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <a href="/advertiser" className="text-sm text-aqua hover:underline">← Back</a>
        <span className="font-medium text-gray-900">New Campaign</span>
      </nav>

      <div className="max-w-xl mx-auto p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Campaign Name</label>
            <input {...form.register('name')} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {form.formState.errors.name && <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Creative URL</label>
            <input {...form.register('creative_url')} placeholder="https://..." className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {form.formState.errors.creative_url && <p className="text-red-500 text-xs mt-1">{form.formState.errors.creative_url.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Creative Type</label>
            <select {...form.register('creative_type')} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="video">Video</option>
              <option value="banner">Banner</option>
              <option value="audio">Audio</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Target Categories (comma separated)</label>
            <input {...form.register('target_categories')} placeholder="Health & Beauty, Electronics" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Target Brands (comma separated)</label>
            <input {...form.register('target_brands')} placeholder="Mamaearth, Plum" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Cashback Rate</label>
              <div className="flex items-center gap-1 mt-1">
                <input {...form.register('cashback_rate')} type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm" />
                <span className="text-sm text-gray-500">×100%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">e.g. 0.03 = 3%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Daily Cap (₹)</label>
              <input {...form.register('daily_cap')} type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Total Budget (₹)</label>
              <input {...form.register('total_budget')} type="number" className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <input {...form.register('starts_at')} type="datetime-local" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <input {...form.register('ends_at')} type="datetime-local" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={form.formState.isSubmitting}
            className="w-full bg-aqua text-white py-2 rounded-lg text-sm font-medium hover:bg-aqua-dark disabled:opacity-50">
            {form.formState.isSubmitting ? 'Creating...' : 'Submit Campaign'}
          </button>
        </form>
      </div>
    </div>
  );
}
