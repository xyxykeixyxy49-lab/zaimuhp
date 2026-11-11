// 団体の基本情報・ナビゲーション。文言を変えるときはまずここを編集する。
export const site = {
  name: '未来会計の夜明け',
  nameKana: 'みらいかいけいのよあけ',
  tagline: '戦略MG®※で、経営と数字が「わかる」に変わる。',
  description:
    '経営者・研修担当者・税理士・会計士・個人事業主のための、戦略MG®を活用した体験型の経営・財務研修。東京・大阪・名古屋・宇都宮で開催。',
  // 以下は正式決定後に差し替える
  email: 'info@example.com',
  tel: '00-0000-0000',
  address: '〒000-0000 （所在地準備中）',
  representative: '（代表者名）',
  founded: '2026年',
  venues: ['東京', '大阪', '名古屋', '宇都宮'] as const,
};

export const trademarkNote = '※「戦略MG®」は、株式会社戦略MG研究所の登録商標です。';

export const nav = [
  { href: '/about/', label: '私たちについて' },
  { href: '/program/', label: '研修プログラム' },
  { href: '/seminars/', label: 'セミナー日程' },
  { href: '/corporate/', label: '法人研修' },
  { href: '/trainers/', label: '講師紹介' },
  { href: '/voices/', label: '受講者の声' },
  { href: '/faq/', label: 'よくある質問' },
  { href: '/news/', label: 'お知らせ' },
];

export const footerNav = [
  ...nav,
  { href: '/apply/', label: 'セミナー申込' },
  { href: '/document/', label: '資料請求' },
  { href: '/contact/', label: 'お問い合わせ' },
  { href: '/privacy/', label: 'プライバシーポリシー' },
  { href: '/tokushoho/', label: '特定商取引法に基づく表記' },
];

export const audiences = ['経営者', '研修担当者', '税理士', '公認会計士', '個人事業主', '会社員', 'その他'] as const;

// Notion データソースID（秘密情報ではない）。DBを作り直したらここを更新する。
export const notionIds = {
  seminars: 'f45032ea-0c8b-4835-a724-a1b7eb5c5cc3',
  contacts: '6bf8839d-9b78-4977-b105-8454e2164519',
  activities: '164d919b-3cb2-4f1c-87d8-0dbd523f4c77',
};

export const documents = ['研修案内パンフレット', '法人研修の料金表', 'セミナー日程表'] as const;
