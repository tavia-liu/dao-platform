import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, membershipId } = req.query;
    const { action } = req.body; // 'approve' or 'reject' or 'remove'

    if (!id || Array.isArray(id) || !membershipId || Array.isArray(membershipId)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    if (!['approve', 'reject', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Check if user is DAO owner
    const daoResult = await query('SELECT owner_id FROM daos WHERE id = $1', [id]);
    
    if (daoResult.rows.length === 0) {
      return res.status(404).json({ error: 'DAO not found' });
    }

    if (daoResult.rows[0].owner_id !== user.userId) {
      return res.status(403).json({ error: 'Only DAO owner can manage memberships' });
    }

    // Check if membership exists
    const membershipResult = await query(
      'SELECT id, user_id FROM memberships WHERE id = $1 AND dao_id = $2',
      [membershipId, id]
    );

    if (membershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    // Prevent owner from removing themselves
    if (membershipResult.rows[0].user_id === user.userId && action === 'remove') {
      return res.status(400).json({ error: 'Cannot remove yourself as owner' });
    }

    if (action === 'approve') {
      await query(
        'UPDATE memberships SET status = $1 WHERE id = $2',
        ['approved', membershipId]
      );
      res.status(200).json({ message: 'Membership approved' });
    } else if (action === 'reject') {
      await query(
        'UPDATE memberships SET status = $1 WHERE id = $2',
        ['rejected', membershipId]
      );
      res.status(200).json({ message: 'Membership rejected' });
    } else if (action === 'remove') {
      await query('DELETE FROM memberships WHERE id = $1', [membershipId]);
      res.status(200).json({ message: 'Member removed' });
    }
  } catch (error) {
    console.error('Manage membership error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
