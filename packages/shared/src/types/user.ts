export type Role = 'consumer' | 'advertiser' | 'admin';
export type KycStatus = 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  mobile: string;
  name: string;
  email?: string;
  kyc_status: KycStatus;
  role: Role;
  is_active: boolean;
  fraud_flags: number;
  created_at: string;
  updated_at: string;
}

export interface JwtPayload {
  sub: string;       // user id
  role: Role;
  iat: number;
  exp: number;
}
