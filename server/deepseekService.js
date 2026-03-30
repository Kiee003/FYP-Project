// Try different import approaches based on what's available
let DeepSeek;
try {
    // Method 1: CommonJS require
    DeepSeek = require('deepseek');
} catch (e) {
    try {
        // Method 2: Default import style
        DeepSeek = require('deepseek').default;
    } catch (e2) {
        console.log('⚠️ DeepSeek package not found, using fallback mode');
        DeepSeek = null;
    }
}

class DeepSeekService {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        
        // Check if we have the API client or need to use fetch directly
        if (DeepSeek && typeof DeepSeek === 'function') {
            try {
                this.client = new DeepSeek({
                    apiKey: this.apiKey
                });
                console.log('🤖 DeepSeek AI client initialized');
            } catch (error) {
                console.log('⚠️ DeepSeek client init failed, using fetch fallback:', error.message);
                this.client = null;
            }
        } else {
            console.log('🤖 DeepSeek AI service will use fetch API');
            this.client = null;
        }
    }

    async generateInsights(metrics, url) {
        console.log('🧠 Generating AI insights for:', url);
        
        try {
            // Format metrics for better readability
            const metricsSummary = this.formatMetricsForPrompt(metrics);
            
            // Try using the client if available
            if (this.client) {
                return await this.generateWithClient(metricsSummary, url, metrics);
            } else {
                // Fallback to direct API call
                return await this.generateWithFetch(metricsSummary, url, metrics);
            }
        } catch (error) {
            console.error('❌ DeepSeek API error:', error.message);
            return this.getFallbackInsights(metrics);
        }
    }

    async generateWithClient(metricsSummary, url, metrics) {
        const prompt = this.createInsightPrompt(metricsSummary, url);
        
        const response = await this.client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: 'You are a web performance expert specializing in networking and frontend optimization. Provide clear, actionable insights based on Lighthouse metrics. Focus on identifying network-related issues and practical solutions.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const insight = response.choices[0].message.content;
        
        return {
            summary: insight,
            recommendations: this.generateRecommendations(metrics, insight),
            generatedAt: new Date().toISOString()
        };
    }

    async generateWithFetch(metricsSummary, url, metrics) {
        console.log('📡 Using fetch API for DeepSeek...');
        
        const prompt = this.createInsightPrompt(metricsSummary, url);
        
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a web performance expert specializing in networking and frontend optimization. Provide clear, actionable insights based on Lighthouse metrics. Focus on identifying network-related issues and practical solutions.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const insight = data.choices[0].message.content;
        
        return {
            summary: insight,
            recommendations: this.generateRecommendations(metrics, insight),
            generatedAt: new Date().toISOString()
        };
    }

    formatMetricsForPrompt(metrics) {
        return `
Performance Metrics:
- Performance Score: ${metrics.scores?.performance || 0}/100
- Largest Contentful Paint (LCP): ${this.formatTime(metrics.metrics?.lcp)} (Target: < 2.5s)
- First Contentful Paint (FCP): ${this.formatTime(metrics.metrics?.fcp)} (Target: < 1.8s)
- Time to First Byte (TTFB): ${this.formatTime(metrics.metrics?.ttfb)} (Target: < 0.8s)
- Cumulative Layout Shift (CLS): ${metrics.metrics?.cls?.toFixed(3) || 0} (Target: < 0.1)
- Total Blocking Time (TBT): ${this.formatTime(metrics.metrics?.tbt)} (Target: < 300ms)
- Total Requests: ${metrics.requests?.total || 0}
        `.trim();
    }

    formatTime(milliseconds) {
        if (!milliseconds) return 'N/A';
        const seconds = (milliseconds / 1000).toFixed(2);
        return `${seconds}s`;
    }

    createInsightPrompt(metricsSummary, url) {
        return `
Analyze these Google Lighthouse performance metrics for ${url} and provide:

1. NETWORK INSIGHTS (2-3 sentences):
   - How network conditions affect this page (latency, server response, resource delivery)
   - Identify specific network-related bottlenecks

2. TOP PERFORMANCE ISSUES (bullet points):
   - List the 3 most critical problems with specific metrics
   - Explain why each issue matters for user experience

3. ACTIONABLE RECOMMENDATIONS:
   - Provide 3 specific, practical fixes
   - Prioritize recommendations that address network performance

Here are the metrics:
${metricsSummary}

Keep your response concise and technical. Focus on networking aspects where relevant.
        `;
    }

    generateRecommendations(metrics, summaryInsight) {
        const recommendations = [];
        const m = metrics.metrics || {};
        
        // Check LCP (should be < 2500ms)
        if (m.lcp > 2500) {
            recommendations.push({
                issue: 'High Largest Contentful Paint',
                severity: m.lcp > 4000 ? 'critical' : 'warning',
                networkFactor: m.ttfb > 800 ? 'Likely server/network latency' : 'Likely render-blocking resources',
                suggestion: 'Optimize server response time, implement CDN, or defer non-critical resources'
            });
        }

        // Check TTFB (should be < 800ms)
        if (m.ttfb > 800) {
            recommendations.push({
                issue: 'Slow Time to First Byte',
                severity: m.ttfb > 1800 ? 'critical' : 'warning',
                networkFactor: 'Directly indicates server or network delay',
                suggestion: 'Use a CDN, upgrade hosting, enable caching, or optimize backend queries'
            });
        }

        // Check CLS (should be < 0.1)
        if (m.cls > 0.1) {
            recommendations.push({
                issue: 'Layout Shifts During Load',
                severity: m.cls > 0.25 ? 'critical' : 'warning',
                networkFactor: 'Late-loading resources causing shifts',
                suggestion: 'Set explicit width/height for images, reserve space for ads'
            });
        }

        // Check TBT (should be < 300ms)
        if (m.tbt > 300) {
            recommendations.push({
                issue: 'High Total Blocking Time',
                severity: m.tbt > 600 ? 'critical' : 'warning',
                networkFactor: 'Large JavaScript payloads over slow networks',
                suggestion: 'Reduce JavaScript, implement code splitting, defer unused code'
            });
        }

        // If no specific issues found, add general recommendation
        if (recommendations.length === 0) {
            recommendations.push({
                issue: 'Overall Performance',
                severity: 'info',
                networkFactor: 'Performance is good!',
                suggestion: 'Continue monitoring and consider implementing HTTP/3 for future improvement'
            });
        }

        return recommendations;
    }

    getFallbackInsights(metrics) {
        const score = metrics.scores?.performance || 0;
        let summary = '';
        
        if (score >= 90) {
            summary = 'Excellent performance! Your page loads quickly and provides a good user experience.';
        } else if (score >= 50) {
            summary = 'Average performance. There\'s room for improvement, especially in network optimization.';
        } else {
            summary = 'Poor performance. Users may experience significant delays. Focus on core web vitals and network optimizations.';
        }
        
        return {
            summary,
            recommendations: this.generateRecommendations(metrics, summary),
            generatedAt: new Date().toISOString(),
            note: 'Using fallback insights (AI service unavailable)'
        };
    }
}

module.exports = new DeepSeekService();