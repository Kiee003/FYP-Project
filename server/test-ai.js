require('dotenv').config();
const deepseekService = require('./deepseekService');

async function testDeepSeek() {
    console.log('========================================');
    console.log('Testing DeepSeek AI Integration');
    console.log('========================================\n');
    
    console.log('API Key present?', !!process.env.DEEPSEEK_API_KEY);
    if (process.env.DEEPSEEK_API_KEY) {
        console.log('API Key length:', process.env.DEEPSEEK_API_KEY.length);
        console.log('API Key preview:', process.env.DEEPSEEK_API_KEY.substring(0, 10) + '...');
    }
    
    console.log('\n📊 Testing with mock slow website data...\n');
    
    const mockSlowMetrics = {
        url: 'https://slow-website.example.com',
        scores: { performance: 35 },
        metrics: { lcp: 8500, fcp: 4200, ttfb: 2100, cls: 0.35, tbt: 1200 },
        requests: { total: 185 }
    };
    
    const result = await deepseekService.generateInsights(mockSlowMetrics, 'https://slow-website.example.com');
    
    console.log('\n📝 AI RESPONSE:');
    console.log('========================================');
    console.log('SUMMARY:');
    console.log(result.summary);
    console.log('\nRECOMMENDATIONS:');
    console.log(JSON.stringify(result.recommendations, null, 2));
    console.log('========================================');
    
    if (result.rawAIResponse) {
        console.log('\n✅ AI was called successfully!');
    } else if (result.note) {
        console.log('\n⚠️ Using fallback mode. Check your API key.');
    }
}

testDeepSeek();