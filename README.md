# carpuro.ai

Personal portfolio and landing page for **Carlos Pulido Rosas** — Data Engineer based in Zapopan, Jalisco, Mexico.

Live site: [carpuro.ai](https://carpuro.ai)

---

## About

Static site built with [Astro](https://astro.build). Pages render to plain HTML at build time
(zero JS by default); the few interactive pieces ship as client scripts. The site showcases my
work in data engineering — pipelines, multicloud architectures, Snowflake, Apache Spark,
BigQuery, dbt — and is designed with a future SaaS direction in mind.

> Migrated from the original hand-written HTML/CSS/JS site (preserved under [`legacy/`](legacy/)).

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Astro 6 (`output: 'static'`) |
| Hosting | Vercel |
| Serverless API | Vercel functions in `api/` (Supabase-backed) |
| Domain | Dynadot → `carpuro.ai` |
| Fonts | Inter + Playfair Display (Google Fonts) |
| Styling | Vanilla CSS with custom properties (`src/styles/tokens.css`) |
| SEO | `@astrojs/sitemap`, RSS (`/rss.xml`), OpenGraph/Twitter meta + `public/og.png` |

---

## Pages

| Route | Source | Description |
|-------|--------|-------------|
| `/` | `src/pages/index.astro` | Landing — hero, tech stack, featured projects, services |
| `/about/` | `src/pages/about.astro` | Bio, skills, career timeline |
| `/services/` | `src/pages/services.astro` | Consulting and engagement offerings |
| `/contact/` | `src/pages/contact.astro` | Contact form (`POST /api/contact`) + social links |
| `/blog/` | `src/pages/blog.astro` | Blog (coming soon) |
| `/work/<slug>/` | `src/pages/work/[slug].astro` | Case-study pages, generated from `src/data/projects.ts` |

Standalone analysis dashboards are served as static files from `public/` (e.g. `/mon/`,
`/proyectos/marginacion/`, `/proyectos/topicos-selectos/`).

---

## Project Structure

```
carpuro.ai/
├── src/
│   ├── pages/          # Routes (.astro → HTML)
│   │   └── work/[slug].astro   # Case studies from projects.ts
│   ├── layouts/Base.astro      # Shared <head> + page shell
│   ├── components/             # Nav, Footer, Wordmark
│   ├── data/projects.ts        # Project / case-study content
│   └── styles/tokens.css       # Design tokens (CSS custom properties)
├── public/             # Served as-is: brand assets + static dashboards
├── api/                # Vercel serverless functions (contact, chat)
├── supabase/           # Database schema
├── worker/             # Cloudflare worker (chat backend)
├── legacy/             # Original vanilla-HTML site (archived)
├── astro.config.mjs
└── vercel.json
```

---

## Local Development

```bash
npm install
npm run dev      # or: npx astro dev   → http://localhost:4321
npx astro build  # production build into dist/
npx astro preview
```

---

## Deployment

Pushes to `main` deploy automatically via Vercel (`framework: "astro"` in `vercel.json`).
Serverless functions under `api/` require `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
environment variables configured in the Vercel project settings.

---

## Contact

- GitHub: [github.com/Carpuro](https://github.com/Carpuro)
- LinkedIn: [linkedin.com/in/carlos-pulido-489700132](https://www.linkedin.com/in/carlos-pulido-489700132/)
- Site: [carpuro.ai](https://carpuro.ai)
