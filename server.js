/**
 * Local Development Server
 * Serves static files and provides mock fuel price API
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Mock fuel prices API endpoint
app.get('/api/fuel-prices', (req, res) => {
    console.log('📞 Fuel prices API called (local mock)');

    try {
        // Read static mock data from JSON file
        const mockDataPath = path.join(__dirname, 'data', 'fuel-prices-mock.json');
        const priceData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

        console.log('✅ Returning static mock prices');
        console.log(`📊 Data includes: ${priceData.history.length} days of history`);
        console.log(`💰 Latest unleaded: ${priceData.latest.unleaded}¢/L`);

        res.setHeader('Content-Type', 'application/json');
        res.json(priceData);
    } catch (error) {
        console.error('❌ Error reading mock data:', error);
        res.status(500).json({
            error: 'Failed to load fuel price data',
            message: error.message
        });
    }
});

// Catch all route - serve index.html for any other route
app.get('*', (req, res) => {
    if (req.path.endsWith('.html') || req.path === '/') {
        res.sendFile(path.join(__dirname, req.path.endsWith('.html') ? req.path : 'index.html'));
    } else {
        res.status(404).send('Not found');
    }
});

app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Local development server started!');
    console.log('');
    console.log(`📍 Server running at: http://localhost:${PORT}`);
    console.log('');
    console.log('Available pages:');
    console.log(`   • Fuel Calculator: http://localhost:${PORT}/fuel-cost-calculator.html`);
    console.log(`   • Main Page: http://localhost:${PORT}/index.html`);
    console.log(`   • Vehicle Overview: http://localhost:${PORT}/vehicle-overview.html`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('');
});
