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

    // Encode API credentials for Basic auth
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    // Try calling NSW FuelCheck API directly with Basic auth
    console.log('📡 Fetching data from NSW FuelCheck API...');
    const response = await fetch('https://api.onegov.nsw.gov.au/FuelPriceCheck/v1/fuel/prices', {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'apikey': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`NSW API returned status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📊 Received data from ${data.stations?.length || 0} stations`);

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

  // Parse NSW API response structure
  // Adjust this based on actual API response format
  const stations = data.stations || data.prices || [];

  stations.forEach(station => {
    const prices = station.prices || [];
    prices.forEach(priceItem => {
      const fuelType = priceItem.fueltype || priceItem.fuel_type;
      const price = parseFloat(priceItem.price);

      if (fuelTypes.hasOwnProperty(fuelType) && !isNaN(price) && price > 0) {
        fuelTypes[fuelType].push(price);
      }
    });
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
