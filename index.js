const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

async function getMarketBySlug(slug) {
  const url = `https://gamma-api.polymarket.com/markets?slug=${slug}`;
  try {
    const response = await axios.get(url, { timeout: 10000 });
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
  } catch (error) {
    console.error(`Error fetching market ${slug}:`, error.message);
  }
  return null;
}

app.get('/api/price/:asset/:interval', async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Polymarket oracle running on port ${PORT}`);
});
