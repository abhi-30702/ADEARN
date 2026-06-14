import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'checkout_repository.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  final String campaignId;
  // purchaseAmount defaults to 1499 for demo; in production comes from product page
  final double purchaseAmount;

  const CheckoutScreen({
    super.key,
    required this.campaignId,
    this.purchaseAmount = 1499.0,
  });

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  bool _loading = false;
  String? _error;

  Future<void> _pay() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final repo = ref.read(checkoutRepositoryProvider);

      // Step 1: start attribution session
      final session =
          await repo.startSession(widget.campaignId, widget.purchaseAmount);

      // Step 2: create Stripe PaymentIntent
      final intent = await repo.createPaymentIntent(session.sessionId);

      // Step 3: configure Stripe publishable key
      Stripe.publishableKey = intent.publishableKey;

      // Step 4: init PaymentSheet
      await Stripe.instance.initPaymentSheet(
        paymentSheetData: SetupPaymentSheetParameters(
          paymentIntentClientSecret: intent.clientSecret,
          merchantDisplayName: 'AdEarn',
          style: ThemeMode.light,
        ),
      );

      // Step 5: present PaymentSheet
      await Stripe.instance.presentPaymentSheet();

      // Step 6: success
      if (mounted) {
        _showSuccessSheet(session.estimatedCashback);
      }
    } on StripeException catch (e) {
      if (e.error.code != FailureCode.Canceled) {
        setState(
            () => _error = e.error.localizedMessage ?? 'Payment failed');
      }
    } catch (e) {
      setState(
          () => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showSuccessSheet(double cashback) {
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle,
                color: Color(0xFF789A99), size: 64),
            const SizedBox(height: 16),
            const Text(
              'Payment Successful!',
              style:
                  TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              '₹${cashback.toStringAsFixed(2)} cashback\nis being processed.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: Color(0xFF6B7280), fontSize: 16, height: 1.4),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context); // close sheet
                  Navigator.pop(context); // go back to feed
                },
                child: const Text('Back to Feed'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cashback = widget.purchaseAmount * 0.03; // approximate 3% for display

    return Scaffold(
      backgroundColor: const Color(0xFFFFF0E8),
      appBar: AppBar(
        title: const Text('Checkout'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1F2937),
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Order Summary',
                    style: TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const Divider(height: 24),
                  _row('Purchase amount',
                      '₹${widget.purchaseAmount.toStringAsFixed(2)}'),
                  const SizedBox(height: 8),
                  _row(
                    'Estimated cashback (~3%)',
                    '+₹${cashback.toStringAsFixed(2)}',
                    valueColor: const Color(0xFF10B981),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF789A99).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline,
                      color: Color(0xFF789A99), size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Cashback is credited after your payment is confirmed (usually < 3 seconds).',
                      style: TextStyle(
                          color: Color(0xFF789A99),
                          fontSize: 12,
                          height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!,
                  style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
            const Spacer(),
            ElevatedButton(
              onPressed: _loading ? null : _pay,
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Pay with Card'),
            ),
            const SizedBox(height: 8),
            const Center(
              child: Text(
                'Secured by Stripe',
                style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: const TextStyle(color: Color(0xFF6B7280))),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: valueColor ?? const Color(0xFF111827),
          ),
        ),
      ],
    );
  }
}
