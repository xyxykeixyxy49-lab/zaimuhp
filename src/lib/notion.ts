// Notion API の最小クライアント（fetch のみ。Cloudflare Workers で動く）
// https://developers.notion.com/reference
const API = 'https://api.notion.com/v1';
const VERSION = '2025-09-03';

export class NotionError extends Error {}

export async function notion<T = any>(token: string, path: string, body?: unknown, method = 'POST'): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': VERSION,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new NotionError(`Notion ${method} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export const queryDataSource = (token: string, dataSourceId: string, body: unknown) =>
  notion<{ results: any[] }>(token, `/data_sources/${dataSourceId}/query`, body);

export const createPage = (token: string, dataSourceId: string, properties: Record<string, unknown>) =>
  notion<{ id: string }>(token, '/pages', { parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties });

export const updatePage = (token: string, pageId: string, properties: Record<string, unknown>) =>
  notion<{ id: string }>(token, `/pages/${pageId}`, { properties }, 'PATCH');

export const getPage = (token: string, pageId: string) => notion<any>(token, `/pages/${pageId}`, undefined, 'GET');

// ---- プロパティ値の組み立て ----
const clip = (s: string) => s.slice(0, 1900);
export const p = {
  title: (s: string) => ({ title: [{ text: { content: clip(s) } }] }),
  text: (s: string) => ({ rich_text: s ? [{ text: { content: clip(s) } }] : [] }),
  select: (name: string) => ({ select: name ? { name } : null }),
  multi: (names: string[]) => ({ multi_select: names.map((name) => ({ name })) }),
  email: (s: string) => ({ email: s || null }),
  phone: (s: string) => ({ phone_number: s || null }),
  number: (n: number | null) => ({ number: n }),
  checkbox: (b: boolean) => ({ checkbox: b }),
  date: (start: string) => ({ date: { start } }),
  relation: (ids: string[]) => ({ relation: ids.map((id) => ({ id })) }),
};

// ---- プロパティ値の読み取り ----
export const read = {
  text: (prop: any): string =>
    (prop?.title ?? prop?.rich_text ?? []).map((t: any) => t.plain_text).join(''),
  select: (prop: any): string => prop?.select?.name ?? '',
  multi: (prop: any): string[] => (prop?.multi_select ?? []).map((o: any) => o.name),
  number: (prop: any): number | null => prop?.number ?? null,
  checkbox: (prop: any): boolean => !!prop?.checkbox,
  url: (prop: any): string => prop?.url ?? '',
  email: (prop: any): string => prop?.email ?? '',
  date: (prop: any): { start: string; end: string | null } | null => prop?.date ?? null,
};
