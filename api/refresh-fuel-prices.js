/**
 * Cron Job: Refreshes fuel prices from NSW API daily
 * Scheduled to run once per day via vercel.json
 */

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

    // Calculate average prices
    const prices = calculateAveragePrices(data);
    console.log('💰 Calculated average prices:', prices);

    // Store in Edge Config
    await updateEdgeConfig(prices);

    console.log('✅ Fuel prices refreshed successfully!');

    return res.status(200).json({
      success: true,
      message: 'Fuel prices refreshed successfully',
      prices: prices,
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
 * Update Edge Config with new prices
 * Uses Vercel's Management API since Edge Config doesn't have a write SDK
 */
async function updateEdgeConfig(prices) {
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const vercelToken = process.env.VERCEL_TOKEN;

  if (!edgeConfigId || !vercelToken) {
    console.warn('⚠️ Edge Config not configured, using fallback storage');
    // Fallback: You could write to a GitHub Gist or other storage here
    return;
  }

  // Update Edge Config via Vercel API
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
            value: prices
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update Edge Config: ${error}`);
  }

  console.log('✅ Edge Config updated successfully');
}
