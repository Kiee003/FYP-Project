const chromeLauncher = require('chrome-launcher');

async function testChrome() {
    console.log('🔍 Testing Chrome installation...');
    
    try {
        // Try to launch Chrome with minimal flags
        const chrome = await chromeLauncher.launch({
            chromeFlags: ['--headless', '--no-sandbox']
        });
        
        console.log('✅ Chrome launched successfully on port:', chrome.port);
        console.log('✅ Chrome PID:', chrome.pid);
        
        // Test if it's responsive
        const response = await fetch(`http://localhost:${chrome.port}/json/version`);
        const data = await response.json();
        console.log('✅ Chrome version:', data.Browser);
        
        // Close it
        await chrome.kill();
        console.log('✅ Chrome closed successfully');
        
        return true;
    } catch (error) {
        console.error('❌ Chrome test failed:', error.message);
        return false;
    }
}

testChrome();