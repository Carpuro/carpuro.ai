# carpuro.ai — Logo Assets

## Archivos

| Archivo | Uso |
|---|---|
| `carpuro-logo-dark.svg` | Navbar, hero, footer — sobre fondos oscuros (#080810, #0d0d1a) |
| `carpuro-logo-light.svg` | Sobre fondos claros o blancos |
| `carpuro-icon.svg` | Favicon, avatar, app icon, navbar colapsada en mobile |
| `brand-tokens.css` | Variables CSS y utilidades — pegar en tu stylesheet global |

## Implementación rápida

### 1. Copiar archivos
```
public/
  assets/
    logos/
      carpuro-logo-dark.svg
      carpuro-logo-light.svg
      carpuro-icon.svg
```

### 2. Favicon (en `<head>`)
```html
<link rel="icon" type="image/svg+xml" href="/assets/logos/carpuro-icon.svg"/>
```

### 3. Navbar
```html
<a href="/" aria-label="carpuro.ai">
  <img
    src="/assets/logos/carpuro-logo-dark.svg"
    alt="carpuro.ai"
    class="logo"
  />
</a>
```

### 4. CSS (importar brand-tokens.css)
```html
<link rel="stylesheet" href="/assets/brand-tokens.css"/>
```
O pegar el contenido en tu stylesheet principal.

### 5. Fuente Inter (si no la tienes ya)
```html
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet"/>
```

## Paleta de colores

```
Fondos:    #080810  #0d0d1a
Accentos:  #7c3aed  #2563eb  #06b6d4
Textos:    #e2e2f0  #6b6b8a
Gradiente: 135deg → #7c3aed → #2563eb → #06b6d4
```

## Uso del gradiente en texto (CSS)
```css
.text-gradient {
  background: linear-gradient(135deg, #7c3aed, #2563eb, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

## Tamaños recomendados
- Navbar desktop: `width: 200px`
- Navbar mobile:  `width: 140px`
- Favicon:        `width: 32px` o `48px`
- Hero/OG image:  escalar el SVG libremente, es vectorial
