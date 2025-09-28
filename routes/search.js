const express = require('express');
const Database = require('../database/db');
const router = express.Router();

const db = new Database();

// Search endpoint
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;

        if (!query || query.trim().length < 2) {
            return res.json({
                success: false,
                message: 'Query must be at least 2 characters long',
                results: []
            });
        }

        const results = await db.searchMerchants(query.trim());

        // Format results for frontend
        const formattedResults = results.map(merchant => {
            const offers = [];

            if (merchant.offer_descriptions) {
                const descriptions = merchant.offer_descriptions.split(',');
                const cashbackRates = (merchant.cashback_rates || '').split(',');
                const offerTypes = (merchant.offer_types || '').split(',');

                descriptions.forEach((desc, index) => {
                    offers.push({
                        description: desc?.trim() || 'Ofertă disponibilă',
                        cashback: cashbackRates[index]?.trim() || 'Variabil',
                        type: offerTypes[index]?.trim() || 'cashback'
                    });
                });
            }

            return {
                id: merchant.id,
                name: merchant.name,
                source: merchant.source,
                url: merchant.url,
                offers: offers.length > 0 ? offers : [{
                    description: 'Ofertă disponibilă',
                    cashback: 'Variabil',
                    type: 'unknown'
                }]
            };
        });

        res.json({
            success: true,
            query: query,
            count: formattedResults.length,
            results: formattedResults
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message
        });
    }
});

// Get all sources
router.get('/sources', async (req, res) => {
    try {
        const sources = await new Promise((resolve, reject) => {
            db.db.all(
                'SELECT source, COUNT(DISTINCT id) as merchant_count FROM merchants GROUP BY source',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });

        res.json({
            success: true,
            sources: sources
        });
    } catch (error) {
        console.error('Sources error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get sources',
            error: error.message
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
