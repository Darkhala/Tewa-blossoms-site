const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

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
      callback_url: "http://localhost:3001/api/pesapal/callback",
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

app.listen(PORT, () => {
  console.log(`✅ PesaPal backend listening on http://localhost:${PORT}`);
});
