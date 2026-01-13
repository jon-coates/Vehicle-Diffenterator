/**
 * Debug endpoint to see the actual Edge Config data
 * Bypasses cache and shows raw data structure
 */

import { get } from '@vercel/edge-config';

export default async function handler(req, res) {
  // Security: Require secret parameter
  const secret = req.query.secret;
  const cronSecret = process.env.CRON_SECRET;

  if (secret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized - include ?secret=YOUR_CRON_SECRET' });
  }

  try {
    console.log('🔍 Debug: Reading raw Edge Config data...');

    // Read raw data from Edge Config
    const priceData = await get('fuel_prices');

    if (!priceData) {
      return res.status(404).json({
        error: 'No data found',
        message: 'Edge Config fuel_prices key is empty'
      });
    }

    // Return raw structure with metadata
    return res.status(200).json({
      success: true,
      dataStructure: {
        hasLatest: !!priceData.latest,
        hasAverages: !!priceData.averages,
        hasHistory: !!priceData.history,
        historyLength: priceData.history?.length || 0,
        lastUpdated: priceData.lastUpdated,
        // Check if it's old format (prices directly on object)
        isOldFormat: !!(priceData.unleaded && !priceData.latest)
      },
      rawData: priceData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
