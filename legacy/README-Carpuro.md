# carpuro.ai

Personal portfolio and landing page for **Carlos Pulido Rosas** — Data Engineer based in Zapopan, Jalisco, Mexico.

Live site: [carpuro.ai](https://carpuro.ai)

---

## About

Static site built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step — just files served via GitHub Pages with a custom domain.

The site showcases my work in data engineering: pipelines, multicloud architectures, Snowflake, Apache Spark, BigQuery, dbt, and more. It's also designed with a future SaaS direction in mind.

---

## Stack

| Layer | Tech |
|-------|------|
| Hosting | GitHub Pages |
| Domain | Dynadot → `carpuro.ai` |
| Fonts | Inter + Playfair Display (Google Fonts) |
| Styling | Vanilla CSS with custom properties |
| Interactivity | Vanilla JavaScript |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, tech stack marquee, projects, services, case studies, newsletter |
| `/about/` | Bio, skills, career timeline |
| `/contact/` | Contact form + social links |
| `/blog/` | Blog (coming soon) |

---

## Visual Features

- Dark SaaS aesthetic — `#080810` background, purple/blue/cyan gradient accents
- Multi-layer parallax hero that reacts to mouse movement
- Infinite scrolling tech stack marquee
- Glassmorphism cards with backdrop blur
- CSS grid background + animated glow orbs

---

## Project Structure

```
carpuro.ai/
├── index.html          # Landing page
├── about/
│   └── index.html      # About page
├── contact/
│   └── index.html      # Contact page
├── blog/
│   └── index.html      # Blog page
├── assets/             # Images and static files
└── CNAME               # Custom domain config
```

---

## Local Development

No build step required. Just open any `.html` file in a browser, or serve locally:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Then visit `http://localhost:8000`.

---

## Deployment

Pushes to `main` deploy automatically via GitHub Pages.

DNS is configured on Dynadot with:
- 4 A records pointing to GitHub Pages IPs (`185.199.108-111.153`)
- CNAME record: `www` → `carpuro.github.io`

---

## Contact

- GitHub: [github.com/Carpuro](https://github.com/Carpuro)
- LinkedIn: [linkedin.com/in/carlos-pulido-489700132](https://www.linkedin.com/in/carlos-pulido-489700132/)
- Site: [carpuro.ai](https://carpuro.ai)
