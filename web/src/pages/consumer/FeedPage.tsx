import { useAuthStore } from '../../store/authStore';

export function FeedPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-indigo-600">AdEarn</span>
        <span className="text-sm text-gray-600">Hi, {user?.name ?? 'User'}</span>
      </nav>
      <div className="max-w-xl mx-auto p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Your Matched Ads</h2>
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="text-gray-500 text-sm">Your personalised ad feed will appear here.</p>
          <p className="text-gray-400 text-xs mt-2">Ads matched to your purchase profile</p>
        </div>
      </div>
    </div>
  );
}
