import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_client.dart';

class AuthTokens {
  final String accessToken;
  final String refreshToken;
  const AuthTokens({required this.accessToken, required this.refreshToken});
}

class AuthRepository {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  const AuthRepository(this._dio, this._storage);

  Future<void> requestOtp(String mobile) async {
    try {
      await _dio.post('/auth/request-otp', data: {'mobile': mobile});
    } on DioException catch (e) {
      throw parseApiError(e);
    }
  }

  Future<AuthTokens> verifyOtp(String mobile, String otp) async {
    try {
      final res = await _dio.post('/auth/verify-otp', data: {
        'mobile': mobile,
        'otp': otp,
      });
      final data = res.data['data'] as Map<String, dynamic>;
      return AuthTokens(
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String,
      );
    } on DioException catch (e) {
      throw parseApiError(e);
    }
  }

  Future<void> saveTokens(AuthTokens tokens) async {
    await _storage.write(key: 'access_token', value: tokens.accessToken);
    await _storage.write(key: 'refresh_token', value: tokens.refreshToken);
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'access_token');
    return token != null;
  }

  Future<void> logout() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioProvider), const FlutterSecureStorage());
});
