import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol = 'BTC' } = await req.json();
    const cryptoCompareApiKey = Deno.env.get('CRYPTOCOMPARE_API_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    console.log('Starting enhanced prediction analysis for:', symbol);

    // Fetch price data from CryptoCompare
    const [priceData, historicalData, orderBookData] = await Promise.all([
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=30&api_key=${cryptoCompareApiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/ob/l2/snapshot?fsym=${symbol}&tsym=USD&api_key=${cryptoCompareApiKey}`)
    ]);

    const [priceResponse, historicalResponse, orderBookResponse] = await Promise.all([
      priceData.json(),
      historicalData.json(),
      orderBookData.json()
    ]);

    console.log('Successfully fetched price data');

    // Fetch sentiment data using FireCrawl
    const sentimentResponse = await fetch('https://api.firecrawl.xyz/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [
          `https://twitter.com/search?q=${symbol}%20crypto`,
          `https://reddit.com/r/cryptocurrency/search?q=${symbol}`,
          `https://www.tradingview.com/symbols/${symbol}USD/`
        ],
        scrapeOptions: {
          formats: ['text'],
          selectors: ['.tweet-text', '.post-title', '.post-content', '.tv-symbol-price-quote__value']
        }
      })
    });

    const sentimentData = await sentimentResponse.json();
    console.log('Successfully fetched sentiment data');

    // Process historical price data
    const prices = historicalResponse.Data.Data.map((d: any) => d.close);
    const volumes = historicalResponse.Data.Data.map((d: any) => d.volumeto);

    // Calculate technical indicators
    const calculateRSI = (prices: number[], period = 14) => {
      const changes = prices.slice(1).map((price, i) => price - prices[i]);
      const gains = changes.map(change => change > 0 ? change : 0);
      const losses = changes.map(change => change < 0 ? -change : 0);
      
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      const RS = avgGain / (avgLoss || 1);
      return 100 - (100 / (1 + RS));
    };

    const calculateVolatility = (prices: number[]) => {
      const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]));
      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
      return Math.sqrt(variance * 252) * 100;
    };

    // Analyze sentiment
    const analyzeSentiment = (data: any) => {
      const sentimentKeywords = {
        positive: ['bullish', 'buy', 'moon', 'pump', 'growth', 'potential', 'undervalued'],
        negative: ['bearish', 'sell', 'dump', 'crash', 'overvalued', 'scam', 'weak']
      };

      let positiveCount = 0;
      let negativeCount = 0;
      const content = (data?.data || []).join(' ').toLowerCase();
      
      sentimentKeywords.positive.forEach(keyword => {
        positiveCount += (content.match(new RegExp(keyword, 'g')) || []).length;
      });

      sentimentKeywords.negative.forEach(keyword => {
        negativeCount += (content.match(new RegExp(keyword, 'g')) || []).length;
      });

      const totalMentions = positiveCount + negativeCount;
      return totalMentions > 0 ? (positiveCount - negativeCount) / totalMentions : 0;
    };

    // Generate predictions
    const generatePrediction = (timeframe: number) => {
      const currentPrice = priceResponse.USD;
      const rsi = calculateRSI(prices);
      const volatility = calculateVolatility(prices);
      const sentiment = analyzeSentiment(sentimentData);
      
      // Market depth analysis
      const orderBookBids = orderBookResponse.Data?.bids || [];
      const orderBookAsks = orderBookResponse.Data?.asks || [];
      const buyPressure = orderBookBids.reduce((sum: number, [price, quantity]: number[]) => sum + price * quantity, 0);
      const sellPressure = orderBookAsks.reduce((sum: number, [price, quantity]: number[]) => sum + price * quantity, 0);
      const orderBookRatio = buyPressure / (sellPressure || 1);

      // Technical factors
      const momentum = (currentPrice / prices[prices.length - 7] - 1) * 100;
      const volumeTrend = volumes.slice(-7).reduce((a, b) => a + b, 0) / 7 > 
                         volumes.slice(-30, -7).reduce((a, b) => a + b, 0) / 23;
      
      // Combined prediction factors
      const technicalScore = (
        (rsi > 70 ? -0.2 : rsi < 30 ? 0.2 : 0) +
        (momentum > 0 ? 0.2 : -0.2) +
        (volumeTrend ? 0.1 : -0.1) +
        (orderBookRatio > 1 ? 0.1 : -0.1)
      );

      const sentimentImpact = sentiment * 0.3;
      const volatilityAdjustment = 1 - (volatility / 200);
      const trend = 1 + (technicalScore + sentimentImpact) * volatilityAdjustment;

      // Calculate confidence based on multiple factors
      const confidence = Math.min(0.95, Math.abs(technicalScore) * 0.4 + 
                                     Math.abs(sentiment) * 0.3 +
                                     (orderBookRatio > 0.8 && orderBookRatio < 1.2 ? 0.3 : 0.1));

      const date = new Date();
      date.setDate(date.getDate() + timeframe);

      return {
        time: Math.floor(date.getTime() / 1000),
        price: currentPrice * Math.pow(trend, timeframe/7),
        confidence: confidence * 100
      };
    };

    const predictions = {
      day: generatePrediction(1),
      week: generatePrediction(7),
      twoWeeks: generatePrediction(14),
      month: generatePrediction(30),
      threeMonths: generatePrediction(90),
      sixMonths: generatePrediction(180)
    };

    const technicalAnalysis = {
      rsi: calculateRSI(prices),
      volatility: calculateVolatility(prices),
      ma7: prices.slice(-7).reduce((a, b) => a + b, 0) / 7,
      ma14: prices.slice(-14).reduce((a, b) => a + b, 0) / 14,
      ma30: prices.slice(-30).reduce((a, b) => a + b, 0) / 30,
      ma50: prices.slice(-50).reduce((a, b) => a + b, 0) / 50,
      ma200: prices.slice(-200).reduce((a, b) => a + b, 0) / 200,
      volumeTrend: volumes.slice(-7).reduce((a, b) => a + b, 0) / 7 > 
                  volumes.slice(-30, -7).reduce((a, b) => a + b, 0) / 23 
                  ? "increasing" : "decreasing",
      marketSentiment: analyzeSentiment(sentimentData) > 0 ? "bullish" : "bearish"
    };

    const responseData = {
      currentPrice: priceResponse.USD,
      history: historicalResponse.Data.Data,
      predictions,
      technicalAnalysis,
      lastUpdated: new Date().toISOString()
    };

    console.log('Successfully generated enhanced predictions');

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in enhanced-crypto-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});