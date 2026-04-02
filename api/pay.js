/**
 * KASS — TapPay Direct Pay (pay-by-prime)
 * 測試環境，憑證直接寫入
 *
 * TapPay Direct Pay 後端 API 規格：
 * https://docs.tappaysdk.com/direct-pay/zh/back.html#pay-by-prime-api
 *
 * Endpoint (sandbox): POST https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime
 * Header: x-api-key = partner_key
 */

module.exports = async function handler(req, res) {
  // ── CORS ──
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, msg: 'Method not allowed' });
  }

  // ── 測試憑證（sandbox）直接寫入 ──
  const PARTNER_KEY = 'partner_O3WnIWgNbmq30PKPlkoitoopJOU22yTvtbzzyZDt011ERjZldeuEUzQ0';
  const MERCHANT_ID = 'kass_TAISHIN';
  const ENDPOINT    = 'https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime';

  // ── 接收前端傳入的參數 ──
  const { prime, amount, order_number, cardholder, details } = req.body || {};

  // ── 基本驗證 ──
  if (!prime)                        return res.status(400).json({ success: false, msg: '缺少 prime' });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, msg: '付款金額無效' });
  if (!order_number)                  return res.status(400).json({ success: false, msg: '缺少訂單編號' });

  // ── 處理 phone_number 格式（TapPay 需要 +886 國際格式）──
  let phone = (cardholder?.phone_number || '').replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '886' + phone.slice(1);
  if (!phone.startsWith('+')) phone = '+' + phone;
  if (phone === '+') phone = '+886900000000'; // fallback

  // ── 組裝 TapPay pay-by-prime payload（嚴格依照官方文件）──
  const payload = {
    prime,
    partner_key:  PARTNER_KEY,
    merchant_id:  MERCHANT_ID,
    amount:       Math.round(Number(amount)),   // 整數，單位：元
    currency:     'TWD',
    details:      (details || 'KASS 蛋糕訂單').slice(0, 100), // 最多 100 字
    cardholder: {
      phone_number: phone,
      name:         (cardholder?.name  || 'KASS Customer').slice(0, 30),
      email:        cardholder?.email  || 'order@kass.tw',  // email 為必填，不可空字串
    },
    order_number,
    remember:            false,
    three_domain_secure: false,
  };

  console.log('[pay] → sandbox pay-by-prime');
  console.log('[pay] merchant_id :', payload.merchant_id);
  console.log('[pay] amount      :', payload.amount);
  console.log('[pay] order_number:', payload.order_number);
  console.log('[pay] cardholder  :', JSON.stringify(payload.cardholder));
  console.log('[pay] prime (head):', prime.slice(0, 12) + '…');

  try {
    const tpRes = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    PARTNER_KEY,          // TapPay Direct Pay 必填 header
      },
      body: JSON.stringify(payload),
    });

    const rawText = await tpRes.text();
    console.log('[pay] HTTP status :', tpRes.status);
    console.log('[pay] raw response:', rawText.slice(0, 500));

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return res.status(502).json({
        success: false,
        msg: 'TapPay 回應非 JSON，HTTP ' + tpRes.status,
        raw: rawText.slice(0, 200),
      });
    }

    // ── TapPay status === 0 代表成功 ──
    if (data.status === 0) {
      console.log('[pay] ✅ 成功 rec_trade_id:', data.rec_trade_id);
      return res.status(200).json({
        success:             true,
        rec_trade_id:        data.rec_trade_id        || '',
        bank_transaction_id: data.bank_transaction_id || '',
        bank_result_code:    data.bank_result_code    || '',
        amount:              data.amount,
      });
    }

    // ── 失敗：把 TapPay 原始 status + msg 都回傳方便除錯 ──
    console.warn('[pay] ❌ TapPay status:', data.status, '| msg:', data.msg);
    return res.status(200).json({
      success: false,
      status:  data.status,
      msg:     data.msg || '付款失敗',
      hint:    statusHint(data.status),
    });

  } catch (err) {
    console.error('[pay] fetch 例外:', err.message);
    return res.status(500).json({ success: false, msg: 'Server error: ' + err.message });
  }
};

// TapPay 常見狀態碼說明
function statusHint(code) {
  const map = {
    '-1':   '系統錯誤，請稍後再試',
    '2':    'SDK 未正確初始化，請重新整理頁面',
    '3':    'Prime 無效，請重新填寫信用卡',
    '4':    '信用卡卡號有誤',
    '5':    '信用卡到期日有誤',
    '6':    'CVV 有誤',
    '10':   'Prime 已過期（有效期 90 秒），請重新填寫信用卡',
    '400':  '請求參數錯誤，請確認 cardholder 欄位格式',
    '401':  'PARTNER_KEY 驗證失敗',
    '403':  'MERCHANT_ID 無使用權限',
    '404':  'Merchant 不存在',
    '10003':'付款失敗，請確認卡片是否有效',
    '10013':'卡片餘額不足',
    '10015':'卡片已停用',
  };
  return map[String(code)] || ('TapPay 錯誤碼：' + code);
}
