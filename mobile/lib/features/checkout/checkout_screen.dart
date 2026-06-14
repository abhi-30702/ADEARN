// TODO: implemented in Task 45
import 'package:flutter/material.dart';

class CheckoutScreen extends StatelessWidget {
  final String campaignId;
  const CheckoutScreen({super.key, required this.campaignId});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Checkout')),
    body: Center(child: Text('Campaign: $campaignId')),
  );
}
