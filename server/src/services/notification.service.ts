import { logger } from '../config/logger';
import { env } from '../config/env';
import { notificationRepository } from '../repositories/notification.repository';

export interface CashbackNotificationPayload {
  userId: string;
  cashbackAmount: number;   // rupees
  campaignName: string;
  status: 'completed' | 'under_review';
}

export interface AdvertiserWebhookPayload {
  event: 'conversion';
  campaignId: string;
  cashbackAmount: number;
  purchaseAmount: number;
  timestamp: string;   // ISO string
}

export const notificationService = {
  async sendCashbackNotification(payload: CashbackNotificationPayload): Promise<void> {
    try {
      if (env.EMAIL_MOCK) {
        logger.info(
          {
            userId: payload.userId,
            cashbackAmount: payload.cashbackAmount,
            campaignName: payload.campaignName,
            status: payload.status,
          },
          'notification: cashback processed (mocked)',
        );
      } else {
        logger.warn(
          { userId: payload.userId },
          'email/FCM not implemented — set EMAIL_MOCK=true',
        );
      }
    } catch (err) {
      logger.error(
        { err, userId: payload.userId },
        'Error sending cashback notification',
      );
      // Don't throw — notifications are best-effort
    }
  },

  async sendAdvertiserWebhook(
    advertiserId: string,
    payload: AdvertiserWebhookPayload,
  ): Promise<void> {
    try {
      const webhookUrl = await notificationRepository.getAdvertiserWebhookUrl(
        advertiserId,
      );

      if (!webhookUrl) {
        logger.debug(
          { advertiserId },
          'No webhook URL configured for advertiser',
        );
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          logger.warn(
            {
              advertiserId,
              webhookUrl,
              statusCode: response.status,
            },
            'Advertiser webhook returned non-2xx status',
          );
        } else {
          logger.debug(
            { advertiserId, campaignId: payload.campaignId },
            'Advertiser webhook sent successfully',
          );
        }
      } catch (fetchErr) {
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          logger.warn(
            { advertiserId, webhookUrl },
            'Advertiser webhook request timed out',
          );
        } else {
          logger.warn(
            { advertiserId, webhookUrl, err: fetchErr },
            'Failed to send advertiser webhook',
          );
        }
        // Don't throw — webhooks are best-effort
      }
    } catch (err) {
      logger.error(
        { err, advertiserId },
        'Error in advertiser webhook service',
      );
      // Don't throw — webhooks are best-effort
    }
  },
};
