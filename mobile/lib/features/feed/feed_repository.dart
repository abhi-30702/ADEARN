import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import 'models/campaign.dart';

class FeedRepository {
  final Dio _dio;
  const FeedRepository(this._dio);

  Future<List<Campaign>> getFeed() async {
    try {
      final res = await _dio.get('/feed');
      final list = res.data['data'] as List<dynamic>;
      return list.map((e) => Campaign.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw parseApiError(e);
    }
  }

  Future<void> markViewed(String campaignId) async {
    try {
      await _dio.post('/feed/$campaignId/view');
    } on DioException catch (e) {
      throw parseApiError(e);
    }
  }
}

final feedRepositoryProvider = Provider<FeedRepository>((ref) {
  return FeedRepository(ref.watch(dioProvider));
});

final feedProvider = FutureProvider<List<Campaign>>((ref) {
  return ref.watch(feedRepositoryProvider).getFeed();
});
