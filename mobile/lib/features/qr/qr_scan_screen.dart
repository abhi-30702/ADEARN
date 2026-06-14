import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class QRScanScreen extends StatefulWidget {
  const QRScanScreen({super.key});

  @override
  State<QRScanScreen> createState() => _QRScanScreenState();
}

class _QRScanScreenState extends State<QRScanScreen> {
  bool _scanned = false;
  final MobileScannerController _ctrl = MobileScannerController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_scanned) return;
    final barcode = capture.barcodes.firstOrNull;
    final raw = barcode?.rawValue;
    if (raw == null) return;

    // Expected format: adearn://checkout?session_id=<uuid>&amount=<number>
    final uri = Uri.tryParse(raw);
    if (uri == null || uri.scheme != 'adearn' || uri.host != 'checkout') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid AdEarn QR code')),
      );
      return;
    }

    final sessionId = uri.queryParameters['session_id'];
    final amountStr = uri.queryParameters['amount'];

    if (sessionId == null || amountStr == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Incomplete QR code data')),
      );
      return;
    }

    setState(() => _scanned = true);
    _ctrl.stop();

    // Navigate to checkout with the campaign/session data.
    // For the QR flow we navigate to a special checkout path.
    context.push('/checkout/$sessionId?amount=$amountStr');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Scan AdEarn QR'),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => _ctrl.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(controller: _ctrl, onDetect: _onDetect),
          // Targeting overlay
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(
                    color: const Color(0xFF789A99), width: 3),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          const Positioned(
            bottom: 48,
            left: 0,
            right: 0,
            child: Text(
              'Point camera at an AdEarn QR code',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}
