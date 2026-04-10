// polymarket-oracle/index.js
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper: fetch market data by slug
async function getMarketBySlug(slug) {
  const url = `https://gamma-api.polymarket.com/markets?slug=${slug}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data && data.length > 0) return data[0];
  return null;
}

// API endpoint
app.get('/api/price/:asset/:interval', async (req, res) => {
  const { asset, interval } = req.params;
  if (!['btc', 'eth'].includes(asset) || !['5m', '15m'].includes(interval)) {
    return res.status(400).json({ error: 'Invalid asset or interval' });
  }

  const period = interval === '5m' ? 300 : 900;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % period);
  const slug = `${asset}-updown-${interval}-${windowStart}`;
  const market = await getMarketBySlug(slug);
  if (!market) {
    return res.status(404).json({ error: 'Market not found' });
  }

  // Extract outcome prices
  let outcomePrices = market.outcomePrices;
  if (typeof outcomePrices === 'string') {
    outcomePrices = JSON.parse(outcomePrices);
  }
  if (!outcomePrices || outcomePrices.length < 2) {
    return res.status(500).json({ error: 'Missing outcome prices' });
  }

  const up = parseFloat(outcomePrices[0]);
  const down = parseFloat(outcomePrices[1]);
  const title = market.title || market.question;
  const upCents = Math.round(up * 100);
  const downCents = Math.round(down * 100);

  res.json({
    asset,
    interval,
    title,
    slug,
    up,
    down,
    upCents,
    downCents,
  });
});

app.listen(PORT, () => {
  console.log(`Polymarket oracle running on port ${PORT}`);
});
