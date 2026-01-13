# Quick Start: Populating Dummy Fuel Price Data

This guide helps you quickly populate 90 days of realistic fuel price data to test all the new historical features.

## Why Use Dummy Data?

The new fuel price features include:
- 📊 **90-day price history**
- 📈 **7-day and 30-day averages**
- 📉 **Price trend indicators**
- 📊 **Visual trend charts**

Without dummy data, these features would take 7-30 days to become useful as the cron job builds up history. With dummy data, you can see everything working immediately!

## How to Populate Dummy Data

### Step 1: Deploy Your App

Make sure your app is deployed to Vercel with all environment variables set (see FUEL_API_SETUP.md).

### Step 2: Run the Dummy Data Script

**Option A - Via Browser:**

Navigate to:
```
https://your-app.vercel.app/api/populate-dummy-data?secret=YOUR_CRON_SECRET
```

Replace:
- `your-app` with your actual Vercel project URL
- `YOUR_CRON_SECRET` with the value of your `CRON_SECRET` environment variable

**Option B - Via Terminal:**

```bash
curl "https://your-app.vercel.app/api/populate-dummy-data?secret=YOUR_CRON_SECRET"
```

### Step 3: Verify It Worked

You should see a response like:
```json
{
  "success": true,
  "message": "Dummy data populated successfully",
  "data": {
    "daysGenerated": 90,
    "latest": {
      "unleaded": 182.5,
      "premium": 205.3,
      "diesel": 195.7
    },
    "averages": {
      "last7Days": {
        "unleaded": 183.2,
        "premium": 206.1,
        "diesel": 196.3
      },
      "last30Days": {
        "unleaded": 185.4,
        "premium": 207.8,
        "diesel": 197.2
      }
    }
  }
}
```

### Step 4: Check the Fuel Calculator

Visit your fuel calculator page and you should now see:
- ✅ Price period selector (Latest / 7-Day / 30-Day)
- ✅ Trend indicators showing price changes with arrows and percentages
- ✅ 30-day price trend chart
- ✅ Updated fuel prices based on selected period

## What the Dummy Data Includes

The generated data mimics real Australian fuel price behavior:

1. **Weekly Price Cycles** - Australian fuel prices typically follow a 7-day cycle:
   - Prices lowest on weekends
   - Gradual increase through the week
   - Peak mid-week
   - Drop again before weekend

2. **Daily Variations** - Random ±3¢ changes day-to-day

3. **Long-term Trends** - Gradual price changes over the 90-day period

4. **Realistic Prices** - Based on typical NSW fuel prices:
   - Unleaded: ~182¢/L
   - Premium: ~205¢/L
   - Diesel: ~195¢/L

## Switching to Real Data

Once you're ready to use real NSW FuelCheck data, simply run the real refresh endpoint:

```bash
curl -X GET "https://your-app.vercel.app/api/refresh-fuel-prices" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

This will replace the dummy data with real current prices. The cron job will then build real history over time.

## Troubleshooting

**"Unauthorized" Error:**
- Make sure you're using the correct `CRON_SECRET` value
- Check that the secret is included in the URL query parameter

**"Edge Config not configured" Warning:**
- The script will still run but just print the data instead of saving it
- Set up `EDGE_CONFIG_ID` and `VERCEL_TOKEN` environment variables
- See FUEL_API_SETUP.md for full setup instructions

**No data showing on frontend:**
- Clear your browser cache
- Check browser console for errors
- Verify `/api/fuel-prices` endpoint returns data

## Next Steps

- Experiment with different price periods (Latest / 7-Day / 30-Day)
- Watch how the trend indicators show price movements
- Check the trend chart to see price cycles
- Let the daily cron job run to see how it maintains the history

Enjoy your enhanced fuel price tracking! 🚗⛽📊
