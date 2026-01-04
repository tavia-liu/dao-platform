import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function CreateDAO() {
  const [name, setName] = useState('');
  const [mission, setMission] = useState('');
  const [rules, setRules] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
// handle form submission to create a new DAO
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/daos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mission, rules }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/dao/${data.dao.id}`);
      } else {
        setError(data.error || 'Failed to create DAO');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
// render the DAO creation form
  return (
    <div className="container">
      <div className="header">
        <h1>Create New DAO</h1>
        <Link href="/" className="btn-secondary">Back to Home</Link>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}
          
          <div className="form-group">
            <label>DAO Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="Enter a unique name for your DAO"
            />
          </div>

          <div className="form-group">
            <label>Mission Statement</label>
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              rows={4}
              placeholder="Describe the purpose and goals of your DAO"
            />
          </div>

          <div className="form-group">
            <label>Rules & Guidelines</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={6}
              placeholder="Define the rules and guidelines for your DAO members"
            />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create DAO'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .container {
          max-width: 800px;
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
        .form-container {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .form-group {
          margin-bottom: 25px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          font-family: inherit;
        }
        .form-group textarea {
          resize: vertical;
        }
        .error {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        .btn-full {
          width: 100%;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}
