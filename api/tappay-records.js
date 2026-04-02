/**
 * KASS — TapPay 交易記錄查詢 API
 * Endpoint: POST /api/tappay-records
 *
 * TapPay Back-end API: Get Records by Filter
 * https://docs.tappaysdk.com/tutorial/zh/back.html#get-records-by-filter
 *
 * Required Vercel env vars:
 *   TAPPAY_PARTNER_KEY  — partner key
 *   TAPPAY_MERCHANT_ID  — merchant id (kass_TAISHIN)
 *   TAPPAY_ENV          — "sandbox" | "production"
 */

const TAPPAY_URLS = {
  sandbox:    'https://sandbox.tappaysdk.com/tpc/transaction/query-by-filter',
  production: 'https://prod.tappaysdk.com/tpc/transaction/query-by-filter',
};

module.exports = async (req, res) => {
  // CORS
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

  const {
    time,           // { start_time, end_time } — ISO strings or unix ms
    page_size = 20,
    offset    = 0,
    status,         // optional: 1=成功, 2=失敗, 3=退款
    order_number,   // optional filter
  } = req.body || {};

  // Build filter body for TapPay API
  const payload = {
    partner_key: PARTNER_KEY,
    merchant_id: MERCHANT_ID,
    page_size,
    offset,
  };

  if (time) {
    payload.time = {};
    if (time.start_time) payload.time.start_time = typeof time.start_time === 'number' ? time.start_time : new Date(time.start_time).getTime();
    if (time.end_time)   payload.time.end_time   = typeof time.end_time   === 'number' ? time.end_time   : new Date(time.end_time).getTime();
  }

  if (status !== undefined && status !== '') payload.status = status;
  if (order_number) payload.order_number = order_number;

  const url = TAPPAY_URLS[ENV] || TAPPAY_URLS.sandbox;

  try {
    const tpResp = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-api-key':     PARTNER_KEY,
      },
      body: JSON.stringify(payload),
    });

    const tpData = await tpResp.json();

    if (tpData.status !== 0) {
      return res.status(400).json({
        success: false,
        status:  tpData.status,
        error:   tpData.msg || 'TapPay API error',
      });
    }

    return res.status(200).json({
      success:      true,
      total:        tpData.trade_records?.length || 0,
      records:      tpData.trade_records || [],
      total_count:  tpData.number_of_records_in_range,
    });

  } catch (err) {
    console.error('[tappay-records]', err);
    return res.status(500).json({ success: false, error: 'Server error: ' + err.message });
  }
};
