# 公開・連携の設定手順

サイトは**設定なしでも動きます**（その場合、セミナー日程はサンプル表示、フォームは受付画面まで動作）。
以下を順に設定すると、各機能が有効になります。値はすべて Cloudflare の「設定 → 変数とシークレット」に登録します（ローカルは `.env`）。

## 1. Cloudflare に公開する

1. Cloudflare アカウントを作成
2. 「Workers & Pages」→「作成」→「GitHub と接続」→ `zaimuhp` を選択
3. ビルドコマンド：`npm run build`／デプロイコマンド：`npx wrangler deploy`
4. 独自ドメインを取得したら「カスタムドメイン」に設定し、`astro.config.mjs` の `site` を書き換える

> ビルド時に Cloudflare から `SESSION` KV の作成を求められた場合は、そのまま自動作成で問題ありません（本サイトでは未使用）。

## 2. Notion（顧客管理DB）をつなぐ

1. https://www.notion.so/profile/integrations で「新しいインテグレーション」を作成（種類：内部）
2. 表示された「シークレット」を `NOTION_TOKEN` に登録
3. Notion の「未来会計の夜明け（仮）HPプロジェクト」ページ右上「…」→「接続」→ 作ったインテグレーションを追加
   （配下の「セミナー」「顧客」「接点履歴」DB に自動で権限が付きます）
4. 「セミナー」DB で掲載したい回の **公開** にチェック → 5分以内にHPへ反映

## 3. メール通知（Resend）

| 変数 | 例 |
|---|---|
| `RESEND_API_KEY` | Resend の API キー |
| `MAIL_FROM` | `未来会計の夜明け <info@独自ドメイン>`（Resend で独自ドメイン認証が必要） |
| `ADMIN_EMAIL` | 申込通知を受け取るアドレス |

## 4. スパム対策（Cloudflare Turnstile）

Cloudflare ダッシュボード「Turnstile」でサイトを追加し、
`PUBLIC_TURNSTILE_SITE_KEY`（サイトキー）と `TURNSTILE_SECRET_KEY`（シークレット）を登録。

## 5. 公式LINE

### 5-1. 友だち追加ボタン
LINE公式アカウントマネージャー →「友だちを増やす」→ URL をコピーし `PUBLIC_LINE_ADD_FRIEND_URL` に登録。

### 5-2. 友だち追加を顧客DBに記録（Messaging API）
1. LINE Developers でプロバイダーを作成し、公式アカウントの Messaging API を有効化
2. 「チャネルシークレット」→ `LINE_CHANNEL_SECRET`、「チャネルアクセストークン（長期）」→ `LINE_CHANNEL_ACCESS_TOKEN`
3. Webhook URL に `https://<ドメイン>/api/line/webhook` を登録し「Webhookの利用」をオン
4. 公式アカウントマネージャーの「応答設定」で「Webhook」をオン（あいさつメッセージは任意）

### 5-3. LINE内からの申込を紐づける（LIFF）
1. LINE Developers で「LINEログイン」チャネルを作成 → チャネルID を `LINE_LOGIN_CHANNEL_ID`
2. 同チャネルで LIFF アプリを追加（エンドポイントURL：`https://<ドメイン>/`、スコープ：`openid` `profile`）→ LIFF ID を `PUBLIC_LIFF_ID`
3. リッチメニューのボタンに `https://liff.line.me/<LIFF ID>/seminars/` などを設定

## 6. オンライン決済

Stripe や Square の「支払いリンク」をセミナーごとに作成し、Notion「セミナー」DB の **決済リンク** に貼り付けます。申込完了ページと受付確認メールに支払いボタンが表示されます。

## 7. 日々の運用

| やること | 場所 |
|---|---|
| セミナーを追加・満席にする | Notion「セミナー」DB（受付状況・公開） |
| 申込・問い合わせを確認、対応状況を更新 | Notion「接点履歴」DB |
| 参加・欠席をつける／受講済みにする | 接点履歴「参加状況」→ 顧客「ステージ」 |
| お知らせ・コラムを書く | `src/content/news/` に Markdown を追加（Claude に依頼でもOK） |
| 文言を直す | `src/data/site.ts`・`src/data/content.ts` |
