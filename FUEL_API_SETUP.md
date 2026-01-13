# NSW Fuel Price API Integration - Setup Guide

This guide explains how to integrate real-time NSW fuel prices into the Vehicle Diffenterator using Vercel cron jobs.

## 📚 What Are Cron Jobs?

**Cron jobs** are scheduled tasks that run automatically at specified times. Think of them like setting an alarm clock for your code.

### How They Work

```
┌──────────────── minute (0-59)
│ ┌────────────── hour (0-23)
│ │ ┌──────────── day of month (1-31)
│ │ │ ┌────────── month (1-12)
│ │ │ │ ┌──────── day of week (0-7, Sunday = 0 or 7)
│ │ │ │ │
* * * * *
```

**Examples:**
- `0 6 * * *` = Every day at 6:00 AM
- `0 */4 * * *` = Every 4 hours
- `0 9 * * 1` = Every Monday at 9:00 AM
- `30 14 * * *` = Every day at 2:30 PM

### Our Setup

We're using `0 6 * * *` which means:
- ✅ Runs **once per day** at 6:00 AM (fits Hobby plan limit)
- 🔄 Fetches fresh fuel prices from NSW API
- 💾 Caches them in Edge Config
- 🚀 All users get fast, cached prices for the day

## 🎯 Architecture Overview

```
User loads page
    ↓
Frontend calls /api/fuel-prices
    ↓
API returns cached prices (fast!)
    ↓
Prices displayed in calculator

Meanwhile, once per day at 6 AM:
    ↓
Cron job calls /api/refresh-fuel-prices
    ↓
Fetches from NSW FuelCheck API
    ↓
Calculates median prices
    ↓
Stores in Edge Config cache
```

## 🚀 Setup Instructions

### Step 1: Register for NSW FuelCheck API

1. Go to https://api.nsw.gov.au/Product/Index/22
2. Click "Register" or "Sign In"
3. Create an account
4. Subscribe to the Fuel API (free tier)
5. You'll receive:
   - **API Key** (Consumer Key)
   - **API Secret** (Consumer Secret)

### Step 2: Set Up Vercel Edge Config

1. Go to your Vercel project dashboard
2. Click **Storage** tab
3. Click **Create** → Select **Edge Config**
4. Name it: `fuel-prices-cache`
5. Click **Create**

Vercel automatically adds `EDGE_CONFIG` environment variable to your project.

### Step 3: Get Edge Config ID

1. In Vercel Dashboard → **Storage** → Click your Edge Config
2. Go to **Settings** tab
3. Copy the **Edge Config ID** (starts with `ecfg_`)
4. Save this for Step 5

### Step 4: Create Vercel API Token

1. Go to https://vercel.com/account/tokens
2. Click **Create Token**
3. Name it: `Fuel Price Updater`
4. Under **Scope**, select your project
5. Under **Permissions**, ensure it has Edge Config read/write access
6. Click **Create**
7. Copy the token (you won't see it again!)

### Step 5: Set Environment Variables in Vercel

Go to your project → **Settings** → **Environment Variables**

Add these variables for **all environments** (Production, Preview, Development):

| Name | Value | Where to Get It |
|------|-------|----------------|
| `NSW_API_KEY` | Your API key | From NSW API registration (Step 1) |
| `NSW_API_SECRET` | Your API secret | From NSW API registration (Step 1) |
| `CRON_SECRET` | Random string | Generate: `openssl rand -base64 32` in terminal |
| `EDGE_CONFIG_ID` | Your Edge Config ID | From Edge Config settings (Step 3) |
| `VERCEL_TOKEN` | Your Vercel token | From token creation (Step 4) |

> **Note:** `EDGE_CONFIG` is automatically added when you create Edge Config

### Step 6: Deploy to Vercel

```bash
# Commit the new files
git add .
git commit -m "Add NSW fuel price API integration with cron job"
git push
```

Vercel will automatically deploy and set up the cron job!

### Step 7: Populate Initial Data

You have two options to get started with fuel price data:

#### Option A: Use Dummy Data (Recommended for Testing)

This populates 30 days of realistic dummy data so you can immediately see all features (trends, charts, averages):

**Via Browser:**
```
https://your-app.vercel.app/api/populate-dummy-data?secret=your_cron_secret
```

**Via Terminal:**
```bash
curl "https://your-app.vercel.app/api/populate-dummy-data?secret=your_cron_secret"
```

This generates:
- 30 days of historical price data
- Realistic weekly price cycles (mimicking Australian fuel markets)
- Random daily variations
- Calculated 7-day and 30-day averages
- Optimized to stay within Edge Config size limits

You can replace this with real data anytime by running the actual refresh (Option B).

#### Option B: Fetch Real Data from NSW API

This fetches current real prices (but no history until the cron runs daily):

**Via Browser:**
```
https://your-app.vercel.app/api/refresh-fuel-prices
```
Add header: `Authorization: Bearer your_cron_secret`

**Via Terminal:**
```bash
curl -X GET "https://your-app.vercel.app/api/refresh-fuel-prices" \
  -H "Authorization: Bearer your_cron_secret"
```

Replace:
- `your-app` with your Vercel project URL
- `your_cron_secret` with the `CRON_SECRET` you set

You should see a success response with fuel prices.

**Note:** With Option B, historical features (trends, averages) will only work after the cron job has run for 7-30 days. Use Option A to see everything working immediately!

## 🧪 Testing

### Test the API Endpoint

Visit: `https://your-app.vercel.app/api/fuel-prices`

Expected response:
```json
{
  "unleaded": 182.5,
  "premium": 205.3,
  "diesel": 195.7,
  "lastUpdated": "2024-01-12T06:00:00.000Z",
  "dataPoints": {
    "unleaded": 1250,
    "premium": 890,
    "diesel": 1100
  }
}
```

### Check Cron Job Logs

1. Vercel Dashboard → Your Project
2. Click **Deployments**
3. Find the cron job execution
4. Click **View Function Logs**

Look for:
```
🔄 Cron job started: Refreshing fuel prices...
📡 Fetching data from NSW FuelCheck API...
📊 Received data from 2500 stations
💰 Calculated average prices: {...}
✅ Fuel prices refreshed successfully!
```

### Frontend Testing

1. Open your fuel calculator page
2. Open browser DevTools (F12) → Console
3. Refresh the page
4. Look for:
```
🔍 Fetching real fuel prices...
✅ Received fuel prices: {...}
   Unleaded: 182.5c/L
   Premium: 205.3c/L
   Diesel: 195.7c/L
   Last updated: Fri, Jan 12, 6:00 AM
```

## 📊 Monitoring

### Vercel Dashboard

Check cron job execution:
1. Go to your project
2. **Functions** tab
3. Find `/api/refresh-fuel-prices`
4. View execution history and logs

### API Usage

Monitor your NSW API usage at:
https://api.nsw.gov.au/

Free tier limits:
- ✅ 2,500 calls/month
- ✅ 5 calls/minute

With daily cron: **30 calls/month** (well within limits!)

## 🔧 Troubleshooting

### Prices Not Updating

**Check:**
1. Edge Config has data: Vercel → Storage → Edge Config → Browse Items
2. Cron job is running: Vercel → Functions → View logs
3. Environment variables are set correctly

**Solutions:**
- Manually trigger the cron job (Step 7)
- Check function logs for errors
- Verify API credentials are correct

### "Fuel prices not yet available" Error

This means Edge Config is empty. The cron hasn't run yet.

**Fix:** Manually trigger the refresh endpoint (Step 7)

### Cron Job Failing

Common issues:
- ❌ Invalid NSW API credentials → Check `NSW_API_KEY` and `NSW_API_SECRET`
- ❌ Edge Config write failed → Check `EDGE_CONFIG_ID` and `VERCEL_TOKEN`
- ❌ Unauthorized → Check `CRON_SECRET` matches

## 📝 Understanding the Code

### File Structure

```
Vehicle Diffenterator/
├── api/
│   ├── fuel-prices.js           # Read cached prices (called by frontend)
│   └── refresh-fuel-prices.js   # Cron job to update prices (runs daily)
├── fuel-cost-calculator.js      # Updated with fetchRealFuelPrices()
├── vercel.json                  # Cron job schedule configuration
├── package.json                 # Dependencies (@vercel/edge-config)
└── .env.example                 # Environment variable template
```

### How It Works

1. **Cron Schedule** (`vercel.json`):
   ```json
   {
     "crons": [{
       "path": "/api/refresh-fuel-prices",
       "schedule": "0 6 * * *"
     }]
   }
   ```
   Vercel automatically calls this endpoint daily at 6 AM.

2. **Refresh Function** (`api/refresh-fuel-prices.js`):
   - Fetches from NSW API
   - Calculates median prices (median is better than average - avoids outliers)
   - Stores in Edge Config

3. **Read Function** (`api/fuel-prices.js`):
   - Reads from Edge Config (fast!)
   - Returns cached prices
   - Includes fallback for errors

4. **Frontend** (`fuel-cost-calculator.js`):
   - Calls `/api/fuel-prices` on page load
   - Updates input fields
   - Falls back to defaults if API fails

## 🎓 Learning Resources

**Cron Expressions:**
- https://crontab.guru/ (interactive cron builder)

**Vercel Cron Jobs:**
- https://vercel.com/docs/cron-jobs

**NSW Fuel API:**
- https://api.nsw.gov.au/Product/Index/22

## 📊 Historical Data & Price Trends (NEW!)

The system now includes advanced price tracking features:

### Features

**1. 30-Day Price History**
- Automatically stores last 30 days of fuel prices
- One daily snapshot at 6 AM
- Survives across deployments (stored in Edge Config)
- Optimized to stay within Edge Config size limits

**2. Price Averaging**
Users can choose between:
- **Latest** - Today's median prices (default)
- **30-Day Average** - Long-term baseline pricing

**3. Trend Indicators**
- Shows price changes over last 7 days
- Color-coded: 🔴 Red (increase) | 🟢 Green (decrease)
- Displays both absolute change (¢) and percentage

**4. Price Trend Chart**
- Visual 30-day sparkline chart
- Shows all three fuel types
- Helps users understand price cycles

### How It Works

```
Day 1: Cron runs → Stores today's prices
Day 2-29: Cron runs → Stores each day's prices, builds history
Day 30: Full 30-day averaging available, maximum history reached
Day 31+: Oldest day dropped as new data is added (rolling 30-day window)
```

### Data Structure

```json
{
  "latest": {
    "unleaded": 182.5,
    "premium": 205.3,
    "diesel": 195.7,
    "dataPoints": { "unleaded": 1250, "premium": 890, "diesel": 1100 }
  },
  "averages": {
    "last30Days": { "unleaded": 185.4, "premium": 207.8, "diesel": 197.2 }
  },
  "history": [
    { "date": "2026-01-13", "unleaded": 182.5, "premium": 205.3, "diesel": 195.7 },
    { "date": "2026-01-12", "unleaded": 183.1, "premium": 206.0, "diesel": 196.2 },
    // ... up to 30 days (dataPoints excluded from history to save space)
  ],
  "lastUpdated": "2026-01-13T06:00:00.000Z"
}
```

### Testing with Dummy Data

Use `/api/populate-dummy-data?secret=YOUR_SECRET` to generate 30 days of realistic data:
- Mimics Australian weekly price cycles (7-day peaks and troughs)
- Includes random daily variations (±3¢)
- Gradual long-term trends
- Instant access to all features without waiting
- Optimized to stay within Edge Config size limits

## 💡 Future Enhancements

Ideas to expand this:
- 📍 **Location-based pricing**: Use NSW API's location endpoint for suburb-specific prices
- 🔔 **Price alerts**: Notify users when prices drop below threshold
- ⚡ **Electricity prices**: Add real-time electricity pricing for EVs
- 🗺️ **Cheapest nearby**: Show map of cheapest fuel stations
- 📧 **Weekly reports**: Email summary of price trends

## ❓ Questions?

- **Why use median instead of average?** Median is less affected by outliers (e.g., one station with crazy high/low price)
- **Why Edge Config instead of a database?** Edge Config is free, globally distributed, and perfect for read-heavy data
- **Can I change the schedule?** Yes! Edit `vercel.json`, but Hobby plan only allows once/day
- **What if NSW API changes?** The `calculateAveragePrices()` function may need adjusting based on actual response format

---

Made with ☕ for the Vehicle Diffenterator project
