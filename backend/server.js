const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const IS_SANDBOX = (process.env.MPESA_ENV || "sandbox").toLowerCase() !== "production";
const DARJA_BASE = IS_SANDBOX
  ? "https://sandbox.safaricom.co.ke"
  : "https://api.safaricom.co.ke";

// ✅ Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ Submit PesaPal order
app.post("/api/pesapal/submit-order", async (req, res) => {
  try {
    const { amount, description, email, phone } = req.body;

    // 1. Get OAuth token
    const tokenRes = await axios.post(
      "https://pay.pesapal.com/v3/api/Auth/RequestToken",
      {
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
      }
    );
    const token = tokenRes.data.token;

    // 2. Create order payload
    const order = {
      id: Date.now().toString(),
      currency: "KES",
      amount,
      description,
      callback_url: `http://localhost:${PORT}/api/pesapal/callback`,
      billing_address: {
        email_address: email,
        phone_number: phone,
        country_code: "KE",
        first_name: "Test",
        last_name: "User",
      },
    };

    // 3. Submit order
    const orderRes = await axios.post(
      "https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest",
      order,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(orderRes.data);
  } catch (err) {
    console.error("Pesapal Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Pesapal checkout failed" });
  }
});

// ====== M-Pesa Daraja STK Push Integration ======
async function getMpesaToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("Missing MPESA_CONSUMER_KEY/SECRET in env");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const url = `${DARJA_BASE}/oauth/v1/generate?grant_type=client_credentials`;
  const r = await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
  return r.data.access_token;
}

function mpesaPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

// Initiate STK Push
app.post("/api/mpesa/stkpush", async (req, res) => {
  try {
    const { amount, phone, reference } = req.body;
    if (!amount || !phone) return res.status(400).json({ error: "amount and phone required" });

    const token = await getMpesaToken();
    const BusinessShortCode = process.env.MPESA_SHORTCODE; // Till/Paybill
    const Passkey = process.env.MPESA_PASSKEY; // Daraja passkey
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:\.Z]/g, "")
      .slice(0, 14);
    const Password = mpesaPassword(BusinessShortCode, Passkey, timestamp);

    const payload = {
      BusinessShortCode,
      Password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Number(amount),
      PartyA: formatMsisdn(phone),
      PartyB: BusinessShortCode,
      PhoneNumber: formatMsisdn(phone),
      CallBackURL: process.env.MPESA_CALLBACK_URL || `http://localhost:${PORT}/api/mpesa/callback`,
      AccountReference: reference || `ORDER-${Date.now()}`,
      TransactionDesc: "Tewa Blooms Order",
    };

    const url = `${DARJA_BASE}/mpesa/stkpush/v1/processrequest`;
    const r = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20000,
    });

    res.json(r.data);
  } catch (err) {
    console.error("M-Pesa STK Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to initiate STK Push" });
  }
});

function formatMsisdn(phone) {
  let p = (phone || "").toString().trim();
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (!p.startsWith("254")) {
    // naive fallback
    p = "254" + p;
  }
  return p;
}

// Callback to receive payment result
app.post("/api/mpesa/callback", (req, res) => {
  // Safaricom posts JSON; ensure raw body captured if needed. We use express.json() above.
  try {
    const data = req.body;
    console.log("M-Pesa Callback:", JSON.stringify(data, null, 2));
    // TODO: Verify resultCode === 0 and persist transaction
  } catch (e) {
    console.error("Callback processing error", e);
  }
  // Always respond 200 OK quickly
  res.json({ received: true });
});

app.listen(PORT, () => {
  console.log(`✅ Backend listening on http://localhost:${PORT}`);
});
