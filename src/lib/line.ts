// 公式LINE（Messaging API）連携
const enc = new TextEncoder();

// Webhook 署名検証（x-line-signature = base64(HMAC-SHA256(channelSecret, body))）
export async function verifySignature(channelSecret: string, body: string, signature: string | null) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(channelSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
  const expected = btoa(String.fromCharCode(...mac));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export async function getProfile(accessToken: string, userId: string): Promise<{ displayName: string } | null> {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.ok ? res.json() : null;
}

export async function reply(accessToken: string, replyToken: string, messages: unknown[]) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyToken, messages }),
  });
}

export async function push(accessToken: string, to: string, messages: unknown[]) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, messages }),
  });
}

// LIFF（LINE内ブラウザ）で開いたフォームから送られた IDトークンを検証し、LINEユーザーIDを得る
export async function verifyIdToken(loginChannelId: string, idToken: string): Promise<string | null> {
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: loginChannelId }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { sub?: string };
  return data.sub ?? null;
}
