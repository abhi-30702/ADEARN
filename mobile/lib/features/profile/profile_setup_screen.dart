import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../core/api_client.dart';

const _categories = [
  'Electronics', 'Health & Beauty', 'Fashion', 'Food & Grocery',
  'Home & Kitchen', 'Books', 'Sports', 'Travel',
];

class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final Set<String> _selected = {};
  bool _saving = false;
  String? _error;

  Future<void> _save() async {
    if (_selected.isEmpty) {
      setState(() => _error = 'Select at least one category');
      return;
    }

    setState(() { _saving = true; _error = null; });

    try {
      final dio = ref.read(dioProvider);
      await dio.put('/profile', data: {
        'categories': _selected
            .map((c) => {'category': c, 'brands': [], 'spend_range': '₹5K–20K', 'frequency': 'Monthly'})
            .toList(),
      });
      if (mounted) context.go('/profile/pool');
    } on DioException catch (e) {
      setState(() => _error = parseApiError(e).message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF0E8),
      appBar: AppBar(
        title: const Text('Purchase Profile'),
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
                  const Text(
                    'What do you usually shop for?',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'We only show ads matched to your declared interests.',
                    style: TextStyle(color: Color(0xFF6B7280)),
                  ),
                  const SizedBox(height: 24),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: _categories.map((cat) {
                      final selected = _selected.contains(cat);
                      return FilterChip(
                        label: Text(cat),
                        selected: selected,
                        onSelected: (_) => setState(() {
                          if (selected) _selected.remove(cat);
                          else _selected.add(cat);
                        }),
                        selectedColor: const Color(0xFF789A99).withOpacity(0.2),
                        checkmarkColor: const Color(0xFF789A99),
                        side: BorderSide(
                          color: selected ? const Color(0xFF789A99) : const Color(0xFFD1D5DB),
                        ),
                      );
                    }).toList(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                  ],
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Continue'),
            ),
          ),
        ],
      ),
    );
  }
}
