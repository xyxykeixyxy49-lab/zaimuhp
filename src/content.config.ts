import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['お知らせ', '開催報告', 'コラム']).default('お知らせ'),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news };
