// HPのフォーム（セミナー申込・資料請求・問い合わせ・法人研修相談）の受け口。
// 顧客DBへ登録/更新 → 接点履歴を記録 → 管理者通知・自動返信メール → 完了ページへ。
import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { site, trademarkNote } from '../../data/site';
import { recordActivity, upsertContact, type ActivityType, type Channel } from '../../lib/crm';
import { verifyIdToken } from '../../lib/line';
import { sendMail } from '../../lib/mail';
import { formatRange, getSeminar } from '../../lib/seminars';

export const prerender = false;

const TYPES: Record<string, ActivityType> = {
  seminar: 'セミナー申込',
  document: '資料請求',
  contact: '問い合わせ',
  corporate: '法人研修相談',
};

const s = (v: FormDataEntryValue | null, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bad = (msg: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>入力内容をご確認ください</title><body style="font-family:sans-serif;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.8"><h1 style="font-size:1.25rem">入力内容をご確認ください</h1><p>${msg}</p><p><a href="javascript:history.back()">← 入力画面に戻る</a></p></body>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );

async function verifyTurnstile(token: string, ip: string | null) {
  const secret = getSecret('TURNSTILE_SECRET_KEY');
  if (!secret) return true; // 未設定なら検証しない
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  return ((await res.json()) as { success?: boolean }).success === true;
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const kind = s(form.get('form_type'), 20);
  const type = TYPES[kind];
  if (!type) return bad('不正なフォームです。');

  // スパム対策：ハニーポット＋Turnstile
  if (s(form.get('website'))) return redirect(`/thanks/?type=${kind}`, 303);
  if (!(await verifyTurnstile(s(form.get('cf-turnstile-response'), 4096), request.headers.get('CF-Connecting-IP')))) {
    return bad('スパム対策の確認に失敗しました。お手数ですが再度お試しください。');
  }

  const name = s(form.get('name'), 80);
  const email = s(form.get('email'), 254).toLowerCase();
  const tel = s(form.get('tel'), 30).replace(/[^\d+]/g, '');
  const message = s(form.get('message'), 3000);
  if (!name) return bad('お名前を入力してください。');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('メールアドレスの形式が正しくありません。');
  if (s(form.get('privacy')) !== 'on') return bad('個人情報の取り扱いへの同意が必要です。');

  // LINE内（LIFF）から送信された場合は LINEユーザーIDを紐づける
  let lineUserId = '';
  const idToken = s(form.get('line_id_token'), 4096);
  const loginChannel = getSecret('LINE_LOGIN_CHANNEL_ID');
  if (idToken && loginChannel) lineUserId = (await verifyIdToken(loginChannel, idToken)) ?? '';
  const channel: Channel = lineUserId ? '公式LINE' : 'ホームページ';

  const seminarId = s(form.get('seminar_id'), 64);
  const seminar = kind === 'seminar' ? await getSeminar(seminarId) : null;
  if (kind === 'seminar' && !seminar) return bad('お申し込みのセミナーが見つかりません。日程一覧から選び直してください。');
  const persons = Math.max(1, Math.min(50, Number(s(form.get('persons'), 3)) || 1));
  const documents = form.getAll('documents').map((v) => s(v, 50)).filter(Boolean);

  const subject =
    kind === 'seminar' && seminar
      ? `${seminar.area}｜${formatRange(seminar)}｜${seminar.title}`
      : kind === 'document'
        ? `資料請求：${documents.join('・') || '研修案内パンフレット'}`
        : kind === 'corporate'
          ? `法人研修相談：${s(form.get('company'), 100) || name}`
          : `問い合わせ：${s(form.get('topic'), 50) || '一般'}`;

  const details = [
    ['種別', type],
    ['お名前', name],
    ['フリガナ', s(form.get('kana'), 80)],
    ['会社名・事務所名', s(form.get('company'), 100)],
    ['役職', s(form.get('position'), 50)],
    ['ご職業・お立場', s(form.get('audience'), 20)],
    ['メール', email],
    ['電話', tel],
    ['都道府県', s(form.get('prefecture'), 10)],
    ['件名', subject],
    ['区分', s(form.get('topic'), 50)],
    ['参加人数', kind === 'seminar' || kind === 'corporate' ? `${persons}名` : ''],
    ['希望資料', documents.join('、')],
    ['送付先住所', s(form.get('address'), 200)],
    ['開催希望時期', s(form.get('timing'), 100)],
    ['お知りになったきっかけ', s(form.get('referral'), 50)],
    ['内容', message],
  ].filter(([, v]) => v);
  const body = details.map(([k, v]) => `${k}：${v}`).join('\n');
  const source = s(form.get('source'), 500);

  const token = getSecret('NOTION_TOKEN');
  if (token) {
    try {
      const contactId = await upsertContact(
        token,
        {
          name,
          kana: s(form.get('kana'), 80),
          company: s(form.get('company'), 100),
          position: s(form.get('position'), 50),
          audience: s(form.get('audience'), 20),
          email,
          tel,
          prefecture: s(form.get('prefecture'), 10),
          lineUserId,
          consent: s(form.get('consent')) === 'on',
        },
        type,
        channel,
      );
      await recordActivity(token, {
        type,
        channel,
        contactId,
        subject,
        seminarId: seminar && !seminar.isSample ? seminar.id : undefined,
        persons: kind === 'seminar' || kind === 'corporate' ? persons : null,
        documents,
        body,
        source,
      });
    } catch (e) {
      // DB登録に失敗しても受付は止めず、管理者メールで拾う
      console.error('CRM error', e);
    }
  }

  const admin = getSecret('ADMIN_EMAIL');
  if (admin) await sendMail(admin, `【${type}】${name} 様（${channel}）`, `${body}\n\n流入元：${source || '不明'}`, email);
  const greeting = `${name} 様\n\nこのたびは${site.name}へ${type === 'セミナー申込' ? 'お申し込み' : type === '資料請求' ? '資料のご請求' : 'お問い合わせ'}いただき、誠にありがとうございます。\n以下の内容で受け付けました。担当者より2営業日以内にご連絡いたします。\n\n`;
  const pay = seminar?.paymentUrl ? `\n\n▼参加費のお支払いはこちら\n${seminar.paymentUrl}\n` : '';
  await sendMail(email, `【${site.name}】${type}を受け付けました`, `${greeting}${body}${pay}\n\n――――――――――\n${site.name}\n${site.email}\n${trademarkNote}`);

  const q = new URLSearchParams({ type: kind });
  if (seminar) q.set('seminar', seminar.id);
  return redirect(`/thanks/?${q}`, 303);
};
