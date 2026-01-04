import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';
//"When DAO is created, three things happen: Insert into daos table; Automatically add creator as approved owner in memberships; Create treasury record starting at $0
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method === 'GET') {
    try {
      // Get all DAOs with member count and user's membership status
      const result = await query(`
        SELECT 
          d.id, 
          d.name, 
          d.mission, 
          d.rules, 
          d.owner_id,
          u.username as owner_username,
          d.created_at,
          COUNT(DISTINCT CASE WHEN m.status = 'approved' THEN m.id END) as member_count,
          MAX(CASE WHEN m.user_id = $1 THEN m.status END) as user_membership_status,
          MAX(CASE WHEN m.user_id = $1 THEN m.role END) as user_role
        FROM daos d
        LEFT JOIN users u ON d.owner_id = u.id
        LEFT JOIN memberships m ON d.id = m.dao_id
        GROUP BY d.id, u.username
        ORDER BY d.created_at DESC
      `, [user.userId]);

      res.status(200).json({ daos: result.rows });
    } catch (error) {
      console.error('Get DAOs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, mission, rules } = req.body;

      // Input validation
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'DAO name is required' });
      }

      if (name.length > 100) {
        return res.status(400).json({ error: 'DAO name must be 100 characters or less' });
      }

      // Create DAO
      const daoResult = await query(
        'INSERT INTO daos (name, mission, rules, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [name.trim(), mission || '', rules || '', user.userId]
      );

      const dao = daoResult.rows[0];

      // Add owner as approved member
      await query(
        'INSERT INTO memberships (user_id, dao_id, status, role) VALUES ($1, $2, $3, $4)',
        [user.userId, dao.id, 'approved', 'owner']
      );

      // Create treasury for the DAO
      await query(
        'INSERT INTO treasury (dao_id, balance) VALUES ($1, $2)',
        [dao.id, 0]
      );

      res.status(201).json({ 
        message: 'DAO created successfully', 
        dao 
      });
    } catch (error) {
      console.error('Create DAO error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
