# KASS 蛋糕預訂系統

> 西門萬華 · 電影底片美學 · 精品甜點品牌

---

## 🌐 頁面入口

| 路徑 | 說明 |
|------|------|
| `/index.html` | 品牌首頁（電影底片風格，含 Hero、品牌故事、產品展示、購物車） |
| `/shop.html` | 4步驟完整訂購流程 |
| `/order.html` | 訂單查詢頁 |
| `/sitemap.html` | 網站地圖 |
| `/admin/login.html` | 後台登入（帳號: admin / 密碼: kass2026） |
| `/admin/index.html` | 後台管理主頁（需登入） |

---

## ✅ 已完成功能

### 前台
- 電影底片風格動畫（底片邊框、膠捲孔、timecode、grain 噪點）
- 深色/淺色模式切換（localStorage 持久化）
- 繁體中文/英文語言切換
- 產品展示（栗子蛋糕、草莓蛋糕、芋頭蛋糕）
- 購物車（步驟1確認商品、步驟2結帳）
- TapPay 金流（信用卡、Apple Pay、Google Pay、LINE Pay）
- Ocard 會員點數整合
- 訂購成功頁面

### 後台 (`/admin/`)
- **登入頁** — 帳號密碼驗證，session 保護
- **儀表板** — 本月營業額、訂單數、待處理訂單、產品上架數；近7日訂單趨勢圖；各尺寸銷售佔比圓餅圖；最新訂單列表
- **產品管理** — 新增/編輯/刪除產品；圖片上傳（Base64/URL）；中英文名稱、描述；4吋/6吋/9吋獨立定價；分類標籤、上下架；排序
- **訂單管理** — 全部訂單列表；搜尋/篩選（狀態/付款方式）；訂單詳情彈窗；手動標記付款；一鍵申請退款
- **TapPay 交易查詢** — 依日期範圍查詢交易記錄；單筆 Rec Trade ID / 訂單號查詢；直接從查詢結果申請退款
- **退款管理** — 退款列表；透過 `/api/tappay-refund` 呼叫 TapPay 後台 API
- **會員管理** — 依訂單聚合統計（電話/消費次數/累計金額/首次/最近消費）
- **系統設定** — TapPay 金流設定檢視；Vercel 環境變數說明；密碼管理；店鋪資訊

---

## 🔌 API Endpoints

| 路徑 | 方法 | 說明 |
|------|------|------|
| `POST /api/pay` | POST | TapPay pay-by-prime 付款（前台使用） |
| `POST /api/tappay-records` | POST | 依條件查詢交易記錄列表 |
| `POST /api/tappay-query` | POST | 查詢單筆交易（by rec_trade_id / order_number） |
| `POST /api/tappay-refund` | POST | 申請退款（by rec_trade_id） |
| `GET/POST tables/orders` | REST | 訂單資料表 CRUD |
| `GET/POST tables/products` | REST | 產品資料表 CRUD |

### `/api/tappay-records` 請求格式
```json
{
  "time": { "start_time": "2026-01-01T00:00:00", "end_time": "2026-04-02T23:59:59" },
  "page_size": 20,
  "status": 1
}
```

### `/api/tappay-query` 請求格式
```json
{ "rec_trade_id": "XXXXXX" }
// 或
{ "order_number": "KASS-ABCDEF" }
```

### `/api/tappay-refund` 請求格式
```json
{
  "rec_trade_id": "XXXXXX",
  "amount": 780,
  "reason": "客戶申請退款"
}
```

---

## 🔐 TapPay 設定

| 項目 | 值 |
|------|------|
| Merchant ID | `kass_TAISHIN` |
| APP ID | `168069` |
| 環境 | `sandbox`（測試）|
| Partner Key | 儲存於 Vercel 環境變數 `TAPPAY_PARTNER_KEY` |

### Vercel 環境變數（必須設定）
```
TAPPAY_PARTNER_KEY = partner_O3WnIWgNbmq30PKPlkoitoopJOU22yTvtbzzyZDt011ERjZldeuEUzQ0
TAPPAY_MERCHANT_ID = kass_TAISHIN
TAPPAY_ENV         = sandbox
```

---

## 🗃️ 資料模型

### `orders` 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| order_number | text | KASS-XXXXXX |
| customer_name | text | 客戶姓名 |
| phone | text | 聯絡電話 |
| email | text | Email |
| delivery_method | text | delivery / pickup |
| delivery_address | text | 外送地址 |
| pickup_date | text | 取貨日期 |
| pickup_time | text | 取貨時間 |
| items | text | JSON 字串（商品陣列） |
| subtotal_amount | number | 小計 |
| discount_amount | number | 折扣 |
| total_amount | number | 總金額 |
| payment_method | text | card / apple_pay / google_pay / line_pay |
| status | text | pending / paid / refunded / cancelled |
| tap_rec_trade_id | text | TapPay 交易 ID |
| refund_amount | number | 退款金額 |
| refund_time | number | 退款時間戳 |

### `products` 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| key | text | 產品識別碼 |
| name | text | 中文名稱 |
| name_en | text | 英文名稱 |
| desc | rich_text | 中文描述 |
| category | text | cake / giftbox |
| tag | text | Signature / Classic / House Special |
| status | text | active / inactive |
| sort | number | 排序 |
| img | text | 圖片路徑 |
| price_4/6/9 | number | 各尺寸售價 |

---

## 🚀 部署說明

1. 前往 **Publish Tab** 部署至 Vercel
2. 在 Vercel Dashboard → Settings → Environment Variables 加入：
   - `TAPPAY_PARTNER_KEY`
   - `TAPPAY_MERCHANT_ID`
   - `TAPPAY_ENV`
3. 重新 Deploy 後金流與後台 API 才會完整運作
4. ⚠️ 正式上線前，將 TapPay 設定從 `sandbox` 切換為 `production`

---

## 🔮 建議下一步

- [ ] 實裝 LINE LIFF / LINE Official Account 按鈕
- [ ] 串接 Lalamove API 計算外送費用
- [ ] 產品圖片改用正式拍攝（建議 1000×1500px 美式電影海報規格）
- [ ] 後台密碼改用 Vercel KV 或 serverless 驗證，避免明碼儲存
- [ ] 訂單確認 Email 通知（Resend / SendGrid）
- [ ] 將 TapPay 從 `sandbox` 切換為 `production` 並更換正式憑證
