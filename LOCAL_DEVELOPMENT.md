# Local Development Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

### 3. Open in Browser
The server will start on `http://localhost:3000`

Visit:
- **Fuel Calculator**: http://localhost:3000/fuel-cost-calculator.html
- **Main Page**: http://localhost:3000/index.html
- **Vehicle Overview**: http://localhost:3000/vehicle-overview.html

## What's Included

The local development server (`server.js`) provides:

✅ **Static File Serving** - All HTML, CSS, JS, and JSON files
✅ **Mock Fuel Prices API** - Generates realistic price data with 30-day history
✅ **Auto-reload** - Just refresh the browser to see changes

## Mock Fuel Price Data

The local server serves static mock fuel price data from `data/fuel-prices-mock.json` that includes:
- Latest prices for Unleaded, Premium, and Diesel
- 7-day and 30-day averages
- 30 days of historical price trends showing realistic Australian fuel price cycles
- Consistent data that mimics the typical Sydney fuel price cycle pattern (prices drop gradually, then spike back up)

This allows you to test the fuel price chart and all pricing features without needing the actual NSW FuelCheck API.

### Customizing the Mock Data

To customize the fuel prices:
1. Edit `data/fuel-prices-mock.json`
2. Refresh your browser - no need to restart the server
3. The server will automatically serve your updated data

## Making Changes

1. Edit any HTML, CSS, or JavaScript files
2. Refresh your browser to see the changes
3. The server will continue running - no need to restart

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Troubleshooting

### Port 3000 Already in Use
If port 3000 is already in use, you can change it by editing `server.js`:
```javascript
const PORT = 3001; // Change to any available port
```

### Module Not Found
Make sure you've run `npm install` first to install Express.

### Cannot Find Files
Make sure you're running the server from the project root directory where `server.js` is located.
