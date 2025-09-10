const twilio = require('twilio');

function getClient() {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  if (!sid || !token) throw new Error('Missing Twilio credentials');
  return twilio(sid, token);
}

async function sendSms(to, body) {
  const client = getClient();
  const from = process.env.TWILIO_FROM;
  if (!from) throw new Error('Missing TWILIO_FROM');
  await client.messages.create({ to, from, body });
}

module.exports = { sendSms };




