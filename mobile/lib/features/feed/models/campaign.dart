class Campaign {
  final String id;
  final String name;
  final String brandName;
  final double cashbackRate;
  final String creativeUrl;
  final String creativeType;

  const Campaign({
    required this.id,
    required this.name,
    required this.brandName,
    required this.cashbackRate,
    required this.creativeUrl,
    required this.creativeType,
  });

  factory Campaign.fromJson(Map<String, dynamic> json) => Campaign(
    id: json['id'] as String,
    name: json['name'] as String,
    brandName: json['brand_name'] as String,
    cashbackRate: double.parse(json['cashback_rate'].toString()),
    creativeUrl: json['creative_url'] as String,
    creativeType: json['creative_type'] as String,
  );
}
