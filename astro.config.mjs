// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const secret = () => envField.string({ context: 'server', access: 'secret', optional: true });
const pub = () => envField.string({ context: 'client', access: 'public', optional: true });

export default defineConfig({
  // 本番ドメインが決まったら差し替える
  site: 'https://example.com',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
  env: {
    schema: {
      // Notion（顧客管理DB）
      NOTION_TOKEN: secret(),
      // メール通知（Resend）
      RESEND_API_KEY: secret(),
      MAIL_FROM: secret(),
      ADMIN_EMAIL: secret(),
      // スパム対策（Cloudflare Turnstile）
      TURNSTILE_SECRET_KEY: secret(),
      PUBLIC_TURNSTILE_SITE_KEY: pub(),
      // 公式LINE（Messaging API / LINEログイン）
      LINE_CHANNEL_SECRET: secret(),
      LINE_CHANNEL_ACCESS_TOKEN: secret(),
      LINE_LOGIN_CHANNEL_ID: secret(),
      PUBLIC_LIFF_ID: pub(),
      PUBLIC_LINE_ADD_FRIEND_URL: pub(),
      // サイトの状態：review（関係者確認用。検索除外・レビュー帯・フォームはテスト送信）／production（一般公開）
      PUBLIC_SITE_MODE: envField.enum({ context: 'client', access: 'public', values: ['review', 'production'], default: 'review' }),
    },
  },
});
