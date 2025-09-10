const axios = require('axios');

const PAYSTACK_BASE = 'https://api.paystack.co';
// Prefer env, but fall back to provided test key for local usage
const SECRET = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET || 'sk_test_67f955216713cbd2f95bb5e843800b55d3394a1b';
const DEFAULT_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || undefined;

function headers() {
  return { Authorization: `Bearer ${SECRET}` };
}

async function initializeTransaction({ email, amount, reference, callback_url }) {
  const payload = { email, amount, reference };
  if (callback_url || DEFAULT_CALLBACK_URL) {
    payload.callback_url = callback_url || DEFAULT_CALLBACK_URL;
  }
  const res = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, payload, { headers: headers() });
  return res.data;
}

async function verifyTransaction(reference) {
  const res = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, { headers: headers() });
  return res.data;
}

module.exports = { initializeTransaction, verifyTransaction };


