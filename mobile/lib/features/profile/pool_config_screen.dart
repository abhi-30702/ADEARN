import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../core/api_client.dart';

class PoolConfigScreen extends ConsumerStatefulWidget {
  const PoolConfigScreen({super.key});

  @override
  ConsumerState<PoolConfigScreen> createState() => _PoolConfigScreenState();
}

class _PoolConfigScreenState extends ConsumerState<PoolConfigScreen> {
  double _liquid = 40;
  double _savings = 30;
  double _parent = 20;
  double _charity = 10;
  bool _saving = false;
  String? _error;

  int get _total => _liquid.round() + _savings.round() + _parent.round() + _charity.round();

  Future<void> _save() async {
    if (_total != 100) {
      setState(() => _error = 'Splits must total exactly 100%');
      return;
    }

    setState(() { _saving = true; _error = null; });

    try {
      final dio = ref.read(dioProvider);
      await dio.put('/pool-config', data: {
        'liquid_pct': _liquid.round(),
        'savings_pct': _savings.round(),
        'parent_pct': _parent.round(),
        'charity_pct': _charity.round(),
      });
      if (mounted) context.go('/feed');
    } on DioException catch (e) {
      setState(() => _error = parseApiError(e).message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _slider(String label, Color color, double value, ValueChanged<double> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
            Text('${value.round()}%', style: TextStyle(color: color, fontWeight: FontWeight.bold)),
          ],
        ),
        Slider(
          value: value,
          min: 0,
          max: 100,
          divisions: 100,
          activeColor: color,
          onChanged: onChanged,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF0E8),
      appBar: AppBar(
        title: const Text('Cashback Splits'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1F2937),
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                    decoration: BoxDecoration(
                      color: _total == 100 ? const Color(0xFF789A99).withOpacity(0.1) : Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        Icon(_total == 100 ? Icons.check_circle : Icons.warning,
                            color: _total == 100 ? const Color(0xFF789A99) : Colors.red, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'Total: $_total% ${_total == 100 ? '✓' : '(must equal 100%)'}',
                          style: TextStyle(
                            color: _total == 100 ? const Color(0xFF789A99) : Colors.red,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  _slider('Liquid (instant access)', const Color(0xFF789A99), _liquid,
                      (v) => setState(() => _liquid = v)),
                  _slider('Self Savings (locked 1yr)', const Color(0xFF3B82F6), _savings,
                      (v) => setState(() => _savings = v)),
                  _slider('Parent Fund (monthly transfer)', const Color(0xFF8B5CF6), _parent,
                      (v) => setState(() => _parent = v)),
                  _slider('Charity', const Color(0xFFF97316), _charity,
                      (v) => setState(() => _charity = v)),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                  ],
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: ElevatedButton(
              onPressed: _saving || _total != 100 ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Save & Go to Feed'),
            ),
          ),
        ],
      ),
    );
  }
}
