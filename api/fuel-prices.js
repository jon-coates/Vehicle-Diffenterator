/**
 * API Endpoint: Get cached fuel prices with historical data
 * Returns prices that were cached by the daily cron job
 * Includes latest, 7-day average, 30-day average, and full history
 */

import { get } from '@vercel/edge-config';

export default async function handler(req, res) {
  try {
    console.log('📞 Fuel prices API called');

    // Read cached prices from Edge Config
    const priceData = await get('fuel_prices');

    if (!priceData) {
      console.log('⚠️ No cached prices found');
      return res.status(503).json({
        error: 'Fuel prices not yet available',
        message: 'Prices are being fetched. Please try again in a few minutes.'
      });
    }

    console.log('✅ Returning cached prices from:', priceData.lastUpdated);
    console.log(`📊 Data includes: ${priceData.history?.length || 0} days of history`);

    // Add cache headers (cache for 1 hour on CDN)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    return res.status(200).json(priceData);

  } catch (error) {
    console.error('❌ Error reading fuel prices:', error);

    // Fallback to default prices if cache read fails
    const fallbackPrices = {
      unleaded: 180,
      premium: 200,
      diesel: 190,
      dataPoints: {
        unleaded: 0,
        premium: 0,
        diesel: 0
      }
    };

    return res.status(200).json({
      latest: fallbackPrices,
      averages: {
        last7Days: fallbackPrices,
        last30Days: fallbackPrices
      },
      history: [],
      lastUpdated: new Date().toISOString(),
      fallback: true,
      message: 'Using default prices due to cache error'
    });
  }
}
