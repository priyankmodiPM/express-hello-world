// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const whatsappToken = process.env.WHATSAPP_TOKEN;

const DISCOUNT_IMAGE_URL = 'https://s7ap1.scene7.com/is/image/varun/diwali-offer2-updated';

async function sendImageMessage(to) {
  const url = `https://graph.facebook.com/v19.0/${whatsappPhoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: { link: DISCOUNT_IMAGE_URL },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${whatsappToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WhatsApp API error ${response.status}: ${text}`);
  }

  return response.json();
}

// Route for GET requests
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  // Acknowledge immediately so WhatsApp doesn't retry
  res.status(200).end();

  try {
    const messages = req.body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return;

    for (const message of messages) {
      const text = message?.text?.body ?? '';
      if (text.toLowerCase().includes('update the discount')) {
        console.log(`Sending discount image to ${message.from}`);
        await sendImageMessage(message.from);
        console.log(`Discount image sent to ${message.from}`);
      }
    }
  } catch (err) {
    console.error('Error handling message:', err.message);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
