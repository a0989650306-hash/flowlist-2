# FlowList 2.0 — LINE × AI × 跨裝置智慧待辦

## 功能
- LINE Official Account 文字與語音建單（語音使用 OpenAI transcription）
- AI 一則訊息拆解多項待辦、分類工作/私人、設定重要程度與截止日期
- 清楚事項自動建立；關鍵資訊不明時 LINE 追問，再回覆補充
- 使用 LINE Login 在手機與電腦登入，管理同一份待辦、完成打勾、編輯、刪除
- 每天台北時間 09:00 LINE 摘要（最長 5 分鐘排程延遲）
- 重要事項到期前 60 分鐘第一次排程掃描發 LINE 提醒

## 必備服務
1. LINE Developers：建立 **Messaging API channel**（綁定 LINE 官方帳號）及 **LINE Login channel**。**兩個 channel 必須在同一個 LINE Provider 之下**，否則 LINE user ID 不一定相同，資料無法同步。
2. Supabase 專案：在 SQL Editor 執行 `supabase/schema.sql`。
3. OpenAI API Key：支付 API 使用費。
4. 可公開連線的 HTTPS Node.js 主機（例如 Vercel）。

## 本機啟動
```bash
npm install
cp .env.example .env.local
# 填妥 .env.local
npm run dev
```

`.env.example` 為樣板；**不得將 `.env.local`、service role key、LINE channel secret、OpenAI key 上傳到公開程式碼儲存庫或放進前端**。

## LINE / Vercel 設定
- Messaging API Webhook URL：`https://你的網域/api/webhook/line`，啟用 webhook。
- LINE Login callback URL：`https://你的網域/api/auth/callback`。
- `NEXT_PUBLIC_APP_URL` 設成同一個 HTTPS 網域（不要尾端斜線）。
- 設定其餘環境變數（見 `.env.example`）。
- Vercel Cron 定時呼叫 `GET /api/cron`，帶 `Authorization: Bearer <CRON_SECRET>`。
- **注意：Vercel Hobby 計畫的 Cron 執行頻率有限制，`*/5 * * * *` 可能不受支援。**若要五分鐘掃描，請使用支援此頻率的付費方案，或其他可信的排程服務。這裡不會自動幫你購買或部署。
- 檢查 `GET /api/health` 回 `{ok:true}`。確定上述環境設好才可收 LINE 訊息。

## 基本驗收
1. 兩個 LINE channel 建於同一個 Provider；使用 LINE Login 登入網頁。
2. LINE 對官方帳號傳「明天下午 3 點寄公文，週五前完成主持稿」。
3. 預期 LINE 回覆列出已建立任務，網頁刷新可看到資料。
4. 在手機勾選完成，電腦重新整理可看到同步。
5. 在網頁建立重要待辦，設到期時間為未來 30–60 分鐘，人工觸發 `/api/cron` 並確認 LINE 收到提醒（請勿在正式環境暴露密鑰）。
6. 於台北時間 09:00–09:04 執行 Cron，確認收到摘要且同一天不重複發送。

## 已知限制／正式上線前事項
- **此版是部署用 MVP 程式碼，不代表已連接你的 LINE / Supabase / OpenAI 或通過真實端到端驗收。**
- LINE Webhook 目前同步執行 AI；官方建議非同步。高負載上線前應改成可重試的工作佇列，避免 LINE 逾時、Webhook 收到重送後原本處理失敗造成遺漏。
- `processed_events` 用於避免重複，但若中途失敗此筆會保留。正式版需加入 processing/failed 狀態、重試機制與定期清理。
- 摘要與提醒以「推送成功後記錄」方式運作。單一人使用負載不大，但崩潰競態下仍可能有少量重複通知；需要正式工作佇列才可保證可靠性。
- 目前每日摘要只掃描前 200 位使用者，每位前 100 項未完成事項；個人使用足夠。更多使用者須分頁。
- 若文字包含 8 項以上事項，AI 最多抽取 8 項；下一版需分批解析。
- 目前每次只保留一筆待釐清問答，若連續發送不同模糊事項可能覆蓋；正式版可改成依任務 ID 追問。
- 未提供時區選擇，全部使用 Asia/Taipei。
- LINE 使用者需先加官方帳號好友且未封鎖，推播成功與否受 LINE 官方 API 與訊息額度限制。
- 建議加上開發者管理白名單（特定 LINE User ID），防止陌生人消耗 API 額度；目前只有單人用途設計，但未內建白名單。
- 目前沒有 PWA 離線同步或主動推播，需網路使用。
- 正式部署前應進行安全測試、資料刪除 / 備份策略、API 費用預算及隱私告知。

## 技術
Next.js App Router / React / Supabase (service role only on server) / LINE Login + Messaging API / OpenAI Responses Structured Outputs / LINE 音訊 + OpenAI Transcriptions / Vercel Cron.

官方文件：
- https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/
- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://platform.openai.com/docs/guides/structured-outputs
