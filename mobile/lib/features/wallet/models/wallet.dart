class PoolBalances {
  final double liquidBalance;
  final double savingsBalance;
  final double parentBalance;
  final double charityBalance;
  final double totalEarned;

  const PoolBalances({
    required this.liquidBalance,
    required this.savingsBalance,
    required this.parentBalance,
    required this.charityBalance,
    required this.totalEarned,
  });

  factory PoolBalances.fromJson(Map<String, dynamic> json) => PoolBalances(
    liquidBalance: double.parse(json['liquid_balance'].toString()),
    savingsBalance: double.parse(json['savings_balance'].toString()),
    parentBalance: double.parse(json['parent_balance'].toString()),
    charityBalance: double.parse(json['charity_balance'].toString()),
    totalEarned: double.parse(json['total_earned'].toString()),
  );
}

class CashbackTx {
  final String id;
  final String createdAt;
  final String campaignName;
  final String brandName;
  final double cashbackAmount;
  final String status;

  const CashbackTx({
    required this.id,
    required this.createdAt,
    required this.campaignName,
    required this.brandName,
    required this.cashbackAmount,
    required this.status,
  });

  factory CashbackTx.fromJson(Map<String, dynamic> json) => CashbackTx(
    id: json['id'] as String,
    createdAt: json['created_at'] as String,
    campaignName: json['campaign_name'] as String,
    brandName: json['brand_name'] as String,
    cashbackAmount: double.parse(json['cashback_amount'].toString()),
    status: json['status'] as String,
  );
}
