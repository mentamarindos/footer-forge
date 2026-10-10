# Footer Forge

Convierte **cualquier imagen** en arte liviano para **footers de landing pages**:
aplica un estilo y comprime automáticamente a **≤ 100 KB** (WebP por defecto).

## Estilos adaptativos (7)

| Estilo | Ideal para |
|---|---|
| **Pixel Art** | Retro gaming, marca juguetona |
| **Posterize** | Look plano moderno |
| **Duotono** | Colores de marca (5 presets + custom) |
| **Grises** | Elegante, mínimo peso |
| **Dither** | Tramado Bayer 1-bit retro |
| **Footer Fade** | Foto + texto encima (el más útil en landings) |
| **Blur fondo** | Fondo tenue sin distraer |

Cada estilo declara su propio schema de parámetros (`slider` / `select` / `color`)
y la UI genera los controles sola → **agregar un estilo nuevo = 1 objeto** en
`src/lib/image/styles/`.

## Formatos de entrada

JPEG, PNG, WebP, AVIF, GIF (1er frame), BMP, ICO, SVG,
TIFF (vía `utif`, lazy) y HEIC/HEIF (vía `heic-to`, lazy).
La detección es por **magic bytes**, no por extensión.

## Uso local

```bash
cd footer-forge
npm install
npm run dev
```

## Instalar como componente shadcn

```bash
npx shadcn@latest add https://raw.githubusercontent.com/mentamarindos/footer-forge/main/public/r/footer-art-uploader.json
```

Uso:

```tsx
import { FooterArtUploader } from "@/components/footer-art-uploader";

<FooterArtUploader
  defaultStyle="footer-fade"
  availableStyles={["pixel-art", "duotone", "footer-fade"]}
  targetWidth={640}
  maxBytes={102_400}
  output="image/webp"
  onProcessed={(r) => console.log(r.size, r.mime)}
/>
```

## Cómo funciona el pipeline

```
archivo → sniff magic bytes → decode (bitmap | img | utif | heic-to | svg)
  → resize a targetWidth → style.apply(ImageData) → compress loop
  (quality 0.92→0.32, escala ×0.85 hasta ≤ maxBytes) → blob + download
```

## Añadir un estilo nuevo

```ts
// src/lib/image/styles/mi-estilo.ts
import type { StyleDefinition } from "./types";

export const miEstilo: StyleDefinition = {
  id: "mi-estilo",
  name: "Mi estilo",
  description: "...",
  params: [
    { key: "fuerza", label: "Fuerza", type: "slider", min: 0, max: 100, step: 1, defaultValue: 50, unit: "%" },
  ],
  apply(input, params) {
    // transforma y devuelve un ImageData nuevo
    return input;
  },
};
// + regístralo en src/lib/image/styles/index.ts
```
