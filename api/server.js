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

        // ============================================================================
        // PHASE 2: VALIDATION
        // ============================================================================
        enrichedData.validationResults = {
            foundationYear: null,
            businessName: null,
            financials: null,
            location: null
        };

        // Get additional data from request body for validation
        const { yearFounded, websiteUrl, financials, areaOrDistrict } = req.body;

        if (yearFounded && websiteUrl) {
            enrichedData.validationResults.foundationYear = await validateFoundationYear(
                businessName,
                yearFounded,
                websiteUrl,
                enrichedData.googlePlaces
            );
        }

        if (enrichedData.googlePlaces) {
            enrichedData.validationResults.businessName = await validateBusinessName(
                businessName,
                enrichedData.googlePlaces
            );

            if (areaOrDistrict) {
                enrichedData.validationResults.location = await validateLocation(
                    areaOrDistrict,
                    enrichedData.googlePlaces
                );
            }
        }

        if (financials && financials.length > 0 && industry) {
            enrichedData.validationResults.financials = await validateFinancials(
                financials,
                industry
            );
        }

        // ============================================================================
        // PHASE 3: EXTRACTION FEATURES
        // ============================================================================
        enrichedData.extractedData = {
            clientNames: null,
            portfolioLinks: null,
            industryPlatforms: null,
            awards: null
        };

        enrichedData.extractedData.clientNames = await extractClientNames(
            businessName,
            industry
        );

        enrichedData.extractedData.portfolioLinks = await discoverPortfolioLinks(
            businessName,
            industry,
            websiteUrl
        );

        enrichedData.extractedData.industryPlatforms = await extractIndustryPlatforms(
            industry,
            location
        );

        enrichedData.extractedData.awards = await extractAwardsRecognition(
            businessName,
            location
        );

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
                model: 'gpt-4o',
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
                model: 'gpt-4o',
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
 * ============================================================================
 * PHASE 2: DATA VALIDATION FUNCTIONS
 * ============================================================================
 */

/**
 * Validate foundation year by cross-checking website, Google Places, and SERP
 */
async function validateFoundationYear(businessName, sellerClaimedYear, websiteUrl, googlePlacesData) {
    const validation = {
        sellerClaim: sellerClaimedYear,
        websiteData: null,
        googlePlacesData: null,
        serpData: null,
        discrepancy: false,
        mostLikelyYear: sellerClaimedYear,
        confidence: 'low',
        recommendation: null
    };

    // 1. Check website if URL provided
    if (websiteUrl) {
        try {
            const response = await axios.get(websiteUrl, { 
                timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const html = response.data;
            
            // Pattern 1: Copyright range "© 2011-2024"
            const copyrightMatch = html.match(/©\s*(\d{4})\s*[-–]\s*\d{4}/);
            if (copyrightMatch) {
                validation.websiteData = parseInt(copyrightMatch[1]);
            }
            
            // Pattern 2: "Established", "Founded", "Since" + year
            if (!validation.websiteData) {
                const establishedMatch = html.match(/(?:established|founded|since)\s+(?:in\s+)?(\d{4})/i);
                if (establishedMatch) {
                    validation.websiteData = parseInt(establishedMatch[1]);
                }
            }
        } catch (err) {
            console.log('Website validation failed:', err.message);
        }
    }

    // 2. Check Google Places opening date
    if (googlePlacesData?.opening_date) {
        const year = new Date(googlePlacesData.opening_date).getFullYear();
        validation.googlePlacesData = year;
    }

    // 3. Check SERP results
    if (SERP_API_KEY) {
        try {
            const query = `"${businessName}" founded established since`;
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    q: query,
                    api_key: SERP_API_KEY,
                    engine: 'google',
                    num: 5
                },
                timeout: 5000
            });

            const results = response.data.organic_results || [];
            for (const result of results) {
                const text = (result.snippet || '') + ' ' + (result.title || '');
                const yearMatch = text.match(/(?:founded|established|since)\s+(?:in\s+)?(\d{4})/i);
                if (yearMatch) {
                    validation.serpData = parseInt(yearMatch[1]);
                    break;
                }
            }
        } catch (err) {
            console.log('SERP foundation year validation failed:', err.message);
        }
    }

    // 4. Determine consensus and flag discrepancies
    const sources = [
        validation.websiteData,
        validation.googlePlacesData,
        validation.serpData
    ].filter(y => y && y > 1900 && y <= new Date().getFullYear());

    if (sources.length > 0) {
        // Find most common year
        const yearCounts = {};
        sources.forEach(y => yearCounts[y] = (yearCounts[y] || 0) + 1);
        
        const mostCommonYear = parseInt(
            Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0][0]
        );
        
        validation.mostLikelyYear = mostCommonYear;
        
        // Flag if seller claim differs by 2+ years
        if (Math.abs(validation.sellerClaim - mostCommonYear) >= 2) {
            validation.discrepancy = true;
            validation.confidence = 'high';
            validation.recommendation = `Use ${mostCommonYear} as founding year; seller may have confused registration date (${sellerClaimedYear}) with actual founding`;
        } else {
            validation.confidence = 'high';
        }
    } else if (validation.sellerClaim) {
        validation.confidence = 'low';
        validation.recommendation = 'No public data found to verify founding year; rely on seller documentation';
    }

    return validation;
}

/**
 * Validate business name accuracy
 */
async function validateBusinessName(sellerName, googlePlacesData) {
    const validation = {
        sellerClaim: sellerName,
        googlePlacesName: null,
        discrepancy: false,
        suggestion: null
    };

    if (googlePlacesData?.name) {
        validation.googlePlacesName = googlePlacesData.name;
        
        // Normalize and compare (ignore case, punctuation, "Pte Ltd", etc.)
        const normalize = (s) => s
            .toLowerCase()
            .replace(/pte\.?\s*ltd\.?/gi, '')
            .replace(/private\s*limited/gi, '')
            .replace(/[^a-z0-9]/g, '');
        
        if (normalize(sellerName) !== normalize(googlePlacesData.name)) {
            validation.discrepancy = true;
            validation.suggestion = googlePlacesData.name;
        }
    }

    return validation;
}

/**
 * Validate financial reasonability
 */
async function validateFinancials(financials, industryType) {
    const validation = {
        redFlags: [],
        warnings: [],
        reasonabilityCheck: 'pass'
    };

    if (!financials || financials.length === 0) {
        return validation;
    }

    const latest = financials[financials.length - 1];
    const revenue = latest.revenue;
    const netProfit = latest.netProfit;

    // 1. Basic sanity checks
    if (netProfit > revenue) {
        validation.redFlags.push({
            type: 'profit_exceeds_revenue',
            severity: 'critical',
            note: `Net profit ($${netProfit.toLocaleString()}) exceeds revenue ($${revenue.toLocaleString()}), which is mathematically impossible`
        });
    }

    if (revenue < 0 || netProfit < 0) {
        validation.redFlags.push({
            type: 'negative_values',
            severity: 'critical',
            note: 'Negative revenue or profit values detected; verify data entry'
        });
    }

    // 2. Profit margin reasonability
    const margin = (netProfit / revenue) * 100;
    const industryBenchmarks = {
        'Food & Beverage': { low: 5, typical: 15, high: 25 },
        'Retail': { low: 3, typical: 10, high: 20 },
        'E-commerce': { low: 5, typical: 15, high: 30 },
        'Professional Services': { low: 15, typical: 30, high: 45 },
        'Technology': { low: 10, typical: 25, high: 40 },
        'Healthcare': { low: 10, typical: 20, high: 35 },
        'Education': { low: 8, typical: 18, high: 30 },
        'Manufacturing': { low: 5, typical: 12, high: 22 },
        'Construction': { low: 3, typical: 8, high: 15 }
    };

    const benchmark = industryBenchmarks[industryType] || { low: 10, typical: 25, high: 40 };

    if (margin > benchmark.high * 1.5) {
        validation.redFlags.push({
            type: 'unusually_high_margin',
            value: margin.toFixed(1),
            expected: benchmark.typical,
            severity: 'high',
            note: `Net margin of ${margin.toFixed(1)}% significantly exceeds industry typical of ${benchmark.typical}%; verify owner salary exclusion and ensure all operating costs are captured`
        });
    } else if (margin > benchmark.high) {
        validation.warnings.push({
            type: 'above_average_margin',
            value: margin.toFixed(1),
            expected: benchmark.typical,
            note: `Net margin of ${margin.toFixed(1)}% is above typical ${benchmark.typical}% for this industry; strong if sustainable but verify cost completeness`
        });
    }

    // 3. YoY consistency check
    if (financials.length >= 2) {
        const previous = financials[financials.length - 2];
        const revenueChange = ((latest.revenue - previous.revenue) / previous.revenue) * 100;
        const profitChange = ((latest.netProfit - previous.netProfit) / previous.netProfit) * 100;

        if (Math.abs(revenueChange - profitChange) > 60) {
            validation.warnings.push({
                type: 'inconsistent_growth_pattern',
                revenueChange: revenueChange.toFixed(1),
                profitChange: profitChange.toFixed(1),
                note: `Revenue changed ${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}% while profit changed ${profitChange > 0 ? '+' : ''}${profitChange.toFixed(1)}%; large variance may indicate cost structure changes or one-time items`
            });
        }
    }

    if (validation.redFlags.length > 0) {
        validation.reasonabilityCheck = 'critical';
    } else if (validation.warnings.length > 0) {
        validation.reasonabilityCheck = 'review';
    }

    return validation;
}

/**
 * Validate location
 */
async function validateLocation(sellerLocation, googlePlacesData) {
    const validation = {
        sellerClaim: sellerLocation,
        googlePlacesAddress: null,
        discrepancy: false
    };

    if (googlePlacesData?.formatted_address) {
        validation.googlePlacesAddress = googlePlacesData.formatted_address;
        
        if (!googlePlacesData.formatted_address.toLowerCase()
            .includes(sellerLocation.toLowerCase())) {
            validation.discrepancy = true;
        }
    }

    return validation;
}

/**
 * ============================================================================
 * PHASE 3: EXTRACTION FUNCTIONS
 * ============================================================================
 */

/**
 * Extract client names from SERP results
 */
async function extractClientNames(businessName, industry) {
    const extraction = {
        clientNames: [],
        sources: [],
        confidence: 'low'
    };

    if (!SERP_API_KEY) return extraction;

    const queries = [
        `"${businessName}" clients`,
        `"${businessName}" portfolio`,
        `"${businessName}" "worked with"`,
        `"${businessName}" case studies`
    ];

    for (const query of queries) {
        try {
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    q: query,
                    api_key: SERP_API_KEY,
                    engine: 'google',
                    num: 10
                },
                timeout: 5000
            });

            const results = response.data.organic_results || [];
            
            for (const result of results) {
                const text = (result.snippet || '') + ' ' + (result.title || '');
                
                // Pattern 1: "clients include X, Y, Z"
                const pattern1 = text.match(/clients?\s+(?:include|such as|like)[\s:]+([^.!?]+)/i);
                if (pattern1) {
                    const names = pattern1[1]
                        .split(/,|and|\||\//)
                        .map(n => n.trim())
                        .filter(n => 
                            n.length > 2 && 
                            n.length < 50 && 
                            !n.match(/^https?:/) &&
                            !n.match(/^\d+$/)
                        );
                    
                    extraction.clientNames.push(...names);
                    
                    if (names.length > 0) {
                        extraction.sources.push({
                            url: result.link,
                            snippet: result.snippet
                        });
                    }
                }
                
                // Pattern 2: "Portfolio: X, Y, Z"
                const pattern2 = text.match(/(?:portfolio|work|projects)[\s:]+([^.!?]+)/i);
                if (pattern2) {
                    const names = pattern2[1]
                        .split(/,|and|\||\//)
                        .map(n => n.trim())
                        .filter(n => n.length > 2 && n.length < 50);
                    
                    extraction.clientNames.push(...names);
                }
            }
        } catch (err) {
            console.log(`Client extraction failed for query: ${query}`, err.message);
        }
    }

    // Deduplicate and clean
    const genericWords = [
        'clients', 'portfolio', 'projects', 'services', 'work', 'more',
        'including', 'various', 'multiple', 'many', 'several', 'other'
    ];
    
    extraction.clientNames = [...new Set(extraction.clientNames)]
        .filter(name => !genericWords.includes(name.toLowerCase()))
        .filter(name => {
            const alphaRatio = (name.match(/[a-zA-Z]/g) || []).length / name.length;
            return alphaRatio > 0.5;
        })
        .slice(0, 15);

    // Set confidence
    if (extraction.clientNames.length >= 5) {
        extraction.confidence = 'high';
    } else if (extraction.clientNames.length >= 3) {
        extraction.confidence = 'medium';
    }

    return extraction;
}

/**
 * Discover portfolio links (Behance, Dribbble, GitHub, website)
 */
async function discoverPortfolioLinks(businessName, industry, websiteUrl) {
    const discovery = {
        links: [],
        platforms: [],
        projectCount: 0
    };

    if (!SERP_API_KEY) return discovery;

    const platformMapping = {
        'Technology': ['github.com', 'gitlab.com'],
        'Professional Services': ['behance.net', 'dribbble.com'],
        'Creative': ['behance.net', 'dribbble.com', 'vimeo.com']
    };

    const targetPlatforms = platformMapping[industry] || ['behance.net', 'dribbble.com'];

    for (const platform of targetPlatforms) {
        try {
            const query = `site:${platform} "${businessName}"`;
            
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    q: query,
                    api_key: SERP_API_KEY,
                    engine: 'google',
                    num: 5
                },
                timeout: 5000
            });

            const results = response.data.organic_results || [];
            
            for (const result of results) {
                if (result.link && result.link.includes(platform)) {
                    discovery.links.push({
                        platform: platform.replace('.net', '').replace('.com', ''),
                        url: result.link,
                        title: result.title,
                        snippet: result.snippet
                    });
                    
                    if (!discovery.platforms.includes(platform)) {
                        discovery.platforms.push(platform);
                    }
                    
                    const countMatch = result.snippet?.match(/(\d+)\s+(?:projects|works)/i);
                    if (countMatch) {
                        discovery.projectCount += parseInt(countMatch[1]);
                    }
                }
            }
        } catch (err) {
            console.log(`Portfolio search failed for ${platform}:`, err.message);
        }
    }

    // Search own website
    if (websiteUrl) {
        try {
            const hostname = new URL(websiteUrl).hostname;
            const query = `site:${hostname} portfolio OR work OR projects`;
            
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    q: query,
                    api_key: SERP_API_KEY,
                    engine: 'google',
                    num: 3
                },
                timeout: 5000
            });

            const results = response.data.organic_results || [];
            for (const result of results) {
                discovery.links.push({
                    platform: 'website',
                    url: result.link,
                    title: result.title,
                    snippet: result.snippet
                });
            }
        } catch (err) {
            console.log('Website portfolio search failed:', err.message);
        }
    }

    return discovery;
}

/**
 * Extract industry platforms (for threats/opportunities)
 */
async function extractIndustryPlatforms(industry, location = 'Singapore') {
    const extraction = {
        platforms: [],
        threatRelevant: [],
        opportunityRelevant: []
    };

    if (!SERP_API_KEY) return extraction;

    const PLATFORM_PATTERNS = {
        'Food & Beverage': {
            delivery: /deliveroo|foodpanda|grab[\s-]?food|uber[\s-]?eats|shopee[\s-]?food/gi,
            pos: /square|toast|lightspeed|shopify[\s-]?pos/gi
        },
        'E-commerce': {
            platform: /shopify|woocommerce|magento|lazada|shopee|carousell|qoo10/gi,
            payment: /stripe|paypal|square|adyen/gi
        },
        'Technology': {
            cloud: /aws|azure|gcp|google[\s-]?cloud|vercel|netlify/gi,
            nocode: /webflow|wix|squarespace|bubble/gi
        },
        'Professional Services': {
            crm: /salesforce|hubspot|zoho|pipedrive/gi
        }
    };

    const patterns = PLATFORM_PATTERNS[industry];
    if (!patterns) return extraction;

    try {
        const query = `${industry} platforms tools trends ${location} 2024 2025`;
        const response = await axios.get('https://serpapi.com/search', {
            params: {
                q: query,
                api_key: SERP_API_KEY,
                engine: 'google',
                num: 12
            },
            timeout: 5000
        });

        const results = response.data.organic_results || [];
        const platformCounts = {};
        
        for (const result of results) {
            const text = (result.snippet || '') + ' ' + (result.title || '');
            
            for (const [category, pattern] of Object.entries(patterns)) {
                const matches = text.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        const normalized = match.toLowerCase().trim();
                        platformCounts[normalized] = (platformCounts[normalized] || 0) + 1;
                    });
                }
            }
        }

        extraction.platforms = Object.entries(platformCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([platform]) => platform)
            .slice(0, 8);

        const threatCategories = ['delivery', 'platform', 'nocode'];
        const opportunityCategories = ['pos', 'payment', 'cloud', 'crm'];

        extraction.platforms.forEach(platform => {
            const patternName = Object.keys(patterns).find(key => 
                patterns[key].test(platform)
            );
            
            if (patternName && threatCategories.includes(patternName)) {
                extraction.threatRelevant.push(platform);
            }
            if (patternName && opportunityCategories.includes(patternName)) {
                extraction.opportunityRelevant.push(platform);
            }
        });

    } catch (err) {
        console.log('Platform extraction failed:', err.message);
    }

    return extraction;
}

/**
 * Extract awards and recognition
 */
async function extractAwardsRecognition(businessName, location) {
    const extraction = {
        awards: [],
        recentCount: 0
    };

    if (!SERP_API_KEY) return extraction;

    const queries = [
        `"${businessName}" award`,
        `"${businessName}" winner`,
        `"${businessName}" recognition`
    ];

    for (const query of queries) {
        try {
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    q: query,
                    api_key: SERP_API_KEY,
                    engine: 'google',
                    num: 5
                },
                timeout: 5000
            });

            const results = response.data.organic_results || [];
            
            for (const result of results) {
                const text = (result.snippet || '') + ' ' + (result.title || '');
                
                const awardKeywords = ['award', 'winner', 'recognition', 'honorable mention', 'excellence'];
                const hasAward = awardKeywords.some(kw => text.toLowerCase().includes(kw));
                
                if (!hasAward || !text.includes(businessName)) continue;
                
                const patterns = [
                    /([A-Z][^.]+(?:Award|Prize|Recognition))/,
                    /(Singapore\s+500\s+SME)/i,
                    /(Awwwards?\s+[^.]+)/i,
                    /([^.]+\s+of\s+the\s+Year)/i
                ];
                
                for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match) {
                        const yearMatch = text.match(/\b(20\d{2})\b/);
                        const year = yearMatch ? parseInt(yearMatch[1]) : null;
                        
                        extraction.awards.push({
                            name: match[1].trim(),
                            year: year,
                            source: result.link
                        });
                        
                        if (year && (new Date().getFullYear() - year) <= 3) {
                            extraction.recentCount++;
                        }
                        break;
                    }
                }
            }
        } catch (err) {
            console.log(`Award search failed for: ${query}`, err.message);
        }
    }

    // Deduplicate
    const seen = new Set();
    extraction.awards = extraction.awards.filter(award => {
        const key = award.name.toLowerCase().replace(/\s+/g, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return extraction;
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