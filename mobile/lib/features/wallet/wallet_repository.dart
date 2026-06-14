import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import 'models/wallet.dart';

class WalletRepository {
  final Dio _dio;
  const WalletRepository(this._dio);

  Future<PoolBalances> getWallet() async {
    try {
      final res = await _dio.get('/wallet');
      final data = res.data['data'] as Map<String, dynamic>;
      return PoolBalances.fromJson(data['pool_balances'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseApiError(e);
    }
  }

  Future<List<CashbackTx>> getTransactions() async {
    try {
      final res = await _dio.get('/transactions');
      final list = res.data['data'] as List<dynamic>;
      return list.map((e) => CashbackTx.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw parseApiError(e);
    }
  }
}

final walletRepositoryProvider = Provider<WalletRepository>((ref) {
  return WalletRepository(ref.watch(dioProvider));
});

final walletProvider = FutureProvider<PoolBalances>((ref) {
  return ref.watch(walletRepositoryProvider).getWallet();
});

final transactionsProvider = FutureProvider<List<CashbackTx>>((ref) {
  return ref.watch(walletRepositoryProvider).getTransactions();
});
