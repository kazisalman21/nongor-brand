/**
 * Analytics API Endpoint for Telegram Bot
 * Returns combined website + conversion metrics
 */
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// Initialize GA4 client
// Note: process.env is available in Vercel functions
const analyticsClient = new BetaAnalyticsDataClient({
    credentials: JSON.parse(process.env.GOOGLE_ANALYTICS_CREDENTIALS || '{}')
});

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const BOT_API_KEY = process.env.BOT_API_KEY; // Shared secret with bot

module.exports = async (req, res) => {
    // Security: Only allow bot to access
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== BOT_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        if (!GA4_PROPERTY_ID || !process.env.GOOGLE_ANALYTICS_CREDENTIALS) {
            console.error('Missing GA4 credentials');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        // Fetch today's traffic
        const [todayTraffic] = await analyticsClient.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            dateRanges: [{ startDate: 'today', endDate: 'today' }],
            metrics: [
                { name: 'activeUsers' },
                { name: 'screenPageViews' },
                { name: 'sessions' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' }
            ]
        });

        // Fetch conversion funnel (last 7 days for better data)
        const [funnelData] = await analyticsClient.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'eventName' }],
            metrics: [{ name: 'eventCount' }],
            dimensionFilter: {
                filter: {
                    fieldName: 'eventName',
                    inListFilter: {
                        values: ['view_item', 'add_to_cart', 'begin_checkout', 'purchase']
                    }
                }
            }
        });

        // Fetch top pages
        const [topPagesData] = await analyticsClient.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
            metrics: [{ name: 'screenPageViews' }],
            orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
            limit: 10
        });

        // Fetch traffic sources
        const [trafficSourceData] = await analyticsClient.runReport({
            property: `properties/${GA4_PROPERTY_ID}`,
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            dimensions: [{ name: 'sessionSource' }],
            metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 5
        });

        // Format response
        const response = {
            today: {
                visitors: getMetricValue(todayTraffic, 0, 0) || 0,
                pageViews: getMetricValue(todayTraffic, 0, 1) || 0,
                sessions: getMetricValue(todayTraffic, 0, 2) || 0,
                bounceRate: parseFloat(getMetricValue(todayTraffic, 0, 3) || 0).toFixed(1),
                avgSessionDuration: parseInt(getMetricValue(todayTraffic, 0, 4) || 0)
            },
            funnel: {
                productViews: getFunnelEventCount(funnelData, 'view_item'),
                addToCart: getFunnelEventCount(funnelData, 'add_to_cart'),
                checkoutStarted: getFunnelEventCount(funnelData, 'begin_checkout'),
                purchases: getFunnelEventCount(funnelData, 'purchase')
            },
            topPages: formatTopPages(topPagesData),
            trafficSources: formatTrafficSources(trafficSourceData),
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('Analytics API Error:', error);
        res.status(500).json({
            error: 'Failed to fetch analytics',
            details: error.message
        });
    }
};

// Helper functions
function getMetricValue(report, rowIndex, metricIndex) {
    return report?.rows?.[rowIndex]?.metricValues?.[metricIndex]?.value;
}

function getFunnelEventCount(report, eventName) {
    const row = report?.rows?.find(r => r.dimensionValues[0]?.value === eventName);
    return parseInt(row?.metricValues?.[0]?.value || 0);
}

function formatTopPages(report) {
    return report?.rows?.slice(0, 10).map(row => ({
        title: row.dimensionValues[0]?.value || 'Unknown',
        path: row.dimensionValues[1]?.value || '/',
        views: parseInt(row.metricValues[0]?.value || 0)
    })) || [];
}

function formatTrafficSources(report) {
    const sources = {};
    report?.rows?.forEach(row => {
        const source = row.dimensionValues[0]?.value || 'direct';
        const sessions = parseInt(row.metricValues[0]?.value || 0);
        sources[source] = sessions;
    });
    return sources;
}
