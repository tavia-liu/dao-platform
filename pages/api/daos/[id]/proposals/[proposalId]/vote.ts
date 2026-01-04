import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, proposalId } = req.query;
    const { voteType } = req.body; // 'yes', 'no', 'abstain'

    if (!id || Array.isArray(id) || !proposalId || Array.isArray(proposalId)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    if (!['yes', 'no', 'abstain'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    // Check if user is approved member
    const membershipResult = await query(
      'SELECT status FROM memberships WHERE user_id = $1 AND dao_id = $2',
      [user.userId, id]
    );

    if (membershipResult.rows.length === 0 || membershipResult.rows[0].status !== 'approved') {
      return res.status(403).json({ error: 'Must be an approved member to vote' });
    }

    // Check if proposal exists and is active
    const proposalResult = await query(
      'SELECT id, deadline, status FROM proposals WHERE id = $1 AND dao_id = $2',
      [proposalId, id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const proposal = proposalResult.rows[0];

    if (proposal.status !== 'active') {
      return res.status(400).json({ error: 'Proposal is no longer active' });
    }

    if (new Date(proposal.deadline) < new Date()) {
      return res.status(400).json({ error: 'Voting deadline has passed' });
    }

    // Check if user has already voted
    const existingVote = await query(
      'SELECT id FROM votes WHERE proposal_id = $1 AND user_id = $2',
      [proposalId, user.userId]
    );

    if (existingVote.rows.length > 0) {
      // Update existing vote
      await query(
        'UPDATE votes SET vote_type = $1, voted_at = CURRENT_TIMESTAMP WHERE proposal_id = $2 AND user_id = $3',
        [voteType, proposalId, user.userId]
      );
      res.status(200).json({ message: 'Vote updated successfully' });
    } else {
      // Insert new vote
      await query(
        'INSERT INTO votes (proposal_id, user_id, vote_type) VALUES ($1, $2, $3)',
        [proposalId, user.userId, voteType]
      );
      res.status(201).json({ message: 'Vote cast successfully' });
    }
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
