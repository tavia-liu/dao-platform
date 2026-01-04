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
      // Get treasury balance and recent transactions
      const treasuryResult = await query(
        'SELECT balance, currency, updated_at FROM treasury WHERE dao_id = $1',
        [id]
      );

      const transactionsResult = await query(`
        SELECT 
          t.*,
          u.username as creator_username
        FROM treasury_transactions t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.dao_id = $1
        ORDER BY t.created_at DESC
        LIMIT 50
      `, [id]);

      res.status(200).json({
        treasury: treasuryResult.rows[0] || { balance: 0, currency: 'USD' },
        transactions: transactionsResult.rows
      });
    } catch (error) {
      console.error('Get treasury error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { amount, transactionType, description } = req.body;

      // Check if user is DAO owner
      const daoResult = await query('SELECT owner_id FROM daos WHERE id = $1', [id]);
      
      if (daoResult.rows.length === 0) {
        return res.status(404).json({ error: 'DAO not found' });
      }

      if (daoResult.rows[0].owner_id !== user.userId) {
        return res.status(403).json({ error: 'Only DAO owner can manage treasury' });
      }

      // Input validation
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      const parsedAmount = parseFloat(amount);

      if (parsedAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be positive' });
      }

      if (!['deposit', 'withdrawal', 'proposal_expense'].includes(transactionType)) {
        return res.status(400).json({ error: 'Invalid transaction type' });
      }

      // Get current balance
      const treasuryResult = await query(
        'SELECT balance FROM treasury WHERE dao_id = $1',
        [id]
      );

      const currentBalance = parseFloat(treasuryResult.rows[0]?.balance || 0);

      // Calculate new balance
      let newBalance = currentBalance;
      if (transactionType === 'deposit') {
        newBalance += parsedAmount;
      } else {
        if (currentBalance < parsedAmount) {
          return res.status(400).json({ error: 'Insufficient treasury balance' });
        }
        newBalance -= parsedAmount;
      }

      // Update treasury balance
      await query(
        'UPDATE treasury SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE dao_id = $2',
        [newBalance, id]
      );

      // Record transaction
      await query(
        'INSERT INTO treasury_transactions (dao_id, amount, transaction_type, description, created_by) VALUES ($1, $2, $3, $4, $5)',
        [id, transactionType === 'deposit' ? parsedAmount : -parsedAmount, transactionType, description || '', user.userId]
      );

      res.status(201).json({ 
        message: 'Transaction recorded successfully',
        newBalance
      });
    } catch (error) {
      console.error('Treasury transaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
