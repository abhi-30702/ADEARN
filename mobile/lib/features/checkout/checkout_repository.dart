import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';

class AttributionSession {
  final String sessionId;
  final String expiresAt;
  final double cashbackRate;
  final double estimatedCashback;

  const AttributionSession({
    required this.sessionId,
    required this.expiresAt,
    required this.cashbackRate,
    required this.estimatedCashback,
  });

  factory AttributionSession.fromJson(Map<String, dynamic> json) =>
      AttributionSession(
        sessionId: json['session_id'] as String,
        expiresAt: json['expires_at'] as String,
        cashbackRate: double.parse(json['cashback_rate'].toString()),
        estimatedCashback:
            double.parse(json['estimated_cashback'].toString()),
      );
}

class PaymentIntentData {
  final String clientSecret;
  final String paymentIntentId;
  final String publishableKey;

  const PaymentIntentData({
    required this.clientSecret,
    required this.paymentIntentId,
    required this.publishableKey,
  });

  factory PaymentIntentData.fromJson(Map<String, dynamic> json) =>
      PaymentIntentData(
        clientSecret: json['client_secret'] as String,
        paymentIntentId: json['payment_intent_id'] as String,
        publishableKey: json['publishable_key'] as String,
      );
}

class CheckoutRepository {
  final Dio _dio;
  const CheckoutRepository(this._dio);

  Future<AttributionSession> startSession(
      String campaignId, double purchaseAmount) async {
    try {
      final res = await _dio.post('/attribution/start', data: {
        'campaign_id': campaignId,
        'purchase_amount': purchaseAmount,
      });
      return AttributionSession.fromJson(
          res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseApiError(e);
    }
  }

  Future<PaymentIntentData> createPaymentIntent(String sessionId) async {
    try {
      final res = await _dio.post('/attribution/$sessionId/pay');
      return PaymentIntentData.fromJson(
          res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw parseApiError(e);
    }
  }
}

final checkoutRepositoryProvider = Provider<CheckoutRepository>((ref) {
  return CheckoutRepository(ref.watch(dioProvider));
});
