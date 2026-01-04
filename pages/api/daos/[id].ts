import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid DAO ID' });
    }

    // Get DAO details
    const daoResult = await query(`
      SELECT 
        d.*,
        u.username as owner_username,
        t.balance as treasury_balance,
        COUNT(DISTINCT CASE WHEN m.status = 'approved' THEN m.id END) as member_count
      FROM daos d
      LEFT JOIN users u ON d.owner_id = u.id
      LEFT JOIN treasury t ON d.id = t.dao_id
      LEFT JOIN memberships m ON d.id = m.dao_id
      WHERE d.id = $1
      GROUP BY d.id, u.username, t.balance
    `, [id]);

    if (daoResult.rows.length === 0) {
      return res.status(404).json({ error: 'DAO not found' });
    }

    const dao = daoResult.rows[0];

    // Get user's membership status
    const membershipResult = await query(
      'SELECT status, role FROM memberships WHERE user_id = $1 AND dao_id = $2',
      [user.userId, id]
    );

    const membership = membershipResult.rows[0] || null;

    res.status(200).json({ 
      dao,
      userMembership: membership
    });
  } catch (error) {
    console.error('Get DAO error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
