import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { LoginPage } from './pages/consumer/LoginPage';
import { OnboardingPage } from './pages/consumer/OnboardingPage';
import { FeedPage } from './pages/consumer/FeedPage';
import { AdvertiserDashboardPage } from './pages/advertiser/AdvertiserDashboardPage';
import { CampaignCreatePage } from './pages/advertiser/CampaignCreatePage';

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

const routeTree = rootRoute.addChildren([
  indexRoute, loginRoute, onboardingRoute, feedRoute,
  advertiserRoute, campaignCreateRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
