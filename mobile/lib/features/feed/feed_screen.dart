import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'feed_repository.dart';
import 'widgets/ad_card.dart';

class FeedScreen extends ConsumerWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feedAsync = ref.watch(feedProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFFF0E8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'AdEarn',
          style: TextStyle(
            color: Color(0xFF789A99),
            fontWeight: FontWeight.bold,
            fontSize: 22,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner,
                color: Color(0xFF789A99)),
            onPressed: () => context.push('/qr'),
          ),
          IconButton(
            icon: const Icon(Icons.account_balance_wallet_outlined,
                color: Color(0xFF789A99)),
            onPressed: () => context.push('/wallet'),
          ),
          IconButton(
            icon: const Icon(Icons.person_outline, color: Color(0xFF789A99)),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: feedAsync.when(
        loading: () => ListView.builder(
          itemCount: 3,
          itemBuilder: (_, __) => const _SkeletonCard(),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.wifi_off, size: 48, color: Color(0xFF9CA3AF)),
              const SizedBox(height: 12),
              Text(e.toString(), textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFF6B7280))),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(feedProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (campaigns) => campaigns.isEmpty
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.inbox_outlined, size: 56, color: Color(0xFF9CA3AF)),
                      SizedBox(height: 12),
                      Text(
                        'No matched ads right now.\nUpdate your purchase profile to see more.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Color(0xFF6B7280)),
                      ),
                    ],
                  ),
                ),
              )
            : RefreshIndicator(
                color: const Color(0xFF789A99),
                onRefresh: () => ref.refresh(feedProvider.future),
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  itemCount: campaigns.length,
                  itemBuilder: (_, i) => AdCard(
                    campaign: campaigns[i],
                    onTap: () {
                      // Mark viewed fire-and-forget, then navigate to checkout
                      ref.read(feedRepositoryProvider).markViewed(campaigns[i].id);
                      context.push('/checkout/${campaigns[i].id}');
                    },
                  ),
                ),
              ),
      ),
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      height: 260,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: const _PulsingBox(),
    );
  }
}

class _PulsingBox extends StatefulWidget {
  const _PulsingBox();

  @override
  State<_PulsingBox> createState() => _PulsingBoxState();
}

class _PulsingBoxState extends State<_PulsingBox>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.4, end: 0.8).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Container(
        decoration: BoxDecoration(
          color: const Color(0xFFE5E7EB).withOpacity(_anim.value),
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    );
  }
}
