const OpenAI = require('openai');

class DeepSeekService {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        
        if (!this.apiKey) {
            console.log('⚠️ No DeepSeek API key found in .env file');
            console.log('   Please add: DEEPSEEK_API_KEY=your_key_here');
            this.client = null;
            return;
        }
        
        try {
            this.client = new OpenAI({
                baseURL: 'https://api.deepseek.com',
                apiKey: this.apiKey,
                timeout: 60000
            });
            console.log('✅ DeepSeek AI client initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize DeepSeek client:', error.message);
            this.client = null;
        }
    }

    async generateInsights(metrics, url) {
        console.log('\n🤖 ========================================');
        console.log('🤖 Generating REAL AI insights for:', url);
        console.log('🤖 ========================================\n');
        
        if (!this.client) {
            console.log('⚠️ AI not available - using fallback');
            return this.getIntelligentFallback(metrics);
        }
        
        try {
            const prompt = this.createDetailedPrompt(metrics, url);
            
            console.log('📡 Calling DeepSeek API (this may take 5-10 seconds)...');
            const startTime = Date.now();
            
            const response = await this.client.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert web performance analyst. Your job is to analyze website speed metrics and write UNIQUE, SPECIFIC, INSIGHTFUL analysis.

CRITICAL RULES:
1. NEVER use generic templates or repeating phrases
2. ALWAYS reference the actual numbers from the metrics
3. Write as if you're explaining to a non-technical website owner
4. Each analysis must be DIFFERENT based on the specific data
5. Use varied sentence structures and vocabulary
6. Be specific - mention the exact loading times, scores, and request counts

Example of BAD (generic): "Your website loads slowly. Consider compressing images."
Example of GOOD (specific): "Your 18.4 second load time means 70% of visitors leave. That 5.8MB hero image is the main culprit - it's like asking mobile users to download a 2-hour video."`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.9,
                max_tokens: 1000
            });
            
            const endTime = Date.now();
            console.log(`✅ AI response received in ${(endTime - startTime) / 1000} seconds`);
            
            const aiContent = response.choices[0].message.content;
            const parsedResult = this.parseAIResponse(aiContent, metrics);
            console.log('✅ AI analysis completed successfully');
            
            return parsedResult;
            
        } catch (error) {
            console.error('❌ DeepSeek API error:', error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Error details:', JSON.stringify(error.response.data, null, 2));
            }
            console.log('⚠️ Falling back to intelligent analysis based on metrics');
            return this.getIntelligentFallback(metrics);
        }
    }

    createDetailedPrompt(metrics, url) {
        const score = metrics.scores?.performance || 0;
        const lcp = (metrics.metrics?.lcp || 0) / 1000;
        const fcp = (metrics.metrics?.fcp || 0) / 1000;
        const ttfb = (metrics.metrics?.ttfb || 0) / 1000;
        const cls = metrics.metrics?.cls || 0;
        const tbt = (metrics.metrics?.tbt || 0) / 1000;
        const requests = metrics.requests?.total || 0;
        
        let rating = '';
        if (score >= 90) rating = 'Excellent';
        else if (score >= 70) rating = 'Good';
        else if (score >= 50) rating = 'Average';
        else if (score >= 30) rating = 'Poor';
        else rating = 'Critical';
        
        return `Analyze the performance of ${url} based on these Lighthouse metrics:

WEBSITE METRICS:
- Performance Score: ${score}/100 (${rating})
- Largest Contentful Paint (main content): ${lcp.toFixed(1)} seconds (target: under 2.5s)
- First Contentful Paint (first content): ${fcp.toFixed(1)} seconds (target: under 1.8s)
- Time to First Byte (server speed): ${ttfb.toFixed(1)} seconds (target: under 0.8s)
- Cumulative Layout Shift (stability): ${cls.toFixed(3)} (target: under 0.1)
- Total Blocking Time (responsiveness): ${tbt.toFixed(1)} seconds (target: under 0.3s)
- Total Network Requests: ${requests} files (target: under 50)

Write a COMPLETE, UNIQUE analysis with these 3 sections. Do NOT use templates or generic phrases. Be specific to these exact numbers.

SECTION 1 - SIMPLE SUMMARY (4-5 sentences):
Write a natural, conversational explanation of what users actually experience. Use analogies if helpful. Mention specific numbers. Explain WHY the site performs this way based on the metrics.

SECTION 2 - SPECIFIC PROBLEMS (In bullet points):
For each problem, explain:
• What metric is causing the issue and its specific value
• Why this happens in plain English
• How it affects real visitors

SECTION 3 - CUSTOMIZED RECOMMENDATIONS (List of specific actions):
Based ONLY on the numbers above, suggest specific fixes. Don't use generic advice. Match the severity of the problem.`;
    }

    parseAIResponse(aiContent, metrics) {
        const lines = aiContent.split('\n');
        let summary = '';
        
        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed.length === 0) continue;
            if (trimmed.includes('SECTION') || trimmed.includes('---')) continue;
            if (trimmed.includes('SUMMARY') || trimmed.includes('SIMPLE SUMMARY')) {
                continue;
            }
            if (summary.length === 0 && trimmed.length > 20) {
                summary += trimmed + ' ';
                if (summary.length > 500) break;
            } else if (summary.length > 0 && summary.length < 500) {
                summary += trimmed + ' ';
                if (summary.length > 500) break;
            }
        }
        
        if (!summary || summary.length < 50) {
            summary = aiContent.substring(0, 500);
        }
        
        const recommendations = this.generateDynamicRecommendations(metrics);
        
        return {
            summary: summary.trim(),
            simpleSummary: summary.trim(),
            recommendations: recommendations,
            generatedAt: new Date().toISOString(),
            isRealAI: true
        };
    }

    generateDynamicRecommendations(metrics) {
        const recommendations = [];
        const m = metrics.metrics || {};
        const lcp = (m.lcp || 0) / 1000;
        const ttfb = (m.ttfb || 0) / 1000;
        const cls = m.cls || 0;
        const tbt = (m.tbt || 0) / 1000;
        const requests = metrics.requests?.total || 0;
        const score = metrics.scores?.performance || 0;
        
        // LCP-based recommendation
        if (lcp > 4) {
            const severity = lcp > 8 ? 'critical' : 'warning';
            recommendations.push({
                issue: `🐌 Main content loads in ${lcp.toFixed(1)} seconds`,
                plainEnglish: `Visitors wait ${lcp.toFixed(1)} seconds to see your main content. Most people expect this in under 2.5 seconds.`,
                severity: severity,
                simpleSuggestion: lcp > 10 
                    ? `Your large hero image is likely the main culprit. Compressing it could save seconds of load time.`
                    : `Your main image or video is too large. Try compressing it or using WebP format.`,
                actionItems: this.getActionsForMetric('lcp', lcp)
            });
        }
        
        // TTFB-based recommendation
        if (ttfb > 1.5 && ttfb !== 0) {
            recommendations.push({
                issue: `💤 Server responds in ${ttfb.toFixed(1)} seconds`,
                plainEnglish: `Your server takes ${ttfb.toFixed(1)} seconds just to respond. Good servers respond in under 0.8 seconds.`,
                severity: ttfb > 3 ? 'critical' : 'warning',
                simpleSuggestion: 'Your hosting may be overloaded or underpowered for your traffic levels.',
                actionItems: this.getActionsForMetric('ttfb', ttfb)
            });
        }
        
        // CLS-based recommendation
        if (cls > 0.15) {
            recommendations.push({
                issue: `📱 Content shifts by ${(cls * 100).toFixed(0)}% while loading`,
                plainEnglish: `Your page layout jumps around as it loads. Visitors try to click but things move unexpectedly.`,
                severity: cls > 0.3 ? 'critical' : 'warning',
                simpleSuggestion: 'Images or ads are loading late and pushing content down.',
                actionItems: this.getActionsForMetric('cls', cls)
            });
        }
        
        // TBT-based recommendation
        if (tbt > 0.5) {
            recommendations.push({
                issue: `⏰ Page freezes for ${tbt.toFixed(1)} seconds`,
                plainEnglish: `Your page becomes unresponsive for ${tbt.toFixed(1)} seconds. Visitors click but nothing happens.`,
                severity: tbt > 1 ? 'critical' : 'warning',
                simpleSuggestion: 'Too many JavaScript effects are running at once, blocking the browser.',
                actionItems: this.getActionsForMetric('tbt', tbt)
            });
        }
        
        // Request count recommendation
        if (requests > 80) {
            recommendations.push({
                issue: `📦 ${requests} files downloaded`,
                plainEnglish: `Your page downloads ${requests} separate files. Each file adds download delay.`,
                severity: requests > 120 ? 'critical' : 'warning',
                simpleSuggestion: 'Each JavaScript, CSS, and image file adds download time.',
                actionItems: [
                    'Combine multiple CSS files into one',
                    'Remove unused plugins and scripts',
                    'Use SVG sprites instead of multiple icons'
                ]
            });
        }
        
        // Score-based overall recommendation (fixed syntax)
        if (recommendations.length === 0) {
            if (score >= 90) {
                recommendations.push({
                    issue: '🎉 Excellent performance!',
                    plainEnglish: 'Your ' + score + '/100 score is outstanding! Your website loads very quickly.',
                    severity: 'info',
                    simpleSuggestion: 'Keep maintaining this speed with regular checks.',
                    actionItems: [
                        'Test monthly to catch slowdowns',
                        'Keep images optimized when adding content',
                        'Monitor hosting performance as you grow'
                    ]
                });
            } else if (score >= 70) {
                recommendations.push({
                    issue: '👍 Good but not perfect',
                    plainEnglish: 'Your ' + score + '/100 score is decent. There is room for improvement.',
                    severity: 'info',
                    simpleSuggestion: 'Small optimizations could make your site noticeably faster.',
                    actionItems: [
                        'Compress remaining large images',
                        'Enable browser caching',
                        'Consider a CDN for faster global delivery'
                    ]
                });
            } else {
                recommendations.push({
                    issue: '📊 Multiple areas need improvement',
                    plainEnglish: 'Your ' + score + '/100 score indicates several performance issues.',
                    severity: 'warning',
                    simpleSuggestion: 'Focus on the most impactful fix first - usually reducing image sizes.',
                    actionItems: [
                        'Start with image compression (biggest impact)',
                        'Then enable caching on your server',
                        'Finally consider upgrading hosting'
                    ]
                });
            }
        }
        
        return recommendations;
    }

    getActionsForMetric(metric, value) {
        const actions = {
            lcp: value > 10 ? [
                'Compress your hero image - tools like TinyPNG can reduce size by 70%',
                'Convert images to WebP format (smaller than JPG)',
                'Replace auto-playing video with a static image',
                'Consider lazy-loading below-the-fold images'
            ] : value > 5 ? [
                'Compress images before uploading (use TinyPNG - free)',
                'Resize images to exact dimensions needed (not larger)',
                'Remove unnecessary carousels/sliders',
                'Enable image caching on your server'
            ] : [
                'Compress any remaining large images',
                'Consider using a CDN for faster delivery',
                'Preload your main image with HTML preload tag'
            ],
            ttfb: value > 3 ? [
                'Contact your hosting provider NOW - ask about upgrading',
                'Enable full-page caching (ask a developer)',
                'Consider switching to faster hosting like Cloudways or Kinsta',
                'Install a caching plugin if using WordPress'
            ] : [
                'Contact your hosting provider about server response time',
                'Enable caching plugins or server-side caching',
                'Reduce database queries by optimizing your code',
                'Consider Cloudflare CDN (free tier available)'
            ],
            cls: value > 0.3 ? [
                'Add width and height attributes to ALL images immediately',
                'Reserve space for ads before they load',
                'Avoid inserting content above existing content with JavaScript',
                'Use CSS aspect-ratio boxes for videos'
            ] : [
                'Add explicit width/height to images without them',
                'Reserve space for lazy-loaded content',
                'Avoid dynamically injected content pushing layout',
                'Use transform animations instead of layout-changing ones'
            ],
            tbt: [
                'Remove unnecessary JavaScript plugins',
                'Load non-critical scripts after page loads (defer/lazy load)',
                'Split large JavaScript files into smaller chunks',
                'Consider simplifying complex animations'
            ]
        };
        
        return actions[metric] || [
            'Run another audit after making changes',
            'Test on mobile devices for real-world experience',
            'Monitor regularly to catch new issues'
        ];
    }

    getIntelligentFallback(metrics) {
        const score = metrics.scores?.performance || 0;
        const lcp = (metrics.metrics?.lcp || 0) / 1000;
        const fcp = (metrics.metrics?.fcp || 0) / 1000;
        const ttfb = (metrics.metrics?.ttfb || 0) / 1000;
        const requests = metrics.requests?.total || 0;
        
        let summary = '';
        
        const issues = [];
        if (lcp > 4) issues.push(lcp.toFixed(1) + ' second main content delay');
        if (ttfb > 1.5) issues.push(ttfb.toFixed(1) + ' second server delay');
        if (requests > 100) issues.push(requests + ' separate files');
        
        if (issues.length > 0) {
            summary = 'Your website faces ' + issues.length + ' critical performance issues: ' + issues.join(', ') + '. ';
            summary += 'With a score of ' + score + '/100, visitors will likely experience ';
            
            if (lcp > 8) {
                summary += 'frustrating ' + lcp.toFixed(1) + ' second delays before seeing anything useful. About 70% of visitors may leave before your content loads. ';
            } else if (lcp > 4) {
                summary += 'noticeable ' + lcp.toFixed(1) + ' second delays. Many visitors will grow impatient. ';
            } else {
                summary += 'some delays. There is clear room for improvement. ';
            }
            
            summary += 'The main bottleneck appears to be ' + (lcp > ttfb ? 'large images and files' : 'server response time') + '. ';
            summary += 'Your page downloads ' + requests + ' separate resources - each one adds download time. ';
        } else if (score >= 90) {
            summary = 'Excellent work! Your ' + lcp.toFixed(1) + ' second load time and ' + score + '/100 score indicate a well-optimized website. ';
            summary += 'Visitors will have a smooth, fast experience. Your server responds in ' + ttfb.toFixed(1) + ' seconds. ';
            summary += 'Keep maintaining this speed with regular checks as you add content.';
        } else if (score >= 70) {
            summary = 'Pretty good! Your ' + score + '/100 score is above average, but there is room for improvement. ';
            summary += 'Your main content appears in ' + lcp.toFixed(1) + ' seconds. ';
            summary += 'With ' + requests + ' files downloading, simplifying your page could make it even faster.';
        } else {
            summary = 'Performance needs attention. Your ' + score + '/100 score means visitors experience significant delays. ';
            summary += 'The main content takes ' + lcp.toFixed(1) + ' seconds to appear - ';
            summary += 'most users expect this in under 2 seconds. ';
            if (requests > 80) {
                summary += 'With ' + requests + ' files, ';
            }
            summary += 'Start by compressing large images and enabling caching.';
        }
        
        return {
            summary: summary,
            simpleSummary: summary.substring(0, 300),
            recommendations: this.generateDynamicRecommendations(metrics),
            generatedAt: new Date().toISOString(),
            note: 'Analysis based on your metrics'
        };
    }
}

module.exports = new DeepSeekService();