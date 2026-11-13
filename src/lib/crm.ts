// 顧客DB・接点履歴DB（Notion）への書き込み。
// 同一人物の判定：メールアドレス、または LINEユーザーID。
import { notionIds } from '../data/site';
import { createPage, p, queryDataSource, read, updatePage } from './notion';

export type Channel = 'ホームページ' | '公式LINE';
export type ActivityType = 'セミナー申込' | '資料請求' | '問い合わせ' | '法人研修相談' | 'LINE友だち追加' | 'LINEブロック';

// ステージは「進んだ」ときだけ更新する（後退させない）
const STAGES = ['LINE友だち', '資料請求', '問い合わせ', 'セミナー申込', '受講済み', 'リピーター', '法人契約'] as const;
const STAGE_OF: Record<ActivityType, (typeof STAGES)[number] | null> = {
  'LINE友だち追加': 'LINE友だち',
  '資料請求': '資料請求',
  '問い合わせ': '問い合わせ',
  '法人研修相談': '問い合わせ',
  'セミナー申込': 'セミナー申込',
  'LINEブロック': null,
};

export type ContactInput = {
  name?: string;
  kana?: string;
  company?: string;
  position?: string;
  audience?: string;
  email?: string;
  tel?: string;
  prefecture?: string;
  lineUserId?: string;
  consent?: boolean;
};

const nowIso = () => new Date().toISOString();

async function findContact(token: string, c: ContactInput) {
  const or: any[] = [];
  if (c.email) or.push({ property: 'メール', email: { equals: c.email } });
  if (c.lineUserId) or.push({ property: 'LINEユーザーID', rich_text: { equals: c.lineUserId } });
  if (!or.length) return null;
  const { results } = await queryDataSource(token, notionIds.contacts, { filter: { or }, page_size: 1 });
  return results[0] ?? null;
}

export async function upsertContact(token: string, c: ContactInput, type: ActivityType, channel: Channel) {
  const existing = await findContact(token, c);
  const stage = STAGE_OF[type];
  const now = nowIso();

  if (!existing) {
    const props: Record<string, unknown> = {
      '氏名': p.title(c.name || '（未入力）'),
      'フリガナ': p.text(c.kana ?? ''),
      '会社名': p.text(c.company ?? ''),
      '役職': p.text(c.position ?? ''),
      'メール': p.email(c.email ?? ''),
      '電話': p.phone(c.tel ?? ''),
      '都道府県': p.text(c.prefecture ?? ''),
      'LINEユーザーID': p.text(c.lineUserId ?? ''),
      'LINE友だち': p.checkbox(type === 'LINE友だち追加'),
      '初回流入': p.select(channel),
      '案内配信の同意': p.checkbox(!!c.consent),
      '初回接点日': p.date(now),
      '最終接点日': p.date(now),
    };
    if (c.audience) props['属性'] = p.select(c.audience);
    if (stage) props['ステージ'] = p.select(stage);
    return (await createPage(token, notionIds.contacts, props)).id;
  }

  // 既存：空欄だけ埋める＋最終接点日・ステージ更新
  const ex = existing.properties;
  const props: Record<string, unknown> = { '最終接点日': p.date(now) };
  const fill = (key: string, val: string | undefined, make: (v: string) => unknown, cur: string) => {
    if (val && !cur) props[key] = make(val);
  };
  const exName = read.text(ex['氏名']);
  if (c.name && (exName === '（未入力）' || (type !== 'LINE友だち追加' && ex['LINE友だち']?.checkbox && !read.email(ex['メール'])))) {
    // LINE表示名で作られた顧客に、フォームで本名が入ったら上書き
    props['氏名'] = p.title(c.name);
  }
  fill('フリガナ', c.kana, p.text, read.text(ex['フリガナ']));
  fill('会社名', c.company, p.text, read.text(ex['会社名']));
  fill('役職', c.position, p.text, read.text(ex['役職']));
  fill('メール', c.email, p.email, read.email(ex['メール']));
  fill('電話', c.tel, p.phone, ex['電話']?.phone_number ?? '');
  fill('都道府県', c.prefecture, p.text, read.text(ex['都道府県']));
  fill('LINEユーザーID', c.lineUserId, p.text, read.text(ex['LINEユーザーID']));
  if (c.audience && !read.select(ex['属性'])) props['属性'] = p.select(c.audience);
  if (c.consent) props['案内配信の同意'] = p.checkbox(true);
  if (type === 'LINE友だち追加') props['LINE友だち'] = p.checkbox(true);
  if (type === 'LINEブロック') props['LINE友だち'] = p.checkbox(false);
  const cur = read.select(ex['ステージ']) as (typeof STAGES)[number];
  if (stage && STAGES.indexOf(stage) > STAGES.indexOf(cur)) props['ステージ'] = p.select(stage);
  await updatePage(token, existing.id, props);
  return existing.id as string;
}

export type ActivityInput = {
  type: ActivityType;
  channel: Channel;
  contactId: string;
  subject: string;
  seminarId?: string;
  persons?: number | null;
  documents?: string[];
  body?: string;
  source?: string;
};

export async function recordActivity(token: string, a: ActivityInput) {
  const props: Record<string, unknown> = {
    '件名': p.title(a.subject),
    '種別': p.select(a.type),
    '経路': p.select(a.channel),
    '顧客': p.relation([a.contactId]),
    '対応状況': p.select(a.type.startsWith('LINE') ? '完了' : '新規'),
    '内容': p.text(a.body ?? ''),
    '流入元': p.text(a.source ?? ''),
    '受付日時': p.date(nowIso()),
  };
  if (a.seminarId && /^[0-9a-f]{32}$/.test(a.seminarId)) {
    props['セミナー'] = p.relation([a.seminarId]);
    props['参加状況'] = p.select('申込');
  }
  if (a.persons) props['参加人数'] = p.number(a.persons);
  if (a.documents?.length) props['希望資料'] = p.multi(a.documents);
  return createPage(token, notionIds.activities, props);
}
