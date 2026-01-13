/**
 * One-time script to populate Edge Config with 90 days of dummy fuel price data
 * Run this manually via: https://your-app.vercel.app/api/populate-dummy-data?secret=YOUR_CRON_SECRET
 *
 * This creates realistic price data with:
 * - Weekly price cycles (mimicking Australian fuel price cycles)
 * - Gradual trends over time
 * - Random daily variations
 */

export default async function handler(req, res) {
  // Security: Require secret parameter
  const secret = req.query.secret;
  const cronSecret = process.env.CRON_SECRET;

  if (secret !== cronSecret) {
    console.log('Unauthorized dummy data request');
    return res.status(401).json({ error: 'Unauthorized - include ?secret=YOUR_CRON_SECRET' });
  }

  console.log('🎲 Generating 90 days of dummy fuel price data...');

  try {
    // Generate 90 days of historical data
    const history = generateDummyHistory(90);

    // Calculate averages
    const averages = calculateAverages(history);

    // Structure matches real data
    const priceData = {
      latest: history[0], // Most recent entry
      averages: averages,
      history: history,
      lastUpdated: new Date().toISOString()
    };

    // Write to Edge Config
    await updateEdgeConfig(priceData);

    console.log('✅ Dummy data populated successfully!');

    return res.status(200).json({
      success: true,
      message: 'Dummy data populated successfully',
      data: {
        daysGenerated: history.length,
        latest: priceData.latest,
        averages: priceData.averages
      }
    });

  } catch (error) {
    console.error('❌ Error populating dummy data:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generate realistic fuel price history with weekly cycles
 */
function generateDummyHistory(days) {
  const history = [];
  const today = new Date();

  // Base prices (realistic NSW averages)
  const baseUnleaded = 182;
  const basePremium = 205;
  const baseDiesel = 195;

  // Price cycle parameters (Australian fuel price cycles are typically 7 days)
  const cyclePeriod = 7; // days
  const cycleAmplitude = 15; // cents variation in the cycle

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    // Calculate position in weekly cycle (0 to 1)
    const cyclePosition = (i % cyclePeriod) / cyclePeriod;

    // Sine wave for weekly price cycle (peaks mid-week, troughs on weekends)
    const cycleEffect = Math.sin(cyclePosition * 2 * Math.PI) * cycleAmplitude;

    // Gradual long-term trend (slight increase over 90 days)
    const trendEffect = (i / days) * -5; // Prices were slightly lower 90 days ago

    // Random daily variation (±3 cents)
    const randomVariation = () => (Math.random() - 0.5) * 6;

    // Calculate prices with all effects
    const unleaded = parseFloat((baseUnleaded + cycleEffect + trendEffect + randomVariation()).toFixed(1));
    const premium = parseFloat((basePremium + cycleEffect + trendEffect + randomVariation()).toFixed(1));
    const diesel = parseFloat((baseDiesel + cycleEffect * 0.8 + trendEffect + randomVariation()).toFixed(1));

    history.push({
      date: dateString,
      unleaded: unleaded,
      premium: premium,
      diesel: diesel,
      dataPoints: {
        unleaded: Math.floor(1200 + Math.random() * 300), // Random number of stations
        premium: Math.floor(800 + Math.random() * 200),
        diesel: Math.floor(1000 + Math.random() * 250)
      }
    });
  }

  return history;
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

/**
 * Update Edge Config with dummy data
 */
async function updateEdgeConfig(priceData) {
  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const vercelToken = process.env.VERCEL_TOKEN;

  if (!edgeConfigId || !vercelToken) {
    console.warn('⚠️ Edge Config not configured');
    console.log('📊 Dummy data (would be written to Edge Config):');
    console.log(JSON.stringify(priceData, null, 2));
    return;
  }

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

  console.log('✅ Edge Config updated successfully with dummy data');
}
