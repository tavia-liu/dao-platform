import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid DAO ID' });
  }

  if (req.method === 'POST') {
    try {
      // Check if DAO exists
      const daoResult = await query('SELECT id FROM daos WHERE id = $1', [id]);
      
      if (daoResult.rows.length === 0) {
        return res.status(404).json({ error: 'DAO not found' });
      }

      // Check if membership already exists
      const existingMembership = await query(
        'SELECT id, status FROM memberships WHERE user_id = $1 AND dao_id = $2',
        [user.userId, id]
      );

      if (existingMembership.rows.length > 0) {
        const status = existingMembership.rows[0].status;
        if (status === 'approved') {
          return res.status(400).json({ error: 'Already a member' });
        } else if (status === 'pending') {
          return res.status(400).json({ error: 'Membership request already pending' });
        }
      }

      // Create membership request
      await query(
        'INSERT INTO memberships (user_id, dao_id, status, role) VALUES ($1, $2, $3, $4)',
        [user.userId, id, 'pending', 'member']
      );

      res.status(201).json({ message: 'Membership request sent successfully' });
    } catch (error) {
      console.error('Join DAO error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      // Get all membership requests for this DAO (only for owner)
      const daoResult = await query('SELECT owner_id FROM daos WHERE id = $1', [id]);
      
      if (daoResult.rows.length === 0) {
        return res.status(404).json({ error: 'DAO not found' });
      }

      const dao = daoResult.rows[0];

      if (dao.owner_id !== user.userId) {
        return res.status(403).json({ error: 'Only DAO owner can view membership requests' });
      }

      const result = await query(`
        SELECT 
          m.id, 
          m.user_id, 
          m.status, 
          m.role,
          m.joined_at,
          u.username,
          u.email
        FROM memberships m
        JOIN users u ON m.user_id = u.id
        WHERE m.dao_id = $1
        ORDER BY m.joined_at DESC
      `, [id]);

      res.status(200).json({ memberships: result.rows });
    } catch (error) {
      console.error('Get memberships error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
