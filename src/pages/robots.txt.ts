import type { APIRoute } from 'astro';
import { PUBLIC_SITE_MODE } from 'astro:env/client';

// レビュー版では検索エンジンに登録させない
export const GET: APIRoute = ({ site }) => {
  const body =
    PUBLIC_SITE_MODE === 'production'
      ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site)}\n`
      : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
