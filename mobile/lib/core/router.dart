import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/onboarding/login_screen.dart';
import '../features/onboarding/otp_screen.dart';
import '../features/profile/profile_setup_screen.dart';
import '../features/profile/pool_config_screen.dart';
import '../features/feed/feed_screen.dart';
import '../features/wallet/wallet_screen.dart';
import '../features/profile/profile_screen.dart';
import 'auth_repository.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authRepo = ref.watch(authRepositoryProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) async {
      final loggedIn = await authRepo.isLoggedIn();
      final onAuthPath = state.matchedLocation == '/login' ||
          state.matchedLocation == '/otp';
      if (!loggedIn && !onAuthPath) return '/login';
      if (loggedIn && onAuthPath) return '/feed';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (ctx, _) => const LoginScreen()),
      GoRoute(
        path: '/otp',
        builder: (ctx, state) {
          final mobile = state.extra as String;
          return OTPScreen(mobile: mobile);
        },
      ),
      GoRoute(path: '/profile/setup', builder: (ctx, _) => const ProfileSetupScreen()),
      GoRoute(path: '/profile/pool', builder: (ctx, _) => const PoolConfigScreen()),
      GoRoute(path: '/feed', builder: (ctx, _) => const FeedScreen()),
      GoRoute(path: '/wallet', builder: (ctx, _) => const WalletScreen()),
      GoRoute(path: '/profile', builder: (ctx, _) => const ProfileScreen()),
    ],
  );
});
