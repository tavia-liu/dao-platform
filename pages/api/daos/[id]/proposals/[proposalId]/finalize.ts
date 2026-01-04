import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';
// /api/daos/5/proposals/12/finalize
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

    if (!id || Array.isArray(id) || !proposalId || Array.isArray(proposalId)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    // Get proposal details
    const proposalResult = await query(`
      SELECT 
        p.id, 
        p.deadline, 
        p.status,
        p.dao_id,
        COUNT(DISTINCT CASE WHEN v.vote_type = 'yes' THEN v.id END) as yes_votes,
        COUNT(DISTINCT CASE WHEN v.vote_type = 'no' THEN v.id END) as no_votes,
        COUNT(DISTINCT CASE WHEN v.vote_type = 'abstain' THEN v.id END) as abstain_votes,
        COUNT(DISTINCT m.id) as total_members
      FROM proposals p
      LEFT JOIN votes v ON p.id = v.proposal_id
      LEFT JOIN memberships m ON p.dao_id = m.dao_id AND m.status = 'approved'
      WHERE p.id = $1 AND p.dao_id = $2
      GROUP BY p.id
    `, [proposalId, id]);

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const proposal = proposalResult.rows[0];

    if (proposal.status !== 'active') {
      return res.status(400).json({ error: 'Proposal already finalized' });
    }

    if (new Date(proposal.deadline) > new Date()) {
      return res.status(400).json({ error: 'Voting deadline has not passed yet' });
    }

    // Calculate outcome
    const yesVotes = parseInt(proposal.yes_votes);
    const noVotes = parseInt(proposal.no_votes);
    const totalMembers = parseInt(proposal.total_members);
    const totalVotes = yesVotes + noVotes + parseInt(proposal.abstain_votes);

    // Simple majority with quorum requirement (at least 50% of members must vote)
    const quorumMet = totalVotes >= totalMembers * 0.5;
    let status = 'quorum_not_met';

    if (quorumMet) {
      status = yesVotes > noVotes ? 'approved' : 'rejected';
    }

    // Update proposal status
    await query(
      'UPDATE proposals SET status = $1 WHERE id = $2',
      [status, proposalId]
    );

    res.status(200).json({ 
      message: 'Proposal finalized', 
      status,
      results: {
        yesVotes,
        noVotes,
        abstainVotes: parseInt(proposal.abstain_votes),
        totalMembers,
        quorumMet
      }
    });
  } catch (error) {
    console.error('Finalize proposal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
