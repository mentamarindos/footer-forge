# Footer Forge

Turn **any image** into lightweight art for **landing page footers**:
pick a style and it auto-compresses to **≤ 100 KB** (WebP by default).

## Adaptive styles (8)

| Style | Best for |
|---|---|
| **Pixel Art** | Retro gaming, playful brands |
| **Frosted Mosaic** | Frosted glass with warm glow, gallery look |
| **Ballpoint** | Blue ballpoint pen drawing on paper, engraving hatching |
| **Duotone** | Brand colors (5 presets + custom) |
| **Grayscale** | Elegant, minimal weight |
| **Dither** | Retro 1-bit Bayer pattern |
| **Footer Fade** | Photo + text overlay (most useful in landings) |
| **Blur background** | Muted backdrop that doesn't distract |

Each style declares its own parameter schema (`slider` / `select` / `color`)
and the UI renders the controls by itself → **adding a new style = 1 object** in
`src/lib/image/styles/`.

## Input formats

JPEG, PNG, WebP, AVIF, GIF (1st frame), BMP, ICO, SVG,
TIFF (via `utif`, lazy) and HEIC/HEIF (via `heic-to`, lazy).
Detection is by **magic bytes**, not file extension.

## Local usage (Bun)

```bash
cd footer-forge
bun install
bun run dev     # local server
bun test        # 32 tests (styles + utils + store)
bun run build   # tsc + vite build
bun run lint    # oxlint
```

Requires [Bun](https://bun.sh) ≥ 1.0.

## Architecture

Global state with [Zustand](https://zustand.docs.pmnd.rs) (`src/store/use-forge-store.ts`):
image, style, params, output and result live in a single store;
`useAutoProcess()` reprocesses with debounce on any change.
Settings (style, params, output, preview size, theme) persist in
`localStorage` via the `persist` middleware — they survive refresh.
Files and results are never persisted (blob URLs can't).

Specialized components (`src/components/`), each subscribed
only to its store slice:

| Component | Responsibility |
|---|---|
| `dropzone` | upload + thumbnail + remove/change |
| `style-picker` | icon style toggles |
| `style-controls` | sliders/selects/color from the active schema |
| `compare-view` | before/after + status badges |
| `output-settings` | width + format |
| `action-bar` | reprocess/download + limit status |
| `footer-preview` | live full-width footer mock |
| `footer-art-uploader` | installable composition (shadcn registry) |

## Install as a shadcn component

```bash
npx shadcn@latest add https://raw.githubusercontent.com/mentamarindos/footer-forge/main/public/r/footer-art-uploader.json
```

Usage:

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

## How the pipeline works

```
file → magic-bytes sniff → decode (bitmap | img | utif | heic-to | svg)
  → resize to targetWidth → style.apply(ImageData) → compress loop
  (quality 0.92→0.32, ×0.85 scale until ≤ maxBytes) → blob + download
```

## Adding a new style

```ts
// src/lib/image/styles/my-style.ts
import type { StyleDefinition } from "./types";

export const myStyle: StyleDefinition = {
  id: "my-style",
  name: "My style",
  description: "...",
  params: [
    { key: "strength", label: "Strength", type: "slider", min: 0, max: 100, step: 1, defaultValue: 50, unit: "%" },
  ],
  apply(input, params) {
    // transform and return a NEW ImageData
    return input;
  },
};
// + register it in src/lib/image/styles/index.ts
```
