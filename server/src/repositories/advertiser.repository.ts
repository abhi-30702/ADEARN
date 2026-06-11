import { db } from '../config/db';

interface AdvertiserRow {
  id: string;
  user_id: string;
  company_name: string;
  gst_number: string;
  status: string;
  pledge_signed: boolean;
  created_at: string;
}

export const advertiserRepository = {
  async findByUserId(userId: string): Promise<AdvertiserRow | null> {
    const res = await db.query<AdvertiserRow>(
      'SELECT * FROM advertisers WHERE user_id = $1',
      [userId],
    );
    return res.rows[0] ?? null;
  },

  async findByGstNumber(gstNumber: string): Promise<AdvertiserRow | null> {
    const res = await db.query<AdvertiserRow>(
      'SELECT id FROM advertisers WHERE gst_number = $1',
      [gstNumber],
    );
    return res.rows[0] ?? null;
  },

  async create(data: {
    userId: string;
    companyName: string;
    gstNumber: string;
    contactEmail: string;
    contactMobile: string;
    pledgeIp: string;
  }): Promise<AdvertiserRow> {
    const res = await db.query<AdvertiserRow>(
      `INSERT INTO advertisers
         (user_id, company_name, gst_number, contact_email, contact_mobile,
          pledge_signed, pledge_signed_at, pledge_ip)
       VALUES ($1,$2,$3,$4,$5,true,NOW(),$6)
       RETURNING id, user_id, company_name, gst_number, status, pledge_signed, created_at`,
      [
        data.userId,
        data.companyName,
        data.gstNumber,
        data.contactEmail,
        data.contactMobile,
        data.pledgeIp,
      ],
    );
    return res.rows[0];
  },
};
