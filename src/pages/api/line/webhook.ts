// 公式LINE の Webhook。LINE Developers の Messaging API 設定で
//   Webhook URL = https://<ドメイン>/api/line/webhook
// を登録する。友だち追加・ブロックを顧客DB/接点履歴に記録する。
import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { site } from '../../../data/site';
import { recordActivity, upsertContact } from '../../../lib/crm';
import { getProfile, reply, verifySignature } from '../../../lib/line';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, url }) => {
  const secret = getSecret('LINE_CHANNEL_SECRET');
  const accessToken = getSecret('LINE_CHANNEL_ACCESS_TOKEN');
  if (!secret || !accessToken) return new Response('LINE not configured', { status: 503 });

  const raw = await request.text();
  if (!(await verifySignature(secret, raw, request.headers.get('x-line-signature')))) {
    return new Response('invalid signature', { status: 401 });
  }

  const { events = [] } = JSON.parse(raw) as { events: any[] };
  const notionToken = getSecret('NOTION_TOKEN');
  const origin = url.origin;

  const work = (async () => {
    for (const ev of events) {
      const userId: string | undefined = ev.source?.userId;
      if (!userId) continue;
      try {
        if (ev.type === 'follow') {
          const profile = await getProfile(accessToken, userId);
          if (notionToken) {
            const id = await upsertContact(notionToken, { name: profile?.displayName ? `${profile.displayName}（LINE）` : '', lineUserId: userId }, 'LINE友だち追加', '公式LINE');
            await recordActivity(notionToken, { type: 'LINE友だち追加', channel: '公式LINE', contactId: id, subject: `LINE友だち追加：${profile?.displayName ?? ''}` });
          }
          await reply(accessToken, ev.replyToken, [
            {
              type: 'text',
              text: `友だち追加ありがとうございます！\n${site.name}です。\n\n▼セミナー日程\n${origin}/seminars/?utm_source=line\n▼資料請求\n${origin}/document/?utm_source=line\n▼お問い合わせ\n${origin}/contact/?utm_source=line`,
            },
          ]);
        } else if (ev.type === 'unfollow' && notionToken) {
          const id = await upsertContact(notionToken, { lineUserId: userId }, 'LINEブロック', '公式LINE');
          await recordActivity(notionToken, { type: 'LINEブロック', channel: '公式LINE', contactId: id, subject: 'LINEブロック' });
        }
      } catch (e) {
        console.error('LINE webhook error', e);
      }
    }
  })();

  // Cloudflare では応答後も処理を続けられる
  const ctx = (locals as any)?.cfContext ?? (locals as any)?.runtime?.ctx;
  if (ctx?.waitUntil) ctx.waitUntil(work);
  else await work;
  return new Response('ok');
};
