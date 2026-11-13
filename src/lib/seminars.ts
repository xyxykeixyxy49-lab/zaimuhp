import { getSecret } from 'astro:env/server';
import { notionIds } from '../data/site';
import { getPage, queryDataSource, read } from './notion';

export type Seminar = {
  id: string;
  title: string;
  start: string; // YYYY-MM-DD
  end: string | null;
  time: string;
  area: string; // 東京 / 大阪 / 名古屋 / 宇都宮 / オンライン
  venue: string;
  address: string;
  capacity: number | null;
  fee: string;
  kind: string;
  targets: string[];
  status: string; // 受付中 / 残りわずか / 満席 / 受付終了
  paymentUrl: string;
  summary: string;
  isSample?: boolean;
};

// Notion 未接続のとき（ローカル開発・プレビュー）に表示するサンプル
const SAMPLE: Seminar[] = [
  { id: 'sample-tokyo', title: '戦略MG 2日間コース', start: '2026-12-12', end: '2026-12-13', time: '10:00〜18:00（受付 9:30）', area: '東京', venue: '（会場調整中）', address: '', capacity: 12, fee: '初参加 44,000円（税込）／再受講 22,000円（税込）', kind: '公開セミナー', targets: ['経営者', '研修担当者', '初心者歓迎'], status: '受付中', paymentUrl: '', summary: '2日間で会社経営を3期分体験し、決算まで自分で行う基本コース。', isSample: true },
  { id: 'sample-osaka', title: '戦略MG 1日体験会', start: '2026-12-19', end: null, time: '10:00〜18:00（受付 9:30）', area: '大阪', venue: '（会場調整中）', address: '', capacity: 12, fee: '22,000円（税込）', kind: '体験会', targets: ['経営者', '個人事業主', '初心者歓迎'], status: '残りわずか', paymentUrl: '', summary: 'まずは1日で体験したい方向けのコース。', isSample: true },
  { id: 'sample-nagoya', title: '税理士・会計士のための戦略MG', start: '2027-01-16', end: '2027-01-17', time: '10:00〜18:00（受付 9:30）', area: '名古屋', venue: '（会場調整中）', address: '', capacity: 12, fee: '44,000円（税込）', kind: '公開セミナー', targets: ['税理士', '公認会計士'], status: '受付中', paymentUrl: '', summary: '顧問先への経営支援に活かす視点を加えた士業向けコース。', isSample: true },
  { id: 'sample-utsunomiya', title: '戦略MG 1日体験会', start: '2027-01-23', end: null, time: '10:00〜18:00（受付 9:30）', area: '宇都宮', venue: '（会場調整中）', address: '', capacity: 10, fee: '22,000円（税込）', kind: '体験会', targets: ['経営者', '個人事業主', '初心者歓迎'], status: '受付中', paymentUrl: '', summary: 'まずは1日で体験したい方向けのコース。', isSample: true },
];

const toSeminar = (page: any): Seminar => {
  const pr = page.properties;
  const d = read.date(pr['開催日']);
  return {
    id: page.id.replace(/-/g, ''),
    title: read.text(pr['タイトル']),
    start: d?.start?.slice(0, 10) ?? '',
    end: d?.end?.slice(0, 10) ?? null,
    time: read.text(pr['時間']),
    area: read.select(pr['会場区分']),
    venue: read.text(pr['会場名']),
    address: read.text(pr['住所']),
    capacity: read.number(pr['定員']),
    fee: read.text(pr['参加費']),
    kind: read.select(pr['種別']),
    targets: read.multi(pr['対象']),
    status: read.select(pr['受付状況']) || '受付中',
    paymentUrl: read.url(pr['決済リンク']),
    summary: read.text(pr['概要']),
  };
};

const todayJst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

export const isSampleMode = () => !getSecret('NOTION_TOKEN');

export async function listSeminars(): Promise<Seminar[]> {
  const token = getSecret('NOTION_TOKEN');
  if (!token) return SAMPLE;
  const { results } = await queryDataSource(token, notionIds.seminars, {
    filter: {
      and: [
        { property: '公開', checkbox: { equals: true } },
        { property: '開催日', date: { on_or_after: todayJst() } },
      ],
    },
    sorts: [{ property: '開催日', direction: 'ascending' }],
    page_size: 100,
  });
  return results.map(toSeminar);
}

export async function getSeminar(id: string): Promise<Seminar | null> {
  const token = getSecret('NOTION_TOKEN');
  if (!token) return SAMPLE.find((s) => s.id === id) ?? null;
  if (!/^[0-9a-f]{32}$/.test(id)) return null;
  try {
    const page = await getPage(token, id);
    const s = toSeminar(page);
    return read.checkbox(page.properties['公開']) ? s : null;
  } catch {
    return null;
  }
}

// 表示用ユーティリティ
const W = ['日', '月', '火', '水', '木', '金', '土'];
export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const w = W[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { y, m, d, w, label: `${y}年${m}月${d}日（${w}）` };
}
export function formatRange(s: Pick<Seminar, 'start' | 'end'>) {
  const a = formatDate(s.start);
  if (!s.end || s.end === s.start) return a.label;
  const b = formatDate(s.end);
  return `${a.label}〜${b.y === a.y && b.m === a.m ? '' : `${b.m}月`}${b.d}日（${b.w}）`;
}
export const isOpen = (s: Seminar) => s.status === '受付中' || s.status === '残りわずか';
