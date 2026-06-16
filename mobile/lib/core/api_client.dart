import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000/api/v1',
);

final _storage = const FlutterSecureStorage();

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await _storage.read(key: 'access_token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      return handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        await _storage.delete(key: 'access_token');
        await _storage.delete(key: 'refresh_token');
        // Router will detect missing token and redirect to login
      }
      return handler.next(error);
    },
  ));

  return dio;
});

class ApiException implements Exception {
  final String code;
  final String message;
  const ApiException(this.code, this.message);

  @override
  String toString() => 'ApiException($code): $message';
}

ApiException parseApiError(DioException e) {
  final data = e.response?.data;
  if (data is Map<String, dynamic>) {
    final err = data['error'] as Map<String, dynamic>?;
    return ApiException(
      err?['code']?.toString() ?? 'UNKNOWN',
      err?['message']?.toString() ?? 'An error occurred',
    );
  }
  return const ApiException('NETWORK_ERROR', 'Network error. Please try again.');
}
