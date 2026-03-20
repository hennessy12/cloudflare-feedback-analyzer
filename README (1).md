# Feedback Analyzer

> AI-powered feedback aggregation and analysis tool built on Cloudflare's Developer Platform

## 🎯 Overview

Feedback Analyzer is a production-ready tool that helps product managers aggregate, analyze, and derive insights from customer feedback across multiple sources (GitHub, Discord, Twitter, Support Tickets, etc.).

### Key Features

- **AI-Powered Analysis**: Uses Workers AI (Llama 3.1) for sentiment analysis and categorization
- **Real-time Dashboard**: Beautiful UI showing trends, sentiment, and urgency
- **RESTful API**: Easy integration with any feedback source
- **Serverless**: Runs on Cloudflare's global network with automatic scaling
- **Zero Configuration**: No infrastructure to manage

## 🏗️ Architecture

<img width="422" height="482" alt="Screenshot 2026-03-20 at 9 33 45 AM" src="https://github.com/user-attachments/assets/22463658-746c-4f0f-8cd5-a1c1df79d480" />


### Cloudflare Products Used

1. **Cloudflare Workers** - Serverless compute hosting the application
2. **Workers AI** - Llama 3.1 model for sentiment analysis and categorization
3. **D1 Database** - Serverless SQL database storing feedback data
4. **KV (Optional)** - Key-value store for caching analytics

### Data Flow

```
Feedback Source → API Endpoint → Workers AI Analysis → D1 Storage → Dashboard
```

## 🚀 Quick Start

### Prerequisites

- Cloudflare account
- Node.js 18+ and npm
- Wrangler CLI

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd feedback-analyzer

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login
```

### Setup D1 Database

```bash
# Create D1 database
npx wrangler d1 create feedback-db

# Copy the database_id from output and update wrangler.toml

# Initialize database with schema
npm run d1:init
```

### Setup KV Namespace (Optional)

```bash
# Create KV namespace
npx wrangler kv:namespace create "CACHE"

# Copy the id from output and update wrangler.toml
```

### Local Development

```bash
# Run locally (uses local D1 database)
npm run dev

# Visit http://localhost:8787
```

### Deploy to Production

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Your app will be live at: https://feedback-analyzer.<your-subdomain>.workers.dev
```

## 📡 API Endpoints

### Submit Feedback

```bash
POST /api/feedback
Content-Type: application/json

{
  "source": "github",
  "content": "The new dashboard loads very slowly"
}

# Response
{
  "success": true,
  "id": 123,
  "analysis": {
    "sentiment": "negative",
    "sentiment_score": 0.85,
    "category": "performance",
    "urgency": "high"
  }
}
```

### Get Analytics

```bash
GET /api/analytics

# Returns aggregated data:
# - Sentiment breakdown
# - Category distribution
# - Urgency levels
# - Source distribution
# - Recent feedback
```

### Query Feedback

```bash
GET /api/feedback?source=github&sentiment=negative&limit=20

# Response
{
  "count": 15,
  "feedback": [...]
}
```

## 🎨 Dashboard

Visit the root URL to see the interactive dashboard with:
- Total feedback count and satisfaction metrics
- Sentiment distribution charts
- Top categories and themes
- Urgency level breakdown
- Feedback source analysis
- Recent feedback feed

## 🧪 Testing with Mock Data

The database schema includes mock data for immediate testing:
- 8 sample feedback items
- Multiple sources (GitHub, Discord, Twitter, Support)
- Various sentiments and categories

## 📊 AI Analysis

The system uses Workers AI (Llama 3.1-8B-Instruct) to automatically:
1. **Classify Sentiment**: positive, negative, or neutral
2. **Categorize**: bug, feature, documentation, performance, pricing, general
3. **Assess Urgency**: high, medium, or low

## 🔐 Production Considerations

### Security
- Add authentication for POST endpoints
- Implement rate limiting
- Validate and sanitize inputs

### Scaling
- Use KV for caching analytics
- Implement pagination for large datasets
- Consider D1 read replicas for high traffic

### Monitoring
- Enable Observability in wrangler.toml
- Set up error tracking
- Monitor AI inference costs

## 💡 Extending the Tool

Ideas for enhancement:
1. **Workflows Integration**: Automatic escalation for high-urgency items
2. **Vectorize**: Semantic search for similar feedback
3. **Email Notifications**: Alert on critical issues
4. **Slack/Discord Bots**: Real-time feedback submission
5. **Custom AI Models**: Fine-tune for domain-specific categorization

## 📝 License

MIT

## 🙏 Acknowledgments

Built with Cloudflare's amazing Developer Platform products.
