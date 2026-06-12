import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';

const profileSchema = z.object({
  categories: z.array(z.object({
    category: z.string().min(1),
    brands: z.string().min(1),
    spend_range: z.string().min(1),
    frequency: z.enum(['Daily', 'Weekly', 'Monthly', 'Occasionally']),
  })).min(1),
});

const poolSchema = z.object({
  liquid_pct: z.coerce.number().int().min(0).max(100),
  savings_pct: z.coerce.number().int().min(0).max(100),
  parent_pct: z.coerce.number().int().min(0).max(100),
  charity_pct: z.coerce.number().int().min(0).max(100),
  savings_goal: z.string().optional(),
}).refine(
  (d) => d.liquid_pct + d.savings_pct + d.parent_pct + d.charity_pct === 100,
  { message: 'Percentages must sum to 100' }
);

type ProfileInput = z.infer<typeof profileSchema>;
type PoolInput = z.infer<typeof poolSchema>;

export function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState('');

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      categories: [{ category: 'Health & Beauty', brands: 'Mamaearth', spend_range: '₹1K–5K', frequency: 'Monthly' }],
    },
  });

  const poolForm = useForm<PoolInput>({
    resolver: zodResolver(poolSchema),
    defaultValues: { liquid_pct: 40, savings_pct: 30, parent_pct: 20, charity_pct: 10, savings_goal: 'Emergency Fund' },
  });

  const { fields, append, remove } = useFieldArray({ control: profileForm.control, name: 'categories' });

  async function onSubmitProfile(data: ProfileInput) {
    setError('');
    try {
      const categories = data.categories.map((c) => ({
        ...c,
        brands: c.brands.split(',').map((b) => b.trim()).filter(Boolean),
      }));
      await api.put('/profile', { categories });
      setStep(2);
    } catch {
      setError('Failed to save profile. Please try again.');
    }
  }

  async function onSubmitPool(data: PoolInput) {
    setError('');
    try {
      await api.put('/pool-config', data);
      setStep(3);
    } catch {
      setError('Failed to save pool config. Please try again.');
    }
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-peach-light">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re all set!</h2>
          <p className="text-gray-500 text-sm mb-6">Start watching matched ads and earning cashback.</p>
          <a href="/feed" className="inline-block w-full bg-aqua text-white py-2 rounded-lg text-sm font-medium hover:bg-aqua-dark text-center">
            Go to Feed
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-peach-light">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="flex gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? 'bg-aqua' : 'bg-gray-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Your Shopping Profile</h2>
            <p className="text-gray-500 text-sm mb-4">Tell us what you buy so we match the right ads.</p>
            <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
              {fields.map((field, i) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <input
                    {...profileForm.register(`categories.${i}.category`)}
                    placeholder="Category (e.g. Health & Beauty)"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                  />
                  <input
                    {...profileForm.register(`categories.${i}.brands`)}
                    placeholder="Brands (comma separated)"
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      {...profileForm.register(`categories.${i}.spend_range`)}
                      placeholder="Spend range"
                      className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm"
                    />
                    <select
                      {...profileForm.register(`categories.${i}.frequency`)}
                      className="border border-gray-200 rounded px-2 py-1 text-sm"
                    >
                      <option>Monthly</option>
                      <option>Weekly</option>
                      <option>Daily</option>
                      <option>Occasionally</option>
                    </select>
                  </div>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="text-red-500 text-xs">Remove</button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => append({ category: '', brands: '', spend_range: '', frequency: 'Monthly' })}
                className="text-aqua text-sm"
              >
                + Add category
              </button>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={profileForm.formState.isSubmitting}
                className="w-full bg-aqua text-white py-2 rounded-lg text-sm font-medium hover:bg-aqua-dark disabled:opacity-50">
                Continue
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Cashback Distribution</h2>
            <p className="text-gray-500 text-sm mb-4">How should we split your cashback? Must total 100%.</p>
            <form onSubmit={poolForm.handleSubmit(onSubmitPool)} className="space-y-3">
              {(['liquid_pct', 'savings_pct', 'parent_pct', 'charity_pct'] as const).map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 w-36">
                    {field === 'liquid_pct' ? 'Instant Cash' :
                     field === 'savings_pct' ? 'Savings' :
                     field === 'parent_pct' ? 'Parent Fund' : 'Charity'}
                  </label>
                  <input
                    {...poolForm.register(field)}
                    type="number"
                    min={0}
                    max={100}
                    className="border border-gray-200 rounded px-2 py-1 text-sm w-16 text-center"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              ))}
              <input
                {...poolForm.register('savings_goal')}
                placeholder="Savings goal (e.g. Emergency Fund)"
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm mt-2"
              />
              {poolForm.formState.errors.root?.message && (
                <p className="text-red-500 text-sm">{poolForm.formState.errors.root.message}</p>
              )}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={poolForm.formState.isSubmitting}
                className="w-full bg-aqua text-white py-2 rounded-lg text-sm font-medium hover:bg-aqua-dark disabled:opacity-50 mt-2">
                Save &amp; Continue
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
