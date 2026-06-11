import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const mobileSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
});

type MobileInput = z.infer<typeof mobileSchema>;
type OtpInput = z.infer<typeof otpSchema>;

export function LoginPage() {
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  const mobileForm = useForm<MobileInput>({ resolver: zodResolver(mobileSchema) });
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) });

  async function onSubmitMobile(data: MobileInput) {
    setError('');
    try {
      await api.post('/auth/request-otp', { mobile: data.mobile });
      setMobile(data.mobile);
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Please try again.');
    }
  }

  async function onSubmitOtp(data: OtpInput) {
    setError('');
    try {
      const res = await api.post('/auth/verify-otp', { mobile, otp: data.otp });
      const { access_token, refresh_token, user } = res.data.data as {
        access_token: string;
        refresh_token: string;
        user: { id: string; name: string; role: 'consumer' | 'advertiser' | 'admin'; kyc_status: string };
      };
      setAuth(user, access_token, refresh_token);
      window.location.href = '/onboarding';
    } catch {
      setError('Invalid OTP. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AdEarn</h1>
        <p className="text-gray-500 text-sm mb-6">Get paid to watch ads &amp; buy products</p>

        {step === 'mobile' ? (
          <form onSubmit={mobileForm.handleSubmit(onSubmitMobile)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Mobile Number</label>
              <input
                {...mobileForm.register('mobile')}
                placeholder="9876543210"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {mobileForm.formState.errors.mobile && (
                <p className="text-red-500 text-xs mt-1">{mobileForm.formState.errors.mobile.message}</p>
              )}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={mobileForm.formState.isSubmitting}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {mobileForm.formState.isSubmitting ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(onSubmitOtp)} className="space-y-4">
            <p className="text-sm text-gray-600">OTP sent to <strong>{mobile}</strong></p>
            <div>
              <label className="text-sm font-medium text-gray-700">Enter OTP</label>
              <input
                {...otpForm.register('otp')}
                placeholder="123456"
                maxLength={6}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {otpForm.formState.errors.otp && (
                <p className="text-red-500 text-xs mt-1">{otpForm.formState.errors.otp.message}</p>
              )}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={otpForm.formState.isSubmitting}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {otpForm.formState.isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button type="button" onClick={() => setStep('mobile')} className="w-full text-sm text-indigo-600 hover:underline">
              Change mobile number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
