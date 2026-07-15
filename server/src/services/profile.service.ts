import { profileRepository } from '../repositories/profile.repository';
import { AppError } from '../lib/AppError';
import { env } from '../config/env';

export const profileService = {
  async getProfile(userId: string) {
    const profile = await profileRepository.findActiveByUserId(userId);

    if (!profile) {
      return {
        id: null,
        categories: [],
        last_updated: null,
        next_update_at: null,
      };
    }

    return {
      id: profile.id,
      categories: profile.categories,
      last_updated: profile.last_updated,
      next_update_at: profile.next_update_at,
    };
  },

  async updateProfile(userId: string, categories: unknown[]) {
    const existing = await profileRepository.findActiveByUserId(userId);

    // Enforce the profile-update cooldown (default 30 days; configurable via
    // PROFILE_UPDATE_COOLDOWN_DAYS — set to 0 to disable for demos/testing).
    // First-time creation is always allowed (next_update_at is null).
    if (
      env.PROFILE_UPDATE_COOLDOWN_DAYS > 0 &&
      existing?.next_update_at &&
      new Date(existing.next_update_at) > new Date()
    ) {
      throw new AppError(
        `Profile can only be updated after ${existing.next_update_at}`,
        422,
        'PROFILE_UPDATE_TOO_SOON',
      );
    }

    const updated = await profileRepository.upsert(userId, categories);

    return {
      updated: true,
      next_update_at: updated.next_update_at,
    };
  },
};
