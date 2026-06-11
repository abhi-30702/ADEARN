import { advertiserRepository } from '../repositories/advertiser.repository';
import { AppError } from '../lib/AppError';
import type { OnboardAdvertiserInput } from '../schemas/advertiser.schema';

export const advertiserService = {
  async onboard(userId: string, data: OnboardAdvertiserInput, requestIp: string) {
    if (!data.pledge_signed) {
      throw new AppError('You must sign the advertiser pledge to continue', 422, 'PLEDGE_REQUIRED');
    }

    // Prevent duplicate onboarding
    const existing = await advertiserRepository.findByUserId(userId);
    if (existing) {
      throw AppError.conflict('This account is already registered as an advertiser');
    }

    // GST uniqueness check
    const gstExists = await advertiserRepository.findByGstNumber(data.gst_number);
    if (gstExists) {
      throw AppError.conflict('GST number already registered');
    }

    const advertiser = await advertiserRepository.create({
      userId,
      companyName: data.company_name,
      gstNumber: data.gst_number,
      contactEmail: data.contact_email,
      contactMobile: data.contact_mobile,
      pledgeIp: requestIp,
    });

    return { advertiser_id: advertiser.id, status: advertiser.status };
  },
};
