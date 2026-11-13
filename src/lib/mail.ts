// メール送信（Resend）。キー未設定なら何もしない。
import { getSecret } from 'astro:env/server';

export async function sendMail(to: string, subject: string, text: string, replyTo?: string) {
  const key = getSecret('RESEND_API_KEY');
  const from = getSecret('MAIL_FROM');
  if (!key || !from || !to) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, reply_to: replyTo }),
  });
  if (!res.ok) console.error('mail failed', res.status, await res.text());
  return res.ok;
}
