/**
 * KASS — TapPay Direct Pay (pay-by-prime)
 * Endpoint: POST /api/pay
 */

module.exports = async function handler(req, res) {

  // ── CORS：所有回應都加 header，包含 OPTIONS preflight ──
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key'
  );

  // OPTIONS preflight → 直接 200
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, msg: 'Method not allowed' });
  }

  // ── 憑證（sandbox）──
  const PARTNER_KEY = process.env.TAPPAY_PARTNER_KEY
    || 'partner_O3WnIWgNbmq30PKPlkoitoopJOU22yTvtbzzyZDt011ERjZldeuEUzQ0';
  const MERCHANT_ID = process.env.TAPPAY_MERCHANT_ID || 'kass_TAISHIN';
  const ENDPOINT    = 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime';

  const { prime, amount, order_number, cardholder, details } = req.body || {};

  if (!prime)                        return res.status(400).json({ success: false, msg: '缺少 prime' });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, msg: '付款金額無效' });
  if (!order_number)                  return res.status(400).json({ success: false, msg: '缺少訂單編號' });

  // 電話格式：0912... → +886912...
  let phone = (cardholder?.phone_number || '').replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '886' + phone.slice(1);
  if (!phone.startsWith('+')) phone = '+' + phone;
  if (phone.length < 5) phone = '+886900000000';

  const payload = {
    prime,
    partner_key:  PARTNER_KEY,
    merchant_id:  MERCHANT_ID,
    amount:       Math.round(Number(amount)),
    currency:     'TWD',
    details:      (details || 'KASS 蛋糕訂單').slice(0, 100),
    cardholder: {
      phone_number: phone,
      name:         (cardholder?.name || 'KASS Customer').slice(0, 30),
      email:        cardholder?.email || 'order@kass.tw',
    },
    order_number,
    remember:            false,
    three_domain_secure: false,
  };

  console.log('[pay] merchant_id:', payload.merchant_id, '| amount:', payload.amount);
  console.log('[pay] prime (head):', prime.slice(0, 12) + '…');

  try {
    const tpRes = await fetch(ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    PARTNER_KEY,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await tpRes.text();
    console.log('[pay] HTTP status:', tpRes.status);
    console.log('[pay] raw response:', rawText.slice(0, 500));

    let data;
    try { data = JSON.parse(rawText); }
    catch (e) {
      return res.status(502).json({ success: false, msg: 'TapPay 回應非 JSON，HTTP ' + tpRes.status });
    }

    if (data.status === 0) {
      return res.status(200).json({
        success:             true,
        rec_trade_id:        data.rec_trade_id        || '',
        bank_transaction_id: data.bank_transaction_id || '',
        bank_result_code:    data.bank_result_code    || '',
        amount:              data.amount,
      });
    }

    return res.status(200).json({
      success: false,
      status:  data.status,
      msg:     data.msg || '付款失敗',
      hint:    statusHint(data.status),
    });

  } catch (err) {
    console.error('[pay] fetch error:', err.message);
    return res.status(500).json({ success: false, msg: 'Server error: ' + err.message });
  }
};

function statusHint(code) {
  const map = {
    '-1':  '系統錯誤，請稍後再試',
    '3':   'Prime 無效，請重新填寫信用卡',
    '10':  'Prime 已過期（有效期 90 秒），請重新填寫信用卡',
    '400': '請求參數錯誤',
    '401': 'PARTNER_KEY 驗證失敗',
    '403': 'MERCHANT_ID 無使用權限',
  };
  return map[String(code)] || 'TapPay 錯誤碼：' + code;
}
