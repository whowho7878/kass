/**
 * KASS — TapPay 退款 API
 * Endpoint: POST /api/tappay-refund
 *
 * TapPay Back-end API: Refund
 * https://docs.tappaysdk.com/tutorial/zh/back.html#refund
 *
 * Required Vercel env vars:
 *   TAPPAY_PARTNER_KEY
 *   TAPPAY_MERCHANT_ID
 *   TAPPAY_ENV
 *
 * Body:
 *   rec_trade_id  {string}  — TapPay rec_trade_id（必填）
 *   amount        {number}  — 退款金額，單位 NT$（選填，不填則全額退款）
 *   reason        {string}  — 退款原因（選填）
 */

const REFUND_URLS = {
  sandbox:    'https://sandbox.tappaysdk.com/tpc/transaction/refund',
  production: 'https://prod.tappaysdk.com/tpc/transaction/refund',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const PARTNER_KEY = process.env.TAPPAY_PARTNER_KEY
    || 'partner_O3WnIWgNbmq30PKPlkoitoopJOU22yTvtbzzyZDt011ERjZldeuEUzQ0';
  const ENV         = process.env.TAPPAY_ENV || 'sandbox';

  if (!PARTNER_KEY) {
    return res.status(500).json({ success: false, error: 'TAPPAY_PARTNER_KEY not configured in Vercel environment variables' });
  }

  const { rec_trade_id, amount, reason } = req.body || {};

  if (!rec_trade_id) {
    return res.status(400).json({ success: false, error: '請提供 rec_trade_id' });
  }

  const payload = {
    partner_key:  PARTNER_KEY,
    rec_trade_id,
  };

  // Only include amount if specified (otherwise TapPay does full refund)
  if (amount !== undefined && amount !== null && amount !== '') {
    payload.amount = Math.round(+amount);
  }

  if (reason) payload.bank_result_msg = reason;

  const url = REFUND_URLS[ENV] || REFUND_URLS.sandbox;

  try {
    const tpResp = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    PARTNER_KEY,
      },
      body: JSON.stringify(payload),
    });

    const tpData = await tpResp.json();

    // TapPay refund success: status === 0
    if (tpData.status !== 0) {
      return res.status(400).json({
        success: false,
        status:  tpData.status,
        error:   tpData.msg || `退款失敗 (TapPay status: ${tpData.status})`,
      });
    }

    return res.status(200).json({
      success:       true,
      rec_trade_id:  tpData.rec_trade_id || rec_trade_id,
      amount:        tpData.amount || amount,
      refund_id:     tpData.refund_id,
      message:       '退款成功',
    });

  } catch (err) {
    console.error('[tappay-refund]', err);
    return res.status(500).json({ success: false, error: 'Server error: ' + err.message });
  }
};
