import { db } from '../config/db';

export const notificationRepository = {
  async getAdvertiserWebhookUrl(advertiserId: string): Promise<string | null> {
    const res = await db.query<{ webhook_url: string | null }>(
      'SELECT webhook_url FROM advertisers WHERE id = $1',
      [advertiserId],
    );
    return res.rows[0]?.webhook_url ?? null;
  },
};
