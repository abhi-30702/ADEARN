import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { LoginPage } from './pages/consumer/LoginPage';
import { OnboardingPage } from './pages/consumer/OnboardingPage';
import { FeedPage } from './pages/consumer/FeedPage';
import { WalletPage } from './pages/consumer/WalletPage';
import { AdvertiserDashboardPage } from './pages/advertiser/AdvertiserDashboardPage';
import { CampaignCreatePage } from './pages/advertiser/CampaignCreatePage';
import { CampaignStatsPage } from './pages/advertiser/CampaignStatsPage';
import { AnalyticsDashboardPage } from './pages/advertiser/AnalyticsDashboardPage';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: OnboardingPage,
});

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feed',
  component: FeedPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    const token = localStorage.getItem('access_token');
    return token ? <FeedPage /> : <LoginPage />;
  },
});

const walletRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wallet',
  component: WalletPage,
});

const advertiserRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/advertiser',
  component: AdvertiserDashboardPage,
});

const campaignCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/advertiser/campaigns/new',
  component: CampaignCreatePage,
});

const campaignStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/advertiser/campaigns/$campaignId/stats',
  component: CampaignStatsPage,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/advertiser/analytics',
  component: AnalyticsDashboardPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute, loginRoute, onboardingRoute, feedRoute, walletRoute,
  advertiserRoute, campaignCreateRoute, campaignStatsRoute, analyticsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
