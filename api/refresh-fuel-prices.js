/**
 * Cron Job: Refreshes fuel prices from NSW API daily
 * Scheduled to run once per day via vercel.json
 */

import { get } from '@vercel/edge-config';

export default async function handler(req, res) {
  // Security: Verify this is a legitimate cron request from Vercel
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.log('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🔄 Cron job started: Refreshing fuel prices...');

  try {
    const apiKey = process.env.NSW_API_KEY;
    const apiSecret = process.env.NSW_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('NSW API credentials not configured');
    }

    // Step 1: Get OAuth access token using Authorization header
    console.log('🔐 Getting OAuth access token...');
    const authHeader = process.env.NSW_AUTH_HEADER;
    const tokenResponse = await fetch('https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials', {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    const tokenText = await tokenResponse.text();
    console.log('🔍 OAuth response status:', tokenResponse.status);
    console.log('🔍 OAuth response (first 200 chars):', tokenText.substring(0, 200));

    if (!tokenResponse.ok) {
      console.error('❌ OAuth token error:', tokenText);
      throw new Error(`Failed to get OAuth token: ${tokenResponse.status} - ${tokenText}`);
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (parseError) {
      console.error('❌ Failed to parse OAuth response as JSON:', tokenText);
      throw new Error(`OAuth response is not valid JSON: ${tokenText.substring(0, 100)}`);
    }

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token in OAuth response');
    }

    console.log('✅ Access token obtained');

    // Step 2: Generate current timestamp in required format: dd/MM/yyyy hh:mm:ss AM/PM
    const now = new Date();
    const day = String(now.getUTCDate()).padStart(2, '0');
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const year = now.getUTCFullYear();
    const hours = now.getUTCHours();
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const timestamp = `${day}/${month}/${year} ${String(hours12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;

    // Generate unique transaction ID
    const transactionId = `cron-${Date.now()}`;

    console.log('🔍 Request info:');
    console.log('  - Transaction ID:', transactionId);
    console.log('  - Timestamp:', timestamp);

    // Step 3: Call NSW FuelCheck API with Bearer token
    console.log('📡 Fetching data from NSW FuelCheck API...');
    const response = await fetch('https://api.onegov.nsw.gov.au/FuelPriceCheck/v1/fuel/prices', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
        'apikey': apiKey,
        'transactionid': transactionId,
        'requesttimestamp': timestamp
      }
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      // Get the error response body for debugging
      const errorText = await response.text();
      console.error('❌ NSW API error response:', errorText);
      throw new Error(`NSW API returned status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📊 Received ${data.prices?.length || 0} prices from ${data.stations?.length || 0} stations`);

    // Calculate average prices for today
    const todaysPrices = calculateAveragePrices(data);
    console.log('💰 Calculated average prices:', todaysPrices);

    // Update Edge Config with historical data and averages
    const priceData = await updateEdgeConfigWithHistory(todaysPrices);

    console.log('✅ Fuel prices refreshed successfully!');
    console.log(`📈 30-day avg: Unleaded ${priceData.averages.last30Days.unleaded?.toFixed(1)}c, Premium ${priceData.averages.last30Days.premium?.toFixed(1)}c, Diesel ${priceData.averages.last30Days.diesel?.toFixed(1)}c`);

    return res.status(200).json({
      success: true,
      message: 'Fuel prices refreshed successfully',
      data: priceData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Calculate median prices for each fuel type from NSW API data
 */
function calculateAveragePrices(data) {
  const fuelTypes = {
    'U91': [],  // Unleaded 91
    'P95': [],  // Premium 95
    'P98': [],  // Premium 98
    'DL': [],   // Diesel
    'E10': []   // E10 Ethanol
  };

  // NSW API returns prices in a separate array at top level
  // Structure: { stations: [...], prices: [{stationcode, fueltype, price, lastupdated}, ...] }
  const prices = data.prices || [];

  prices.forEach(priceItem => {
    const fuelType = priceItem.fueltype;
    const price = parseFloat(priceItem.price);

    if (fuelTypes.hasOwnProperty(fuelType) && !isNaN(price) && price > 0) {
      fuelTypes[fuelType].push(price);
    }
  });

  // Calculate median (better than average to avoid outliers)
  const calculateMedian = (arr) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  return {
    unleaded: calculateMedian([...fuelTypes['U91'], ...fuelTypes['E10']]), // Combine regular unleaded
    premium: calculateMedian([...fuelTypes['P95'], ...fuelTypes['P98']]),
    diesel: calculateMedian(fuelTypes['DL']),
    lastUpdated: new Date().toISOString(),
    dataPoints: {
      unleaded: fuelTypes['U91'].length + fuelTypes['E10'].length,
      premium: fuelTypes['P95'].length + fuelTypes['P98'].length,
      diesel: fuelTypes['DL'].length
    }
  };
}

/**
 * Update Edge Config with historical prices and calculate averages
 * Maintains up to 30 days of history (reduced to stay within size limits)
 * Uses SDK for reading, Management API for writing (SDK is read-only)
 */
async function updateEdgeConfigWithHistory(todaysPrices) {
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const vercelToken = process.env.VERCEL_TOKEN;

  // These are needed for writing via Management API
  if (!edgeConfigId || !vercelToken) {
    console.warn('⚠️ Edge Config write credentials not configured, using fallback storage');
    // Return a simple structure for testing without Edge Config
    return {
      latest: todaysPrices,
      averages: {
        last7Days: todaysPrices,
        last30Days: todaysPrices
      },
      history: [],
      lastUpdated: new Date().toISOString()
    };
  }

  // Step 1: Read existing data from Edge Config using SDK (same as other endpoints)
  console.log('📖 Reading existing price history...');
  let existingData = null;
  try {
    existingData = await get('fuel_prices');
    if (existingData) {
      console.log(`📚 Found ${existingData?.history?.length || 0} days of existing history`);
    } else {
      console.log('ℹ️ No existing history found, starting fresh');
    }
  } catch (error) {
    console.error('⚠️ Error reading existing history:', error.message);
    console.log('ℹ️ Will start with empty history');
  }

  // Step 2: Build history array
  // Note: Vercel Management API returns { key, value, ... } so data is in .value
  let history = existingData?.value?.history || [];

  // Add today's prices to history (without dataPoints to save space)
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const todayEntry = {
    date: today,
    unleaded: todaysPrices.unleaded,
    premium: todaysPrices.premium,
    diesel: todaysPrices.diesel
    // Note: dataPoints excluded from history to reduce size
  };

  // Check if today's entry already exists (in case cron runs multiple times)
  const existingTodayIndex = history.findIndex(entry => entry.date === today);
  if (existingTodayIndex >= 0) {
    // Update existing entry for today
    history[existingTodayIndex] = todayEntry;
    console.log('🔄 Updated today\'s price entry');
  } else {
    // Add new entry
    history.push(todayEntry);
    console.log('➕ Added new price entry for today');
  }

  // Sort by date (newest first) and keep only last 30 days
  history.sort((a, b) => new Date(b.date) - new Date(a.date));
  history = history.slice(0, 30);

  // Step 3: Calculate averages
  const averages = calculateAverages(history);
  console.log(`📊 Calculated averages from ${history.length} days of data`);

  // Step 4: Build final data structure
  const priceData = {
    latest: todaysPrices,
    averages: averages,
    history: history,
    lastUpdated: new Date().toISOString()
  };

  // Step 5: Write to Edge Config
  const response = await fetch(
    `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [
          {
            operation: 'upsert',
            key: 'fuel_prices',
            value: priceData
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update Edge Config: ${error}`);
  }

  console.log('✅ Edge Config updated successfully with historical data');

  return priceData;
}

/**
 * Calculate 7-day and 30-day averages from history
 */
function calculateAverages(history) {
  const calculate = (days) => {
    const subset = history.slice(0, Math.min(days, history.length));

    if (subset.length === 0) {
      return { unleaded: null, premium: null, diesel: null };
    }

    const sum = subset.reduce((acc, entry) => ({
      unleaded: acc.unleaded + (entry.unleaded || 0),
      premium: acc.premium + (entry.premium || 0),
      diesel: acc.diesel + (entry.diesel || 0),
      count: acc.count + 1
    }), { unleaded: 0, premium: 0, diesel: 0, count: 0 });

    return {
      unleaded: sum.count > 0 ? sum.unleaded / sum.count : null,
      premium: sum.count > 0 ? sum.premium / sum.count : null,
      diesel: sum.count > 0 ? sum.diesel / sum.count : null
    };
  };

  return {
    last7Days: calculate(7),
    last30Days: calculate(30)
  };
}
