import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract user from JWT cookie
    const user = getUserFromRequest(req);
    //If no valid token, user is not authenticated
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    //Fetch full user data from database
    const result = await query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [user.userId]
    );
    // User token is valid but user deleted from database
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    //Return user data 
    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
