import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface DAO {
  id: number;
  name: string;
  mission: string;
  rules: string;
  owner_id: number;
  owner_username: string;
  member_count: number;
  treasury_balance: number;
}

interface Membership {
  status: string;
  role: string;
}

interface Proposal {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
  creator_username: string;
  yes_votes: number;
  no_votes: number;
  abstain_votes: number;
  total_votes: number;
  user_vote: string | null;
}

interface Member {
  id: number;
  user_id: number;
  username: string;
  email: string;
  status: string;
  role: string;
}

interface Transaction {
  id: number;
  amount: number;
  transaction_type: string;
  description: string;
  creator_username: string;
  created_at: string;
}

export default function DAODetail() {
  const router = useRouter(); // source: https://nextjs.org/docs/app/api-reference/functions/use-router
  const { id } = router.query; 
  
  const [dao, setDao] = useState<DAO | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proposals' | 'members' | 'treasury'>('proposals');
  
  // Proposal creation
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalDeadline, setProposalDeadline] = useState('');
  
  // Treasury
  const [showTreasuryForm, setShowTreasuryForm] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [transactionDescription, setTransactionDescription] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (id) {
      fetchDAOData();
      fetchProposals();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'members' && membership?.role === 'owner') {
      fetchMembers();
    } else if (activeTab === 'treasury') {
      fetchTreasury();
    }
  }, [activeTab]);
// fetch DAO details and user membership status
  const fetchDAOData = async () => {
    try {
      const res = await fetch(`/api/daos/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDao(data.dao);
        setMembership(data.userMembership);
      } else {
        setError('Failed to load DAO');
      }
    } catch (error) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async () => {
    try {
      const res = await fetch(`/api/daos/${id}/proposals`);
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals);
      }
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/daos/${id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.memberships);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };
// fetch treasury transactions
  const fetchTreasury = async () => {
    try {
      const res = await fetch(`/api/daos/${id}/treasury`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Failed to fetch treasury:', error);
    }
  };
// request to join DAO
  const handleJoinDAO = async () => {
    try {
      const res = await fetch(`/api/daos/${id}/members`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Membership request sent!');
        fetchDAOData();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to join DAO');
    }
  };
// approve, reject, or remove member
  const handleMembershipAction = async (membershipId: number, action: string) => {
    try {
      const res = await fetch(`/api/daos/${id}/members/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setSuccess(`Member ${action}d successfully`);
        fetchMembers();
        fetchDAOData();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to update membership');
    }
  };
// create new proposal
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/daos/${id}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: proposalTitle,
          description: proposalDescription,
          deadline: proposalDeadline,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Proposal created successfully!');
        setShowProposalForm(false);
        setProposalTitle('');
        setProposalDescription('');
        setProposalDeadline('');
        fetchProposals();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to create proposal');
    }
  };
// cast vote on proposal
  const handleVote = async (proposalId: number, voteType: string) => {
    try {
      const res = await fetch(`/api/daos/${id}/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType }),
      });
      if (res.ok) {
        setSuccess('Vote cast successfully!');
        fetchProposals();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to cast vote');
    }
  };
// finalize proposal after voting deadline
  const handleFinalizeProposal = async (proposalId: number) => {
    try {
      const res = await fetch(`/api/daos/${id}/proposals/${proposalId}/finalize`, {
        method: 'POST',
      });
      if (res.ok) {
        setSuccess('Proposal finalized!');
        fetchProposals();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to finalize proposal');
    }
  };
// record treasury transaction
  const handleTreasuryTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/daos/${id}/treasury`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: transactionAmount,
          transactionType,
          description: transactionDescription,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Transaction recorded successfully!');
        setShowTreasuryForm(false);
        setTransactionAmount('');
        setTransactionDescription('');
        fetchDAOData();
        fetchTreasury();
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to record transaction');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!dao) return <div className="error">DAO not found</div>;

  const isOwner = membership?.role === 'owner';
  const isMember = membership?.status === 'approved';

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>{dao.name}</h1>
          <p className="owner">Owner: {dao.owner_username}</p>
        </div>
        <Link href="/" className="btn-secondary">Back to Home</Link>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="dao-info">
        <div className="info-section">
          <h3>Mission</h3>
          <p>{dao.mission || 'No mission statement'}</p>
        </div>
        <div className="info-section">
          <h3>Rules</h3>
          <p>{dao.rules || 'No rules defined'}</p>
        </div>
        <div className="stats">
          <div className="stat-item">
            <strong>{dao.member_count}</strong>
            <span>Members</span>
          </div>
          <div className="stat-item">
            <strong>${parseFloat(String(dao.treasury_balance || '0')).toFixed(2)}</strong>
            <span>Treasury</span>
          </div>
        </div>
      </div>

      {!isMember && membership?.status !== 'pending' && (
        <button onClick={handleJoinDAO} className="btn-primary">
          Request to Join DAO
        </button>
      )}
      
      {membership?.status === 'pending' && (
        <div className="pending-notice">Your membership request is pending approval</div>
      )}

      {isMember && (
        <>
          <div className="tabs">
            <button
              className={activeTab === 'proposals' ? 'active' : ''}
              onClick={() => setActiveTab('proposals')}
            >
              Proposals
            </button>
            {isOwner && (
              <button
                className={activeTab === 'members' ? 'active' : ''}
                onClick={() => setActiveTab('members')}
              >
                Members
              </button>
            )}
            <button
              className={activeTab === 'treasury' ? 'active' : ''}
              onClick={() => setActiveTab('treasury')}
            >
              Treasury
            </button>
          </div>

          {activeTab === 'proposals' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Proposals</h2>
                <button onClick={() => setShowProposalForm(!showProposalForm)} className="btn-primary">
                  {showProposalForm ? 'Cancel' : 'Create Proposal'}
                </button>
              </div>

              {showProposalForm && (
                <div className="form-box">
                  <form onSubmit={handleCreateProposal}>
                    <div className="form-group">
                      <label>Title *</label>
                      <input
                        type="text"
                        value={proposalTitle}
                        onChange={(e) => setProposalTitle(e.target.value)}
                        required
                        maxLength={200}
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={proposalDescription}
                        onChange={(e) => setProposalDescription(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="form-group">
                      <label>Voting Deadline *</label>
                      <input
                        type="datetime-local"
                        value={proposalDeadline}
                        onChange={(e) => setProposalDeadline(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="btn-primary">Create Proposal</button>
                  </form>
                </div>
              )}

              <div className="proposals-list">
                {proposals.length === 0 ? (
                  <p className="no-data">No proposals yet</p>
                ) : (
                  proposals.map((proposal) => (
                    <div key={proposal.id} className="proposal-card">
                      <div className="proposal-header">
                        <h3>{proposal.title}</h3>
                        <span className={`status-badge status-${proposal.status}`}>
                          {proposal.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="proposal-desc">{proposal.description}</p>
                      <div className="proposal-meta">
                        <span>By: {proposal.creator_username}</span>
                        <span>Deadline: {new Date(proposal.deadline).toLocaleString()}</span>
                      </div>
                      
                      <div className="vote-stats">
                        <div className="vote-bar">
                          <div 
                            className="vote-bar-yes" 
                            style={{ width: `${(proposal.yes_votes / Math.max(proposal.total_votes, 1)) * 100}%` }}
                          />
                          <div 
                            className="vote-bar-no" 
                            style={{ width: `${(proposal.no_votes / Math.max(proposal.total_votes, 1)) * 100}%` }}
                          />
                        </div>
                        <div className="vote-counts">
                          <span className="yes">Yes: {proposal.yes_votes}</span>
                          <span className="no">No: {proposal.no_votes}</span>
                          <span>Abstain: {proposal.abstain_votes}</span>
                        </div>
                      </div>

                      {proposal.status === 'active' && new Date(proposal.deadline) > new Date() && (
                        <div className="vote-buttons">
                          {proposal.user_vote && (
                            <span className="current-vote">Your vote: {proposal.user_vote}</span>
                          )}
                          <button onClick={() => handleVote(proposal.id, 'yes')} className="btn-yes">
                            Vote Yes
                          </button>
                          <button onClick={() => handleVote(proposal.id, 'no')} className="btn-no">
                            Vote No
                          </button>
                          <button onClick={() => handleVote(proposal.id, 'abstain')} className="btn-abstain">
                            Abstain
                          </button>
                        </div>
                      )}

                      {proposal.status === 'active' && new Date(proposal.deadline) <= new Date() && (
                        <button onClick={() => handleFinalizeProposal(proposal.id)} className="btn-secondary">
                          Finalize Proposal
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'members' && isOwner && (
            <div className="tab-content">
              <h2>Member Management</h2>
              <div className="members-list">
                {members.map((member) => (
                  <div key={member.id} className="member-card">
                    <div className="member-info">
                      <strong>{member.username}</strong>
                      <span>{member.email}</span>
                      <span className={`status-badge status-${member.status}`}>
                        {member.status} - {member.role}
                      </span>
                    </div>
                    <div className="member-actions">
                      {member.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleMembershipAction(member.id, 'approve')}
                            className="btn-yes"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleMembershipAction(member.id, 'reject')}
                            className="btn-no"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {member.status === 'approved' && member.role !== 'owner' && (
                        <button
                          onClick={() => handleMembershipAction(member.id, 'remove')}
                          className="btn-no"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'treasury' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Treasury Management</h2>
                {isOwner && (
                  <button onClick={() => setShowTreasuryForm(!showTreasuryForm)} className="btn-primary">
                    {showTreasuryForm ? 'Cancel' : 'New Transaction'}
                  </button>
                )}
              </div>

              {showTreasuryForm && isOwner && (
                <div className="form-box">
                  <form onSubmit={handleTreasuryTransaction}>
                    <div className="form-group">
                      <label>Transaction Type</label>
                      <select
                        value={transactionType}
                        onChange={(e) => setTransactionType(e.target.value as any)}
                      >
                        <option value="deposit">Deposit</option>
                        <option value="withdrawal">Withdrawal</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Amount *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <input
                        type="text"
                        value={transactionDescription}
                        onChange={(e) => setTransactionDescription(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn-primary">Record Transaction</button>
                  </form>
                </div>
              )}

              <div className="treasury-balance">
                <h3>Current Balance: ${parseFloat(String(dao.treasury_balance || 0)).toFixed(2)}</h3>
              </div>

              <div className="transactions-list">
                <h3>Transaction History</h3>
                {transactions.length === 0 ? (
                  <p className="no-data">No transactions yet</p>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="transaction-card">
                      <div className="transaction-info">
                        <strong className={tx.amount >= 0 ? 'positive' : 'negative'}>
                          {tx.amount >= 0 ? '+' : ''} ${Math.abs(tx.amount).toFixed(2)}
                        </strong>
                        <span>{tx.transaction_type.replace('_', ' ')}</span>
                        <span>{tx.description}</span>
                      </div>
                      <div className="transaction-meta">
                        <span>By: {tx.creator_username}</span>
                        <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }
        .header h1 {
          margin: 0 0 5px 0;
          color: #333;
        }
        .owner {
          color: #666;
          margin: 0;
        }
        .alert {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        .alert.error {
          background: #f8d7da;
          color: #721c24;
        }
        .alert.success {
          background: #d4edda;
          color: #155724;
        }
        .dao-info {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .info-section {
          margin-bottom: 20px;
        }
        .info-section h3 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .info-section p {
          margin: 0;
          color: #666;
          line-height: 1.6;
        }
        .stats {
          display: flex;
          gap: 30px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .stat-item strong {
          font-size: 24px;
          color: #007bff;
        }
        .stat-item span {
          font-size: 14px;
          color: #666;
        }
        .pending-notice {
          background: #fff3cd;
          color: #856404;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        .tabs {
          display: flex;
          gap: 10px;
          margin: 20px 0;
          border-bottom: 2px solid #e0e0e0;
        }
        .tabs button {
          padding: 12px 24px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 16px;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
        }
        .tabs button.active {
          color: #007bff;
          border-bottom-color: #007bff;
        }
        .tabs button:hover {
          color: #0056b3;
        }
        .tab-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .section-header h2 {
          margin: 0;
        }
        .form-box {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
        }
        .proposals-list,
        .members-list,
        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .proposal-card {
          border: 1px solid #e0e0e0;
          padding: 20px;
          border-radius: 8px;
        }
        .proposal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        .proposal-header h3 {
          margin: 0;
          flex: 1;
        }
        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          text-transform: capitalize;
        }
        .status-active {
          background: #cfe2ff;
          color: #084298;
        }
        .status-approved {
          background: #d1e7dd;
          color: #0f5132;
        }
        .status-rejected {
          background: #f8d7da;
          color: #842029;
        }
        .status-quorum_not_met {
          background: #fff3cd;
          color: #664d03;
        }
        .status-pending {
          background: #fff3cd;
          color: #856404;
        }
        .proposal-desc {
          color: #666;
          margin: 10px 0;
        }
        .proposal-meta {
          display: flex;
          gap: 20px;
          font-size: 14px;
          color: #666;
          margin-bottom: 15px;
        }
        .vote-stats {
          margin: 15px 0;
        }
        .vote-bar {
          height: 30px;
          background: #e9ecef;
          border-radius: 4px;
          display: flex;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .vote-bar-yes {
          background: #28a745;
        }
        .vote-bar-no {
          background: #dc3545;
        }
        .vote-counts {
          display: flex;
          gap: 20px;
          font-size: 14px;
        }
        .vote-counts .yes {
          color: #28a745;
          font-weight: 600;
        }
        .vote-counts .no {
          color: #dc3545;
          font-weight: 600;
        }
        .vote-buttons {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 15px;
        }
        .current-vote {
          font-size: 14px;
          color: #666;
          font-style: italic;
        }
        .btn-yes {
          background: #28a745;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-yes:hover {
          background: #218838;
        }
        .btn-no {
          background: #dc3545;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-no:hover {
          background: #c82333;
        }
        .btn-abstain {
          background: #6c757d;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-abstain:hover {
          background: #545b62;
        }
        .member-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid #e0e0e0;
          padding: 15px;
          border-radius: 8px;
        }
        .member-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .member-info span {
          font-size: 14px;
          color: #666;
        }
        .member-actions {
          display: flex;
          gap: 10px;
        }
        .treasury-balance {
          background: #e7f3ff;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 20px;
        }
        .treasury-balance h3 {
          margin: 0;
          color: #007bff;
          font-size: 28px;
        }
        .transaction-card {
          border: 1px solid #e0e0e0;
          padding: 15px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .transaction-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .transaction-info strong {
          font-size: 18px;
        }
        .transaction-info strong.positive {
          color: #28a745;
        }
        .transaction-info strong.negative {
          color: #dc3545;
        }
        .transaction-info span {
          font-size: 14px;
          color: #666;
          text-transform: capitalize;
        }
        .transaction-meta {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 12px;
          color: #666;
          text-align: right;
        }
        .no-data {
          text-align: center;
          color: #666;
          padding: 40px;
        }
        .loading {
          text-align: center;
          padding: 40px;
        }
      `}</style>
    </div>
  );
}
