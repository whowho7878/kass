/**
 * KASS — TapPay 單筆交易查詢 API
 * Endpoint: POST /api/tappay-query
 *
 * TapPay Back-end API: Get Records by Order Number or Rec Trade ID
 * https://docs.tappaysdk.com/tutorial/zh/back.html#get-records-by-order-number
 *
 * Required Vercel env vars:
 *   TAPPAY_PARTNER_KEY
 *   TAPPAY_MERCHANT_ID
 *   TAPPAY_ENV
 *
 * Body params (at least one required):
 *   rec_trade_id  — TapPay transaction ID
 *   order_number  — KASS order number (e.g., KASS-ABC123)
 */

const TAPPAY_URLS = {
  sandbox:    'https://sandbox.tappaysdk.com/tpc/transaction/query-by-rec-trade-id',
  production: 'https://prod.tappaysdk.com/tpc/transaction/query-by-rec-trade-id',
};

const TAPPAY_ORDER_URLS = {
  sandbox:    'https://sandbox.tappaysdk.com/tpc/transaction/query-by-order-number',
  production: 'https://prod.tappaysdk.com/tpc/transaction/query-by-order-number',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const PARTNER_KEY = process.env.TAPPAY_PARTNER_KEY
    || 'partner_O3WnIWgNbmq30PKPlkoitoopJOU22yTvtbzzyZDt011ERjZldeuEUzQ0';
  const MERCHANT_ID = process.env.TAPPAY_MERCHANT_ID || 'kass_TAISHIN';
  const ENV         = process.env.TAPPAY_ENV || 'sandbox';

  if (!PARTNER_KEY) {
    return res.status(500).json({ success: false, error: 'TAPPAY_PARTNER_KEY not configured' });
  }

  const { rec_trade_id, order_number } = req.body || {};

  if (!rec_trade_id && !order_number) {
    return res.status(400).json({ success: false, error: '請提供 rec_trade_id 或 order_number' });
  }

  let url, payload;

  if (rec_trade_id) {
    url = TAPPAY_URLS[ENV] || TAPPAY_URLS.sandbox;
    payload = { partner_key: PARTNER_KEY, rec_trade_id };
  } else {
    url = TAPPAY_ORDER_URLS[ENV] || TAPPAY_ORDER_URLS.sandbox;
    payload = { partner_key: PARTNER_KEY, merchant_id: MERCHANT_ID, order_number };
  }

  try {
    const tpResp = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': PARTNER_KEY },
      body: JSON.stringify(payload),
    });

    const tpData = await tpResp.json();

    if (tpData.status !== 0) {
      return res.status(400).json({
        success: false,
        status:  tpData.status,
        error:   tpData.msg || 'TapPay query error',
      });
    }

    // Normalise to array
    const records = tpData.trade_records || (tpData.trade_record ? [tpData.trade_record] : []);

    return res.status(200).json({ success: true, records });

  } catch (err) {
    console.error('[tappay-query]', err);
    return res.status(500).json({ success: false, error: 'Server error: ' + err.message });
  }
};
