import { db } from '../config/db';
import type { User } from '@adearn/shared';

export const userRepository = {
  async findByMobile(mobile: string): Promise<User | null> {
    const res = await db.query<User>(
      'SELECT * FROM users WHERE mobile = $1',
      [mobile],
    );
    return res.rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const res = await db.query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
    return res.rows[0] ?? null;
  },

  async create(mobile: string, name: string): Promise<User> {
    const res = await db.query<User>(
      `INSERT INTO users (mobile, name) VALUES ($1, $2) RETURNING *`,
      [mobile, name],
    );
    return res.rows[0];
  },

  async updateLastSeen(id: string): Promise<void> {
    await db.query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [id],
    );
  },
};
