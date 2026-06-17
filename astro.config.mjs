// @ts-check
import { defineConfig } from 'astro/config';

// Static output: zero JS by default, ideal for a fast, SEO-friendly
// portfolio + SaaS landing. Interactive pieces (chat) ship as islands.
export default defineConfig({
  site: 'https://carpuro.ai',
  output: 'static',
  build: { format: 'directory' },
});
