# 未来会計の夜明け（仮） ホームページ

財務研修団体「未来会計の夜明け」（仮称）の、戦略MG®を活用した研修サービスのホームページ制作プロジェクト。

> ※「戦略MG®」は、株式会社戦略MG研究所の登録商標です。

## 3つの置き場所と役割

| 場所 | 役割 | 置くもの |
|---|---|---|
| **GitHub**（このリポジトリ） | ホームページの本体・変更履歴 | HTML/CSS、表記ガイドライン、NGワードチェッカー |
| **[Googleドライブ](https://drive.google.com/drive/folders/1LiZqH4jrbWBKLZte-V2SFGckyL_bxfQY)**「未来会計の夜明け（仮）HPプロジェクト」 | 素材・共有資料 | 写真、ロゴ、原稿（Googleドキュメント）、見積・契約書類 |
| **[Notion](https://app.notion.com/p/4141bcaf88a78188b140d8cf7af9af0e)**「未来会計の夜明け（仮）HPプロジェクト」 | 進行管理・議事録 | タスク、決定事項、打合せメモ |

ルール：**決めたことは Notion、作ったものは GitHub / ドライブ**。迷ったら Notion に記録してリンクを貼る。

## 開発

```bash
npm install
npm run dev        # http://localhost:4321 でプレビュー
npm run build      # 表記チェック → 本番ビルド
```

- 設計：[docs/requirements.md](docs/requirements.md)（サイトマップ・機能・DB設計・LINE連携）
- 公開・連携の設定：[docs/setup.md](docs/setup.md)
- 表記ルール：[docs/brand-guideline.md](docs/brand-guideline.md)（必読）

## フォルダ構成

```
zaimuhp/
├── src/
│   ├── pages/            … 各ページ（/seminars はNotionから表示）
│   │   └── api/          … フォーム受付（submit.ts）・LINE Webhook
│   ├── components/       … ヘッダー・フッター・フォーム部品など
│   ├── data/             … 団体情報（site.ts）・文章データ（content.ts）
│   ├── content/news/     … お知らせ・コラム（Markdownを追加すると掲載）
│   ├── lib/              … Notion・顧客管理・LINE・メールの処理
│   └── styles/global.css … デザイン（色・フォント）
├── docs/                 … 設計書・設定手順・表記ガイドライン・作業ログ
└── tools/check_terms.py  … NGワード・商標表記チェッカー
```

## 表記チェック

```bash
npm run check:terms                  # src/ と dist/ を検査
python3 tools/check_terms.py 原稿.md  # 任意のファイルを検査
```

## 次にやること

- [x] 団体名の決定（仮称：未来会計の夜明け）
- [ ] 団体名の正式決定（商標調査のうえ「（仮）」を外す）
- [ ] ロゴの決定
- [ ] 研修メニュー・料金の確定
- [ ] 「戦略会計STRAC」等の要確認事項を戦略MG研究所に確認
- [x] サイト本体・フォーム・顧客DB連携の実装（v1）
- [ ] Cloudflare で公開・ドメイン取得（docs/setup.md）
- [ ] Notion・メール・公式LINEの接続（docs/setup.md）
- [ ] 講師情報・受講者の声・料金・特商法表記の確定
