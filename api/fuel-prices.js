/**
 * API Endpoint: Get cached fuel prices
 * Returns prices that were cached by the daily cron job
 */

import { get } from '@vercel/edge-config';

export default async function handler(req, res) {
  try {
    console.log('📞 Fuel prices API called');

    // Read cached prices from Edge Config
    const prices = await get('fuel_prices');

    if (!prices) {
      console.log('⚠️ No cached prices found');
      return res.status(503).json({
        error: 'Fuel prices not yet available',
        message: 'Prices are being fetched. Please try again in a few minutes.'
      });
    }

    console.log('✅ Returning cached prices from:', prices.lastUpdated);

    // Add cache headers (cache for 1 hour on CDN)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    return res.status(200).json(prices);

  } catch (error) {
    console.error('❌ Error reading fuel prices:', error);

    // Fallback to default prices if cache read fails
    return res.status(200).json({
      unleaded: 180,
      premium: 200,
      diesel: 190,
      lastUpdated: new Date().toISOString(),
      fallback: true,
      message: 'Using default prices due to cache error'
    });
  }
}
