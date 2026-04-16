# Ouk Chaktrang (Cambodia Chess) - React + Vite

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Variant notes

This project now uses **Cambodia chess (Ouk Chaktrang / Makruk-style)** piece setup and movement:

- back rank: rook, knight, khon, met, king, khon, knight, rook
- pawns start on row 3/6 (from top/bottom view)
- khon (`s`) moves one diagonal step + one forward step
- met (`m`) moves one diagonal step
- pawn promotes to met on the variant promotion rank

## GitHub Pages

- `vite.config.js` base set to `/ouk-chaktrang/`
- workflow in `.github/workflows/deploy.yml`
- enable **Settings → Pages → Build and deployment → GitHub Actions**
