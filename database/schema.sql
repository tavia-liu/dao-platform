-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DAOs table
CREATE TABLE daos (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mission TEXT,
    rules TEXT,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Memberships table
CREATE TABLE memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    dao_id INTEGER REFERENCES daos(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, dao_id)
);

--  Proposals table
CREATE TABLE proposals (
    id SERIAL PRIMARY KEY,
    dao_id INTEGER REFERENCES daos(id) ON DELETE CASCADE,
    creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    deadline TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'approved', 'rejected', 'quorum_not_met'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--  Votes table
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, user_id)
);

--  Treasury table (for creative portion)
CREATE TABLE treasury (
    id SERIAL PRIMARY KEY,
    dao_id INTEGER REFERENCES daos(id) ON DELETE CASCADE,
    balance DECIMAL(18, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--  Treasury Transactions table (for creative portion)
CREATE TABLE treasury_transactions (
    id SERIAL PRIMARY KEY,
    dao_id INTEGER REFERENCES daos(id) ON DELETE CASCADE,
    amount DECIMAL(18, 2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'proposal_expense'
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--  indexes for better performance
CREATE INDEX idx_memberships_dao ON memberships(dao_id); -- source: https://www.postgresql.org/docs/current/sql-createindex.html
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_proposals_dao ON proposals(dao_id);
CREATE INDEX idx_votes_proposal ON votes(proposal_id);
CREATE INDEX idx_treasury_dao ON treasury(dao_id);
