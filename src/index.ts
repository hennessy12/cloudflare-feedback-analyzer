/**
 * Feedback Analyzer - Cloudflare Workers Application
 * Uses Workers AI, D1 Database, and KV for feedback aggregation & analysis
 */

export interface Env {
	AI: Ai;
	DB: D1Database;
	CACHE: KVNamespace;
}

interface FeedbackItem {
	id?: number;
	source: string;
	content: string;
	sentiment?: string;
	sentiment_score?: number;
	category?: string;
	urgency?: string;
	created_at?: string;
	metadata?: string;
}

interface AnalysisResult {
	sentiment: string;
	sentiment_score: number;
	category: string;
	urgency: string;
}

/**
 * Analyze feedback using Workers AI
 */
async function analyzeFeedback(ai: Ai, content: string): Promise<AnalysisResult> {
	// Use Llama for sentiment analysis and categorization
	const prompt = `Analyze this customer feedback and provide:
1. Sentiment: positive, negative, or neutral
2. Category: bug, feature, documentation, performance, pricing, or general
3. Urgency: high, medium, or low

Feedback: "${content}"

Respond ONLY with JSON in this format:
{"sentiment": "...", "category": "...", "urgency": "..."}`;

	try {
		const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
			messages: [
				{
					role: 'user',
					content: prompt
				}
			],
			max_tokens: 150
		});

		// Parse the AI response
		const responseText = response.response || '';
		
		// Extract JSON from response
		const jsonMatch = responseText.match(/\{[^}]+\}/);
		if (jsonMatch) {
			const analysis = JSON.parse(jsonMatch[0]);
			
			// Calculate sentiment score based on sentiment
			const sentiment_score = 
				analysis.sentiment === 'positive' ? 0.9 :
				analysis.sentiment === 'negative' ? 0.85 : 0.7;

			return {
				sentiment: analysis.sentiment || 'neutral',
				sentiment_score,
				category: analysis.category || 'general',
				urgency: analysis.urgency || 'medium'
			};
		}
	} catch (error) {
		console.error('AI analysis failed:', error);
	}

	// Fallback if AI fails
	return {
		sentiment: 'neutral',
		sentiment_score: 0.5,
		category: 'general',
		urgency: 'medium'
	};
}

/**
 * Get aggregated feedback analytics
 */
async function getAnalytics(db: D1Database) {
	// Get sentiment breakdown
	const sentimentQuery = await db.prepare(`
		SELECT 
			sentiment,
			COUNT(*) as count,
			AVG(sentiment_score) as avg_score
		FROM feedback
		GROUP BY sentiment
	`).all();

	// Get category breakdown
	const categoryQuery = await db.prepare(`
		SELECT 
			category,
			COUNT(*) as count,
			AVG(sentiment_score) as avg_sentiment
		FROM feedback
		GROUP BY category
		ORDER BY count DESC
		LIMIT 10
	`).all();

	// Get urgency breakdown
	const urgencyQuery = await db.prepare(`
		SELECT 
			urgency,
			COUNT(*) as count
		FROM feedback
		GROUP BY urgency
	`).all();

	// Get source breakdown
	const sourceQuery = await db.prepare(`
		SELECT 
			source,
			COUNT(*) as count,
			AVG(sentiment_score) as avg_sentiment
		FROM feedback
		GROUP BY source
		ORDER BY count DESC
	`).all();

	// Get recent feedback
	const recentQuery = await db.prepare(`
		SELECT 
			id, source, content, sentiment, category, urgency, created_at
		FROM feedback
		ORDER BY created_at DESC
		LIMIT 20
	`).all();

	// Calculate trends
	const totalFeedback = sentimentQuery.results?.reduce((sum, item: any) => sum + item.count, 0) || 0;
	const positiveFeedback = sentimentQuery.results?.find((item: any) => item.sentiment === 'positive')?.count || 0;
	const negativeFeedback = sentimentQuery.results?.find((item: any) => item.sentiment === 'negative')?.count || 0;

	return {
		summary: {
			total: totalFeedback,
			positive_percentage: totalFeedback > 0 ? ((positiveFeedback / totalFeedback) * 100).toFixed(1) : 0,
			negative_percentage: totalFeedback > 0 ? ((negativeFeedback / totalFeedback) * 100).toFixed(1) : 0,
		},
		sentiment: sentimentQuery.results,
		categories: categoryQuery.results,
		urgency: urgencyQuery.results,
		sources: sourceQuery.results,
		recent: recentQuery.results
	};
}

/**
 * HTML Dashboard
 */
function getDashboardHTML(analytics: any): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Feedback Analyzer Dashboard</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			padding: 2rem;
		}
		.container {
			max-width: 1400px;
			margin: 0 auto;
		}
		h1 {
			color: white;
			margin-bottom: 0.5rem;
			font-size: 2.5rem;
		}
		.subtitle {
			color: rgba(255,255,255,0.9);
			margin-bottom: 2rem;
			font-size: 1.1rem;
		}
		.stats-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
			gap: 1.5rem;
			margin-bottom: 2rem;
		}
		.stat-card {
			background: white;
			padding: 1.5rem;
			border-radius: 12px;
			box-shadow: 0 4px 6px rgba(0,0,0,0.1);
		}
		.stat-label {
			color: #64748b;
			font-size: 0.875rem;
			font-weight: 600;
			text-transform: uppercase;
			margin-bottom: 0.5rem;
		}
		.stat-value {
			font-size: 2.5rem;
			font-weight: 700;
			color: #1e293b;
		}
		.stat-subtitle {
			color: #94a3b8;
			font-size: 0.875rem;
			margin-top: 0.25rem;
		}
		.charts-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
			gap: 1.5rem;
			margin-bottom: 2rem;
		}
		.chart-card {
			background: white;
			padding: 1.5rem;
			border-radius: 12px;
			box-shadow: 0 4px 6px rgba(0,0,0,0.1);
		}
		.chart-title {
			font-size: 1.25rem;
			font-weight: 600;
			color: #1e293b;
			margin-bottom: 1rem;
		}
		.bar {
			display: flex;
			align-items: center;
			margin-bottom: 0.75rem;
		}
		.bar-label {
			min-width: 120px;
			font-weight: 500;
			color: #475569;
		}
		.bar-visual {
			flex: 1;
			height: 32px;
			background: linear-gradient(90deg, #667eea, #764ba2);
			border-radius: 6px;
			margin: 0 1rem;
			position: relative;
		}
		.bar-value {
			font-weight: 600;
			color: #1e293b;
			min-width: 40px;
			text-align: right;
		}
		.feedback-list {
			background: white;
			padding: 1.5rem;
			border-radius: 12px;
			box-shadow: 0 4px 6px rgba(0,0,0,0.1);
		}
		.feedback-item {
			padding: 1rem;
			border-bottom: 1px solid #e2e8f0;
		}
		.feedback-item:last-child {
			border-bottom: none;
		}
		.feedback-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 0.5rem;
		}
		.feedback-meta {
			display: flex;
			gap: 0.5rem;
		}
		.badge {
			padding: 0.25rem 0.75rem;
			border-radius: 9999px;
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
		}
		.badge-positive { background: #dcfce7; color: #166534; }
		.badge-negative { background: #fee2e2; color: #991b1b; }
		.badge-neutral { background: #f1f5f9; color: #475569; }
		.badge-high { background: #fef2f2; color: #991b1b; }
		.badge-medium { background: #fffbeb; color: #92400e; }
		.badge-low { background: #f0fdf4; color: #166534; }
		.feedback-content {
			color: #475569;
			line-height: 1.6;
		}
		.api-section {
			background: white;
			padding: 1.5rem;
			border-radius: 12px;
			box-shadow: 0 4px 6px rgba(0,0,0,0.1);
			margin-top: 2rem;
		}
		.api-endpoint {
			background: #f8fafc;
			padding: 1rem;
			border-radius: 8px;
			margin: 0.5rem 0;
			font-family: 'Courier New', monospace;
			font-size: 0.875rem;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>📊 Feedback Analyzer</h1>
		<p class="subtitle">Real-time customer feedback aggregation powered by Cloudflare Workers AI + D1</p>

		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-label">Total Feedback</div>
				<div class="stat-value">${analytics.summary.total}</div>
				<div class="stat-subtitle">Across all sources</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Positive Rate</div>
				<div class="stat-value">${analytics.summary.positive_percentage}%</div>
				<div class="stat-subtitle">Customer satisfaction</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Negative Rate</div>
				<div class="stat-value">${analytics.summary.negative_percentage}%</div>
				<div class="stat-subtitle">Issues to address</div>
			</div>
		</div>

		<div class="charts-grid">
			<div class="chart-card">
				<h3 class="chart-title">Sentiment Distribution</h3>
				${analytics.sentiment.map((item: any) => `
					<div class="bar">
						<div class="bar-label">${item.sentiment}</div>
						<div class="bar-visual" style="width: ${(item.count / analytics.summary.total * 100)}%"></div>
						<div class="bar-value">${item.count}</div>
					</div>
				`).join('')}
			</div>

			<div class="chart-card">
				<h3 class="chart-title">Top Categories</h3>
				${analytics.categories.slice(0, 5).map((item: any) => `
					<div class="bar">
						<div class="bar-label">${item.category}</div>
						<div class="bar-visual" style="width: ${(item.count / analytics.summary.total * 100)}%"></div>
						<div class="bar-value">${item.count}</div>
					</div>
				`).join('')}
			</div>

			<div class="chart-card">
				<h3 class="chart-title">Urgency Levels</h3>
				${analytics.urgency.map((item: any) => `
					<div class="bar">
						<div class="bar-label">${item.urgency}</div>
						<div class="bar-visual" style="width: ${(item.count / analytics.summary.total * 100)}%"></div>
						<div class="bar-value">${item.count}</div>
					</div>
				`).join('')}
			</div>

			<div class="chart-card">
				<h3 class="chart-title">Feedback Sources</h3>
				${analytics.sources.map((item: any) => `
					<div class="bar">
						<div class="bar-label">${item.source}</div>
						<div class="bar-visual" style="width: ${(item.count / analytics.summary.total * 100)}%"></div>
						<div class="bar-value">${item.count}</div>
					</div>
				`).join('')}
			</div>
		</div>

		<div class="feedback-list">
			<h3 class="chart-title">Recent Feedback</h3>
			${analytics.recent.map((item: any) => `
				<div class="feedback-item">
					<div class="feedback-header">
						<div class="feedback-meta">
							<span class="badge badge-${item.sentiment}">${item.sentiment}</span>
							<span class="badge">${item.category}</span>
							<span class="badge badge-${item.urgency}">${item.urgency}</span>
							<span class="badge">${item.source}</span>
						</div>
						<div style="color: #94a3b8; font-size: 0.875rem;">${new Date(item.created_at).toLocaleDateString()}</div>
					</div>
					<div class="feedback-content">${item.content}</div>
				</div>
			`).join('')}
		</div>

		<div class="api-section">
			<h3 class="chart-title">API Endpoints</h3>
			<p style="color: #64748b; margin-bottom: 1rem;">Use these endpoints to submit and retrieve feedback:</p>
			<div class="api-endpoint">POST /api/feedback - Submit new feedback</div>
			<div class="api-endpoint">GET /api/analytics - Get aggregated analytics (this page's data)</div>
			<div class="api-endpoint">GET /api/feedback?source=github&limit=10 - Query feedback</div>
		</div>
	</div>
</body>
</html>`;
}

/**
 * Main Worker handler
 */
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// Dashboard - Main UI
			if (path === '/' || path === '/dashboard') {
				const analytics = await getAnalytics(env.DB);
				const html = getDashboardHTML(analytics);
				return new Response(html, {
					headers: {
						'Content-Type': 'text/html',
						...corsHeaders
					}
				});
			}

			// API: Submit new feedback
			if (path === '/api/feedback' && request.method === 'POST') {
				const data: FeedbackItem = await request.json();
				
				// Validate required fields
				if (!data.source || !data.content) {
					return new Response(JSON.stringify({
						error: 'Missing required fields: source and content'
					}), {
						status: 400,
						headers: { 'Content-Type': 'application/json', ...corsHeaders }
					});
				}

				// Analyze feedback with AI
				const analysis = await analyzeFeedback(env.AI, data.content);

				// Store in D1
				const result = await env.DB.prepare(`
					INSERT INTO feedback (source, content, sentiment, sentiment_score, category, urgency, analyzed_at)
					VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
				`).bind(
					data.source,
					data.content,
					analysis.sentiment,
					analysis.sentiment_score,
					analysis.category,
					analysis.urgency
				).run();

				return new Response(JSON.stringify({
					success: true,
					id: result.meta.last_row_id,
					analysis
				}), {
					headers: { 'Content-Type': 'application/json', ...corsHeaders }
				});
			}

			// API: Get analytics
			if (path === '/api/analytics' && request.method === 'GET') {
				const analytics = await getAnalytics(env.DB);
				return new Response(JSON.stringify(analytics), {
					headers: { 'Content-Type': 'application/json', ...corsHeaders }
				});
			}

			// API: Query feedback
			if (path === '/api/feedback' && request.method === 'GET') {
				const source = url.searchParams.get('source');
				const sentiment = url.searchParams.get('sentiment');
				const category = url.searchParams.get('category');
				const limit = parseInt(url.searchParams.get('limit') || '50');

				let query = 'SELECT * FROM feedback WHERE 1=1';
				const params: any[] = [];

				if (source) {
					query += ' AND source = ?';
					params.push(source);
				}
				if (sentiment) {
					query += ' AND sentiment = ?';
					params.push(sentiment);
				}
				if (category) {
					query += ' AND category = ?';
					params.push(category);
				}

				query += ' ORDER BY created_at DESC LIMIT ?';
				params.push(limit);

				const result = await env.DB.prepare(query).bind(...params).all();

				return new Response(JSON.stringify({
					count: result.results?.length || 0,
					feedback: result.results
				}), {
					headers: { 'Content-Type': 'application/json', ...corsHeaders }
				});
			}

			// 404
			return new Response('Not Found', { 
				status: 404,
				headers: corsHeaders
			});

		} catch (error: any) {
			console.error('Error:', error);
			return new Response(JSON.stringify({
				error: error.message || 'Internal server error'
			}), {
				status: 500,
				headers: { 'Content-Type': 'application/json', ...corsHeaders }
			});
		}
	},
};
