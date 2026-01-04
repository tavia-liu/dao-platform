import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface DAO {
  id: number;
  name: string;
  mission: string;
  owner_username: string;
  member_count: number;
  user_membership_status: string | null;
  user_role: string | null;
}
// main homepage 
export default function Home() {
  const [daos, setDaos] = useState<DAO[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => { // runs on page load to check authentication
    checkAuth();
    fetchDAOs();
  }, []);
// check if user is authenticated
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };
// fetch list of DAOs
  const fetchDAOs = async () => {
    try {
      const res = await fetch('/api/daos');
      if (res.ok) {
        const data = await res.json();
        setDaos(data.daos);
      }
    } catch (error) {
      console.error('Fetch DAOs error:', error);
    } finally {
      setLoading(false);
    }
  };
// handle user logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const filteredDaos = daos.filter(dao =>
    dao.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dao.mission.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="container">
      <header className="header">
        <h1>DAO Platform</h1>
        <div className="header-actions">
          <span>Welcome, {user?.username}</span>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <div className="search-create-bar">
        <input
          type="text"
          placeholder="Search DAOs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <Link href="/create-dao" className="btn-primary">
          Create New DAO
        </Link>
      </div>

      <div className="dao-grid">
        {filteredDaos.length === 0 ? (
          <p className="no-data">No DAOs found. Create one to get started!</p>
        ) : (
          filteredDaos.map((dao) => (
            <div key={dao.id} className="dao-card">
              <h3>{dao.name}</h3>
              <p className="dao-mission">{dao.mission || 'No mission statement'}</p>
              <div className="dao-meta">
                <span>Owner: {dao.owner_username}</span>
                <span>Members: {dao.member_count}</span>
              </div>
              {dao.user_membership_status === 'approved' && (
                <div className="membership-badge approved">
                  {dao.user_role === 'owner' ? 'Owner' : 'Member'}
                </div>
              )}
              {dao.user_membership_status === 'pending' && (
                <div className="membership-badge pending">Pending Approval</div>
              )}
              <Link href={`/dao/${dao.id}`} className="btn-primary btn-small">
                View Details
              </Link>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }
        .header h1 {
          margin: 0;
          color: #333;
        }
        .header-actions {
          display: flex;
          gap: 15px;
          align-items: center;
        }
        .search-create-bar {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
        }
        .search-input {
          flex: 1;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        .dao-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .dao-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .dao-card h3 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .dao-mission {
          color: #666;
          margin: 10px 0;
          min-height: 40px;
        }
        .dao-meta {
          display: flex;
          justify-content: space-between;
          margin: 15px 0;
          font-size: 14px;
          color: #666;
        }
        .membership-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .membership-badge.approved {
          background: #d4edda;
          color: #155724;
        }
        .membership-badge.pending {
          background: #fff3cd;
          color: #856404;
        }
        .no-data {
          text-align: center;
          color: #666;
          padding: 40px;
        }
        .loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
        }
      `}</style>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: #f5f5f5;
        }
        .btn-primary {
          background: #007bff;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
        }
        .btn-primary:hover {
          background: #0056b3;
        }
        .btn-secondary {
          background: #6c757d;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-secondary:hover {
          background: #545b62;
        }
        .btn-small {
          padding: 8px 16px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
