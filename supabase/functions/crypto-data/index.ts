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
    
    const [priceResponse, historyResponse] = await Promise.all([
      fetch(`https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD&api_key=${apiKey}`),
      fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=30&api_key=${apiKey}`)
    ])

    const priceData = await priceResponse.json()
    const historyData = await historyResponse.json()

    return new Response(
      JSON.stringify({
        currentPrice: priceData.USD,
        history: historyData.Data.Data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})