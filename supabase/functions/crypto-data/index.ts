import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol = 'BTC' } = await req.json()
    const apiKey = Deno.env.get('CRYPTOCOMPARE_API_KEY')
    
    const [priceResponse, dailyHistoryResponse, hourlyHistoryResponse] = await Promise.all([
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=30&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=${symbol}&tsym=USD&limit=24&api_key=${apiKey}`)
    ]);

    const [priceData, dailyHistory, hourlyHistory] = await Promise.all([
      priceResponse.json(),
      dailyHistoryResponse.json(),
      hourlyHistoryResponse.json()
    ]);

    // Calculate predictions for future dates
    const prices = dailyHistory.Data.Data.map((d: any) => d.close);
    const ma7 = prices.slice(-7).reduce((a: number, b: number) => a + b, 0) / 7;
    const ma14 = prices.slice(-14).reduce((a: number, b: number) => a + b, 0) / 14;
    const trend = ma7 > ma14 ? 1.1 : 0.9; // 10% up or down

    // Generate predictions for next 6 months
    const predictions = Array.from({ length: 6 }).map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      const confidence = Math.max(0.4, 0.8 - (i * 0.1)); // Confidence decreases over time
      return {
        time: Math.floor(date.getTime() / 1000),
        price: priceData.USD * Math.pow(trend, i + 1),
        confidence,
      };
    });

    const responseData = {
      currentPrice: priceData.USD,
      dailyHistory: dailyHistory.Data.Data,
      hourlyHistory: hourlyHistory.Data.Data,
      predictions,
    };

    console.log('Crypto data response:', JSON.stringify(responseData));

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in crypto-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})