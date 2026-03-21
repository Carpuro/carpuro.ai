# DNS Setup — carpuro.ai en Dynadot

## Paso 1 — Entra a Dynadot
1. Login en [dynadot.com](https://www.dynadot.com)
2. Ve a **My Domains** → clic en `carpuro.ai`
3. Selecciona **DNS Settings**

---

## Paso 2 — Configura los registros A (apex domain)

En la sección **Domain Record** elige tipo `A` y agrega estas 4 IPs:

| Tipo | Host | Apunta a |
|------|------|----------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

---

## Paso 3 — Configura el subdominio www

En la sección **Subdomain Record** agrega:

| Tipo | Subdominio | Apunta a |
|------|------------|----------|
| CNAME | www | carpuro.github.io |

---

## Paso 4 — Guarda los cambios
Clic en **Save DNS** en Dynadot.

---

## Paso 5 — Activa GitHub Pages
1. Ve a [github.com/Carpuro/carpuro.ai](https://github.com/Carpuro/carpuro.ai) → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / folder: `/ (root)` → **Save**
4. En **Custom domain** escribe: `carpuro.ai` → **Save**
5. Activa **Enforce HTTPS** (aparece ~10 min después)

---

## Verificar que funciona

Espera entre 10 min y 2 horas, luego visita:
- https://carpuro.ai
- https://www.carpuro.ai

Ambas deben cargar el sitio con HTTPS.

---

## Notas
- El archivo `CNAME` en este repo ya contiene `carpuro.ai` — no lo borres.
- Si algo no carga después de 2 horas, revisa que los 4 registros A estén guardados correctamente.
