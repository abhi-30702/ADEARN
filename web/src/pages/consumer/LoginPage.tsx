import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Zap } from 'lucide-react';

const ROLE_HOME: Record<string, string> = {
  consumer: '/feed',
  advertiser: '/advertiser',
  admin: '/admin',
};

const DEMO_ACCOUNTS = [
  { label: 'Consumer',   phone: '9876543210', color: 'bg-teal-300/10 text-teal-300 border-teal-300/25 hover:bg-teal-300/20' },
  { label: 'Advertiser', phone: '9123456789', color: 'bg-[#FFD2C2]/10 text-[#FFD2C2] border-[#FFD2C2]/25 hover:bg-[#FFD2C2]/20' },
  { label: 'Admin',      phone: '9000000000', color: 'bg-blue-400/10 text-blue-400 border-blue-400/25 hover:bg-blue-400/20' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestOtp = async (phoneNum = phone) => {
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/request-otp', {
        mobile: phoneNum,
      });

      setPhone(phoneNum);
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (mobile?: string, otpValue?: string) => {
    setLoading(true);
    setError('');

    const actualPhone = mobile ?? phone;
    const actualOtp = otpValue ?? otp;

    try {
      const res = await api.post('/auth/verify-otp', {
        mobile: actualPhone,
        otp: actualOtp,
      });

      const {
        user,
        access_token,
        refresh_token,
      } = res.data.data as {
        user: {
          id: string;
          name: string;
          role: 'consumer' | 'advertiser' | 'admin';
          kyc_status: string;
        };
        access_token: string;
        refresh_token: string;
      };

      setAuth(user, access_token, refresh_token);

      navigate({
        to: ROLE_HOME[user.role] ?? '/feed',
      });
    } catch {
      setError('Invalid OTP. Try 123456 for demo accounts.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpHandler = async () => {
    await verifyOtp();
  };

  const quickLogin = async (demoPhone: string) => {
    await requestOtp(demoPhone);
    setOtp('123456');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundColor: '#060b14',
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 80% 10%, rgba(94,234,212,0.08) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 20% 90%, rgba(255,210,194,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-300 to-teal-600 flex items-center justify-center mb-3 shadow-lg shadow-teal-300/20">
            <Zap
              className="w-6 h-6 text-slate-900"
              strokeWidth={2.5}
            />
          </div>

          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            AdEarn
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            Get paid for every purchase
          </p>
        </div>

        {/* Login Card */}
        <div
          className="p-6 rounded-[14px]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {step === 'phone' ? (
            <>
              <h2 className="text-base font-semibold text-slate-100 mb-4">
                Sign in
              </h2>

              <div className="flex flex-col gap-4">
                <Input
                  label="Mobile Number"
                  type="tel"
                  placeholder="Enter 10-digit mobile"
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value.replace(/\D/g, '').slice(0, 10)
                    )
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    phone.length === 10 &&
                    requestOtp()
                  }
                />

                {error && (
                  <p className="text-xs text-red-400">
                    {error}
                  </p>
                )}

                <Button
                  onClick={() => requestOtp()}
                  loading={loading}
                  disabled={phone.length !== 10}
                  className="w-full"
                >
                  Send OTP
                </Button>
              </div>

              {/* Demo accounts */}
              <div
                className="mt-6 pt-5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-500 mb-3">
                  Demo Accounts
                </p>
                <div className="flex gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.label}
                      onClick={() => quickLogin(acc.phone)}
                      disabled={loading}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 ${acc.color}`}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors mb-4 flex items-center gap-1"
              >
                ← Back
              </button>

              <h2 className="text-base font-semibold text-slate-100 mb-1">
                Enter OTP
              </h2>

              <p className="text-xs text-slate-400 mb-4">
                Sent to +91 {phone}
              </p>

              <div className="flex flex-col gap-4">
                <Input
                  label="OTP"
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value.replace(/\D/g, '').slice(0, 6)
                    )
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    otp.length === 6 &&
                    verifyOtpHandler()
                  }
                />

                {error && (
                  <p className="text-xs text-red-400">
                    {error}
                  </p>
                )}

                <Button
                  onClick={verifyOtpHandler}
                  loading={loading}
                  disabled={otp.length !== 6}
                  className="w-full"
                >
                  Verify & Sign in
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
