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

  if (req.method === 'GET') {
    try {
      // Get all proposals for this DAO
      const result = await query(`
        SELECT 
          p.*,
          u.username as creator_username,
          COUNT(DISTINCT v.id) as total_votes,
          COUNT(DISTINCT CASE WHEN v.vote_type = 'yes' THEN v.id END) as yes_votes,
          COUNT(DISTINCT CASE WHEN v.vote_type = 'no' THEN v.id END) as no_votes,
          COUNT(DISTINCT CASE WHEN v.vote_type = 'abstain' THEN v.id END) as abstain_votes,
          MAX(CASE WHEN v.user_id = $1 THEN v.vote_type END) as user_vote
        FROM proposals p
        LEFT JOIN users u ON p.creator_id = u.id
        LEFT JOIN votes v ON p.id = v.proposal_id
        WHERE p.dao_id = $2
        GROUP BY p.id, u.username
        ORDER BY p.created_at DESC
      `, [user.userId, id]);

      res.status(200).json({ proposals: result.rows });
    } catch (error) {
      console.error('Get proposals error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, deadline } = req.body;

      // Check if user is approved member
      const membershipResult = await query(
        'SELECT status FROM memberships WHERE user_id = $1 AND dao_id = $2',
        [user.userId, id]
      );

      if (membershipResult.rows.length === 0 || membershipResult.rows[0].status !== 'approved') {
        return res.status(403).json({ error: 'Must be an approved member to create proposals' });
      }

      // Input validation
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: 'Proposal title is required' });
      }

      if (title.length > 200) {
        return res.status(400).json({ error: 'Title must be 200 characters or less' });
      }

      if (!deadline) {
        return res.status(400).json({ error: 'Deadline is required' });
      }

      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
        return res.status(400).json({ error: 'Deadline must be a valid future date' });
      }

      // Create proposal
      const result = await query(
        'INSERT INTO proposals (dao_id, creator_id, title, description, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, user.userId, title.trim(), description || '', deadlineDate]
      );

      res.status(201).json({ 
        message: 'Proposal created successfully', 
        proposal: result.rows[0] 
      });
    } catch (error) {
      console.error('Create proposal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
