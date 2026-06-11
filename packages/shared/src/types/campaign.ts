export type CampaignStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'completed' | 'suspended';
export type CreativeType = 'video' | 'banner' | 'audio';

export interface TargetProfile {
  categories: string[];
  brands: string[];
  subcategories?: string[];
}

export interface Campaign {
  id: string;
  advertiser_id: string;
  name: string;
  description?: string;
  creative_url: string;
  creative_type: CreativeType;
  target_profile: TargetProfile;
  cashback_rate: number;  // 0.01–0.05
  daily_cap: number;
  total_budget: number;
  spent_to_date: number;
  status: CampaignStatus;
  rejection_reason?: string;
  approved_at?: string;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  updated_at: string;
}
