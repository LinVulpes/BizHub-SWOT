const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Environment variables for API keys
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

/**
 * Extract social media metrics from social links
 * Uses SERP API to search for follower counts
 */
async function scrapeSocialMetrics(socialLinks) {
    if (!SERP_API_KEY || !socialLinks) return null;

    const metrics = {};

    try {
        // Instagram scraping
        if (socialLinks.instagram) {
            const handle = socialLinks.instagram.split('/').filter(Boolean).pop();
            const query = `${handle} Instagram followers`;
            
            try {
                const response = await axios.get('https://serpapi.com/search', {
                    params: {
                        q: query,
                        api_key: SERP_API_KEY,
                        engine: 'google',
                        num: 3
                    }
                });

                // Try to extract follower count from snippets
                const snippet = response.data.organic_results?.[0]?.snippet || '';
                const followerMatch = snippet.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMk]?)\s*followers/i);
                
                if (followerMatch) {
                    let count = followerMatch[1].replace(/,/g, '');
                    if (count.endsWith('K') || count.endsWith('k')) {
                        count = parseFloat(count) * 1000;
                    } else if (count.endsWith('M')) {
                        count = parseFloat(count) * 1000000;
                    } else {
                        count = parseInt(count);
                    }
                    
                    metrics.instagram = { followers: Math.round(count) };
                }
            } catch (err) {
                console.log('Instagram scraping failed:', err.message);
            }
        }

        // Facebook scraping
        if (socialLinks.facebook) {
            const handle = socialLinks.facebook.split('/').filter(Boolean).pop();
            const query = `${handle} Facebook followers`;
            
            try {
                const response = await axios.get('https://serpapi.com/search', {
                    params: {
                        q: query,
                        api_key: SERP_API_KEY,
                        engine: 'google',
                        num: 3
                    }
                });

                const snippet = response.data.organic_results?.[0]?.snippet || '';
                const followerMatch = snippet.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMk]?)\s*(?:followers|likes)/i);
                
                if (followerMatch) {
                    let count = followerMatch[1].replace(/,/g, '');
                    if (count.endsWith('K') || count.endsWith('k')) {
                        count = parseFloat(count) * 1000;
                    } else if (count.endsWith('M')) {
                        count = parseFloat(count) * 1000000;
                    } else {
                        count = parseInt(count);
                    }
                    
                    metrics.facebook = { followers: Math.round(count) };
                }
            } catch (err) {
                console.log('Facebook scraping failed:', err.message);
            }
        }

        // LinkedIn scraping
        if (socialLinks.linkedin) {
            const handle = socialLinks.linkedin.split('/').filter(Boolean).pop();
            const query = `${handle} LinkedIn followers`;
            
            try {
                const response = await axios.get('https://serpapi.com/search', {
                    params: {
                        q: query,
                        api_key: SERP_API_KEY,
                        engine: 'google',
                        num: 3
                    }
                });

                const snippet = response.data.organic_results?.[0]?.snippet || '';
                const followerMatch = snippet.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMk]?)\s*followers/i);
                
                if (followerMatch) {
                    let count = followerMatch[1].replace(/,/g, '');
                    if (count.endsWith('K') || count.endsWith('k')) {
                        count = parseFloat(count) * 1000;
                    } else if (count.endsWith('M')) {
                        count = parseFloat(count) * 1000000;
                    } else {
                        count = parseInt(count);
                    }
                    
                    metrics.linkedin = { followers: Math.round(count) };
                }
            } catch (err) {
                console.log('LinkedIn scraping failed:', err.message);
            }
        }

    } catch (error) {
        console.error('Social metrics scraping error:', error.message);
    }

    return Object.keys(metrics).length > 0 ? metrics : null;
}

/**
 * Enrich business data with Google Places and SERP API
 * POST /api/enrich
 * Body: { businessName: string, location?: string, industry?: string }
 */
app.post('/api/enrich', async (req, res) => {
    try {
        const { businessName, location, industry, socialLinks } = req.body;

        if (!businessName) {
            return res.status(400).json({ error: 'Business name is required' });
        }

        const enrichedData = {
            googlePlaces: null,
            serpData: null,
            socialMediaMetrics: null,
            timestamp: new Date().toISOString()
        };

        let placeCoordinates = null;
        let businessTypes = null;

        // Scrape social media metrics if social links provided
        if (socialLinks) {
            enrichedData.socialMediaMetrics = await scrapeSocialMetrics(socialLinks);
        }

        // 1. Google Places API enrichment
        if (GOOGLE_PLACES_API_KEY) {
            try {
                const query = location 
                    ? `${businessName} ${location}`
                    : businessName;

                // Find Place from Text
                const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json`;
                const findPlaceResponse = await axios.get(findPlaceUrl, {
                    params: {
                        input: query,
                        inputtype: 'textquery',
                        fields: 'place_id,name,formatted_address,geometry',
                        key: GOOGLE_PLACES_API_KEY
                    }
                });

                if (findPlaceResponse.data.candidates && findPlaceResponse.data.candidates.length > 0) {
                    const placeId = findPlaceResponse.data.candidates[0].place_id;
                    placeCoordinates = findPlaceResponse.data.candidates[0].geometry?.location;

                    // Get Place Details
                    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
                    const detailsResponse = await axios.get(detailsUrl, {
                        params: {
                            place_id: placeId,
                            fields: 'name,formatted_address,rating,user_ratings_total,types,website,formatted_phone_number,opening_hours,price_level,reviews,geometry',
                            key: GOOGLE_PLACES_API_KEY
                        }
                    });

                    if (detailsResponse.data.result) {
                        const result = detailsResponse.data.result;
                        businessTypes = result.types;
                        placeCoordinates = result.geometry?.location || placeCoordinates;

                        // Basic business data
                        enrichedData.googlePlaces = {
                            placeId: placeId,
                            name: result.name,
                            formattedAddress: result.formatted_address,
                            rating: result.rating,
                            userRatingsTotal: result.user_ratings_total,
                            types: result.types,
                            website: result.website,
                            phoneNumber: result.formatted_phone_number,
                            openingHours: result.opening_hours,
                            priceLevel: result.price_level,
                            reviews: result.reviews ? 
                                result.reviews.slice(0, 5).map(r => ({
                                    author: r.author_name,
                                    rating: r.rating,
                                    text: r.text,
                                    time: r.time
                                })) : []
                        };

                        // ENHANCEMENT 1: Nearby Competitors Analysis
                        if (placeCoordinates && businessTypes && businessTypes.length > 0) {
                            try {
                                const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
                                const nearbyResponse = await axios.get(nearbyUrl, {
                                    params: {
                                        location: `${placeCoordinates.lat},${placeCoordinates.lng}`,
                                        radius: 1000, // 1km radius
                                        type: businessTypes[0],
                                        key: GOOGLE_PLACES_API_KEY
                                    }
                                });

                                if (nearbyResponse.data.results) {
                                    const competitors = nearbyResponse.data.results
                                        .filter(place => place.place_id !== placeId) // Exclude the business itself
                                        .slice(0, 10); // Top 10 competitors

                                    const ratingsWithValues = competitors
                                        .map(c => c.rating)
                                        .filter(r => r != null);
                                    
                                    const reviewCountsWithValues = competitors
                                        .map(c => c.user_ratings_total)
                                        .filter(r => r != null && r > 0);

                                    const avgRating = ratingsWithValues.length > 0
                                        ? ratingsWithValues.reduce((sum, r) => sum + r, 0) / ratingsWithValues.length
                                        : null;

                                    const avgReviewCount = reviewCountsWithValues.length > 0
                                        ? reviewCountsWithValues.reduce((sum, r) => sum + r, 0) / reviewCountsWithValues.length
                                        : null;

                                    enrichedData.googlePlaces.competitiveAnalysis = {
                                        totalNearbyCompetitors: competitors.length,
                                        searchRadius: '1km',
                                        businessRating: result.rating,
                                        areaAverageRating: avgRating ? parseFloat(avgRating.toFixed(2)) : null,
                                        businessReviewCount: result.user_ratings_total,
                                        areaAverageReviewCount: avgReviewCount ? Math.round(avgReviewCount) : null,
                                        topCompetitors: competitors.slice(0, 5).map(c => ({
                                            name: c.name,
                                            rating: c.rating || null,
                                            reviewCount: c.user_ratings_total || null,
                                            priceLevel: c.price_level || null,
                                            vicinity: c.vicinity
                                        }))
                                    };
                                }
                            } catch (nearbyError) {
                                console.error('Nearby search error:', nearbyError.message);
                                enrichedData.googlePlaces.competitiveAnalysis = { error: nearbyError.message };
                            }
                        }

                        // Review Sentiment Analysis (Simple)
                        if (enrichedData.googlePlaces.reviews && enrichedData.googlePlaces.reviews.length > 0) {
                            const reviews = enrichedData.googlePlaces.reviews;
                            const positiveReviews = reviews.filter(r => r.rating >= 4);
                            const negativeReviews = reviews.filter(r => r.rating <= 2);
                            
                            enrichedData.googlePlaces.reviewAnalysis = {
                                totalReviews: reviews.length,
                                positiveCount: positiveReviews.length,
                                negativeCount: negativeReviews.length,
                                positivePercentage: Math.round((positiveReviews.length / reviews.length) * 100),
                                averageRating: parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)),
                                // Extract common keywords from positive reviews
                                positiveSample: positiveReviews.length > 0 ? positiveReviews[0].text : null,
                                negativeSample: negativeReviews.length > 0 ? negativeReviews[0].text : null
                            };
                        }
                    }
                }
            } catch (googleError) {
                console.error('Google Places API error:', googleError.message);
                enrichedData.googlePlaces = { error: googleError.message };
            }
        }

        // 2. SERP API enrichment (Enhanced with multiple searches)
        if (SERP_API_KEY) {
            try {
                const searches = {
                    business: null,
                    competitors: null,
                    industryTrends: null
                };

                // Search 1: Business verification
                const businessQuery = industry 
                    ? `${businessName} ${industry} ${location || 'Singapore'}`
                    : `${businessName} ${location || 'Singapore'}`;

                const businessSearch = await axios.get(`https://serpapi.com/search`, {
                    params: {
                        q: businessQuery,
                        api_key: SERP_API_KEY,
                        engine: 'google',
                        num: 5
                    }
                });

                searches.business = businessSearch.data;

                // ENHANCEMENT 2: Competitor Discovery
                if (industry && location) {
                    const competitorQuery = `best ${industry} ${location || 'Singapore'}`;
                    
                    try {
                        const competitorSearch = await axios.get(`https://serpapi.com/search`, {
                            params: {
                                q: competitorQuery,
                                api_key: SERP_API_KEY,
                                engine: 'google',
                                num: 10
                            }
                        });

                        searches.competitors = competitorSearch.data;
                    } catch (compError) {
                        console.error('Competitor search error:', compError.message);
                    }
                }

                // ENHANCEMENT 3: Industry Trends
                if (industry) {
                    const trendQuery = `${industry} trends Singapore 2024`;
                    
                    try {
                        const trendSearch = await axios.get(`https://serpapi.com/search`, {
                            params: {
                                q: trendQuery,
                                api_key: SERP_API_KEY,
                                engine: 'google',
                                num: 5
                            }
                        });

                        searches.industryTrends = trendSearch.data;
                    } catch (trendError) {
                        console.error('Trend search error:', trendError.message);
                    }
                }

                // Compile SERP data
                enrichedData.serpData = {
                    // Business verification results
                    businessSearch: {
                        searchResults: searches.business?.organic_results ? 
                            searches.business.organic_results.slice(0, 5).map(r => ({
                                title: r.title,
                                link: r.link,
                                snippet: r.snippet,
                                position: r.position
                            })) : [],
                        knowledgeGraph: searches.business?.knowledge_graph || null,
                        appearsInResults: searches.business?.organic_results?.some(r => 
                            r.title?.toLowerCase().includes(businessName.toLowerCase()) ||
                            r.link?.toLowerCase().includes(businessName.toLowerCase().replace(/\s+/g, ''))
                        ) || false
                    },

                    // Competitor discovery results
                    competitorDiscovery: searches.competitors ? {
                        searchQuery: `best ${industry} ${location || 'Singapore'}`,
                        topRankedCompetitors: searches.competitors.organic_results?.slice(0, 5).map(r => ({
                            name: r.title,
                            url: r.link,
                            snippet: r.snippet,
                            position: r.position
                        })) || [],
                        businessAppearsInTop10: searches.competitors.organic_results?.slice(0, 10).some(r => 
                            r.title?.toLowerCase().includes(businessName.toLowerCase())
                        ) || false
                    } : null,

                    // Industry trends results
                    industryTrends: searches.industryTrends ? {
                        searchQuery: `${industry} trends Singapore 2024`,
                        trendInsights: searches.industryTrends.organic_results?.slice(0, 3).map(r => ({
                            title: r.title,
                            snippet: r.snippet,
                            source: r.link
                        })) || [],
                        relatedSearches: searches.industryTrends.related_searches?.slice(0, 5).map(r => r.query) || []
                    } : null,

                    // Original related searches from business query
                    relatedSearches: searches.business?.related_searches ? 
                        searches.business.related_searches.slice(0, 5).map(r => r.query) : []
                };

            } catch (serpError) {
                console.error('SERP API error:', serpError.message);
                enrichedData.serpData = { error: serpError.message };
            }
        }

        res.json(enrichedData);

    } catch (error) {
        console.error('Enrichment error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Generate SWOT Analysis
 * POST /api/generate-swot
 * Body: { businessProfile: object, provider: string, systemPrompt: string, userPrompt: string }
 */
app.post('/api/generate-swot', async (req, res) => {
    try {
        const { businessProfile, provider, systemPrompt, userPrompt } = req.body;

        if (!businessProfile) {
            return res.status(400).json({ error: 'Business profile is required' });
        }

        if (!provider) {
            return res.status(400).json({ error: 'LLM provider is required' });
        }

        // Get API key from environment
        let apiKey;
        if (provider === 'openai') {
            apiKey = OPENAI_API_KEY;
        } else if (provider === 'perplexity') {
            apiKey = PERPLEXITY_API_KEY;
        } else {
            return res.status(400).json({ error: 'Unsupported provider' });
        }

        if (!apiKey) {
            return res.status(400).json({ error: `${provider.toUpperCase()} API key not configured in server environment` });
        }

        let swotAnalysis = '';

        // Call appropriate LLM provider
        if (provider === 'openai') {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                max_tokens: 4000
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            swotAnalysis = response.data.choices[0].message.content;

        } else if (provider === 'perplexity') {
            const response = await axios.post('https://api.perplexity.ai/v1/responses', {
                model: 'openai/gpt-5.4',
                instructions: systemPrompt,
                input: [{ role: 'user', content: userPrompt }],
                max_output_tokens: 3000
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const textPart = response.data.output?.[0]?.content?.find(c => c.type === "output_text");
            swotAnalysis = textPart?.text || "";
        }

        res.json({ swotAnalysis });

    } catch (error) {
        console.error('SWOT generation error:', error.response?.data || error.message);
        res.status(500).json({
            error: error.response?.data?.error?.message || error.message 
        });
    }
});

/**
 * Generate AI Business Description
 * POST /api/generate-description
 * Body: { businessProfile: object, provider: string, apiKey: string }
 */
app.post('/api/generate-description', async (req, res) => {
    try {
        const { businessProfile, provider } = req.body;

        if (!businessProfile) {
            return res.status(400).json({ error: 'Business profile is required' });
        }

        if (!provider) {
            return res.status(400).json({ error: 'LLM provider is required' });
        }

        // Get API key from environment
        let apiKey;
        if (provider === 'openai') {
            apiKey = OPENAI_API_KEY;
        } else if (provider === 'perplexity') {
            apiKey = PERPLEXITY_API_KEY;
        } else {
            return res.status(400).json({ error: 'Unsupported provider' });
        }

        if (!apiKey) {
            return res.status(400).json({ error: `${provider.toUpperCase()} API key not configured in server environment` });
        }

        // Build the prompt
        const prompt = buildDescriptionPrompt(businessProfile);

        let description = '';

        // Call appropriate LLM provider
        if (provider === 'openai') {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional business listing writer. Create structured, factual business descriptions using bullet points and paragraphs as specified.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 800,
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            description = response.data.choices[0].message.content;

        } else if (provider === 'perplexity') {
            const response = await axios.post('https://api.perplexity.ai/v1/responses', {
                model: 'openai/gpt-5.4',
                instructions: 'You are a professional business listing writer. Create structured, factual business descriptions using bullet points and paragraphs as specified.',
                input: [{ role: 'user', content: prompt }],
                max_output_tokens: 800
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const textPart = response.data.output?.[0]?.content?.find(c => c.type === "output_text");
            description = textPart?.text || "";
        }

        res.json({ description });

    } catch (error) {
        console.error('Description generation error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: error.response?.data?.error?.message || error.message 
        });
    }
});

/**
 * Build prompt for AI Description Writer
 */
function buildDescriptionPrompt(profile) {
    const latestFinancial = profile.financials?.[profile.financials.length - 1];
    const previousFinancial = profile.financials?.[profile.financials.length - 2];
    
    // Better business name handling
    let businessNameDisplay;
    if (profile.hideBusinessName) {
        const industry = profile.industryType || 'business';
        businessNameDisplay = `A well-established ${industry.toLowerCase()}`;
    } else {
        businessNameDisplay = profile.businessName || "This business";
    }
    
    return `You are a professional business listing writer. Create a compelling business description using ONLY the information provided below.

BUSINESS INFORMATION:
- Name: ${businessNameDisplay}
- Industry: ${profile.industryType || 'Not specified'}
- Location: ${profile.areaOrDistrict || ''}, ${profile.country || 'Singapore'}
- Founded: ${profile.yearFounded || 'Not specified'}
- Team Size: ${profile.teamSize || 'Not specified'}
- Latest Revenue: ${latestFinancial?.revenue ? '$' + latestFinancial.revenue.toLocaleString() : 'Not disclosed'}
- Latest Net Profit: ${latestFinancial?.netProfit ? '$' + latestFinancial.netProfit.toLocaleString() : 'Not disclosed'}
${previousFinancial ? `- Previous Year Revenue: $${previousFinancial.revenue?.toLocaleString() || 'N/A'}` : ''}
${previousFinancial ? `- Previous Year Net Profit: $${previousFinancial.netProfit?.toLocaleString() || 'N/A'}` : ''}
${profile.socialMediaMetrics?.instagram?.followers ? `- Instagram Followers: ${profile.socialMediaMetrics.instagram.followers.toLocaleString()}` : ''}
${profile.socialMediaMetrics?.facebook?.followers ? `- Facebook Followers: ${profile.socialMediaMetrics.facebook.followers.toLocaleString()}` : ''}
${profile.socialMediaMetrics?.linkedin?.followers ? `- LinkedIn Followers: ${profile.socialMediaMetrics.linkedin.followers.toLocaleString()}` : ''}

BUSINESS STORY:
${profile.businessStory?.text || 'Not provided'}

KEY ASSETS:
${profile.tangibleAssets?.map(a => `- ${a.label}${a.value ? ': $' + a.value.toLocaleString() : ''}`).join('\n') || 'Not specified'}

LICENSES:
${profile.licenses?.map(l => l.name).join(', ') || 'Not specified'}

PROPERTY:
${profile.propertyInfo?.status === 'owned' 
    ? 'Property owned' + (profile.propertyInfo.owned?.includedInSale ? ' and included in sale' : '')
    : profile.propertyInfo?.status === 'rented'
        ? `Rented property, ${profile.propertyInfo.rented?.leaseTermRemainingMonths || '?'} months remaining on lease`
        : 'Online/virtual business'
}

REASON FOR SELLING:
${profile.reasonForSelling || 'Not specified'}

HIDE BUSINESS NAME: ${profile.hideBusinessName ? 'true - use "[Business Name Confidential]" or generic terms' : 'false - use actual business name'}

---

CREATE A STRUCTURED BUSINESS DESCRIPTION WITH THESE SECTIONS (HYBRID FORMAT):

**Key Highlights**
• [3-5 bullets: establishment, revenue/growth, unique metrics, location/property]

**What Makes This Business Unique**
[Paragraph: 2-3 sentences explaining competitive advantages and differentiators]

**Operations**
• [2-4 bullets: business model, processes, marketing, owner involvement]

**Customers & Market**
• [2-4 bullets: customer profile, acquisition, retention, geography]

**Financial Performance**
• [2-4 bullets: revenue trends, profit margins, cost structure, cash flow]

CRITICAL RULES:
- Use bullet points (•) for: Key Highlights, Operations, Customers, Financials
- Use paragraph format (2-3 sentences max) for: "What Makes This Business Unique" ONLY
- Each bullet should be 1-2 sentences
- Be specific with numbers from the data provided
- Professional tone like: "has established itself," "demonstrates," "leverages"
- Do not invent information not provided
- If hideBusinessName is true, use "${businessNameDisplay}" or generic terms

Generate the description now:`;
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        hasGooglePlacesKey: !!GOOGLE_PLACES_API_KEY,
        hasSerpApiKey: !!SERP_API_KEY
    });
});

// Export for Vercel serverless (don't start server in serverless environment)
module.exports = app;