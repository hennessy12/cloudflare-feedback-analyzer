-- Feedback table to store all customer feedback
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    content TEXT NOT NULL,
    sentiment TEXT,
    sentiment_score REAL,
    category TEXT,
    urgency TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    analyzed_at DATETIME,
    metadata TEXT
);

-- Categories table for tracking themes
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    count INTEGER DEFAULT 0,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sentiment summary view
CREATE TABLE IF NOT EXISTS sentiment_summary (
    date TEXT PRIMARY KEY,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert some mock data for testing
INSERT INTO feedback (source, content, sentiment, sentiment_score, category, urgency) VALUES
    ('github', 'The new dashboard is incredibly slow to load. Takes 30+ seconds every time.', 'negative', 0.92, 'performance', 'high'),
    ('discord', 'Love the new feature! Makes my workflow so much easier.', 'positive', 0.95, 'feature', 'low'),
    ('support', 'How do I configure SSL certificates? Documentation is unclear.', 'neutral', 0.65, 'documentation', 'medium'),
    ('twitter', 'Workers AI is amazing! Just deployed my first app in 10 minutes.', 'positive', 0.98, 'praise', 'low'),
    ('github', 'Critical bug: API returns 500 errors on large payloads', 'negative', 0.88, 'bug', 'high'),
    ('support', 'Pricing page is confusing. Need clearer tier comparisons.', 'neutral', 0.72, 'pricing', 'medium'),
    ('discord', 'D1 database latency is excellent! Sub-10ms queries.', 'positive', 0.91, 'performance', 'low'),
    ('github', 'Feature request: Add TypeScript types for all bindings', 'neutral', 0.68, 'feature', 'medium');

-- Initialize categories
INSERT INTO categories (name, count) VALUES
    ('bug', 1),
    ('feature', 2),
    ('documentation', 1),
    ('performance', 2),
    ('pricing', 1),
    ('praise', 1);

-- Initialize sentiment summary
INSERT INTO sentiment_summary (date, positive_count, negative_count, neutral_count, total_count) VALUES
    (date('now'), 3, 2, 3, 8);
