import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'wallet_repository.dart';
import 'models/wallet.dart';

String _fmt(double v) =>
    '₹${NumberFormat('#,##,##0.00', 'en_IN').format(v)}';

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(walletProvider);
    final txAsync = ref.watch(transactionsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFFF0E8),
      appBar: AppBar(
        title: const Text('My Wallet'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1F2937),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF789A99)),
            onPressed: () {
              ref.refresh(walletProvider);
              ref.refresh(transactionsProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFF789A99),
        onRefresh: () async {
          ref.refresh(walletProvider);
          ref.refresh(transactionsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Pool balance cards
            walletAsync.when(
              loading: () => const SizedBox(
                height: 160,
                child: Center(child: CircularProgressIndicator(color: Color(0xFF789A99))),
              ),
              error: (e, _) => _ErrorCard(message: e.toString()),
              data: (balances) => _BalanceGrid(balances: balances),
            ),
            const SizedBox(height: 24),
            const Text(
              'Recent Cashback',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            // Transaction list
            txAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF789A99))),
              error: (e, _) => _ErrorCard(message: e.toString()),
              data: (txs) => txs.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(
                        child: Text(
                          'No transactions yet.\nComplete a purchase to earn cashback.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xFF6B7280)),
                        ),
                      ),
                    )
                  : Column(
                      children: txs.map((tx) => _TxTile(tx: tx)).toList(),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BalanceGrid extends StatelessWidget {
  final PoolBalances balances;
  const _BalanceGrid({required this.balances});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Total earned hero card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF789A99),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Total Earned',
                  style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 4),
              Text(_fmt(balances.totalEarned),
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold)),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _PoolCard('Liquid', balances.liquidBalance, const Color(0xFF10B981))),
            const SizedBox(width: 10),
            Expanded(child: _PoolCard('Savings', balances.savingsBalance, const Color(0xFF3B82F6))),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(child: _PoolCard('Parent Fund', balances.parentBalance, const Color(0xFF8B5CF6))),
            const SizedBox(width: 10),
            Expanded(child: _PoolCard('Charity', balances.charityBalance, const Color(0xFFF97316))),
          ],
        ),
      ],
    );
  }
}

class _PoolCard extends StatelessWidget {
  final String label;
  final double amount;
  final Color color;
  const _PoolCard(this.label, this.amount, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(_fmt(amount),
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _TxTile extends StatelessWidget {
  final CashbackTx tx;
  const _TxTile({required this.tx});

  @override
  Widget build(BuildContext context) {
    final date = DateTime.tryParse(tx.createdAt);
    final formatted = date != null
        ? DateFormat('dd MMM yyyy').format(date)
        : tx.createdAt;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tx.brandName,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14)),
                Text(tx.campaignName,
                    style: const TextStyle(
                        color: Color(0xFF6B7280), fontSize: 12)),
                Text(formatted,
                    style: const TextStyle(
                        color: Color(0xFF9CA3AF), fontSize: 11)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '+${_fmt(tx.cashbackAmount)}',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Color(0xFF10B981)),
              ),
              const SizedBox(height: 2),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: tx.status == 'completed'
                      ? const Color(0xFFD1FAE5)
                      : const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  tx.status.replaceAll('_', ' '),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: tx.status == 'completed'
                        ? const Color(0xFF059669)
                        : const Color(0xFFD97706),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String message;
  const _ErrorCard({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEE2E2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(message, style: const TextStyle(color: Color(0xFFDC2626))),
    );
  }
}
