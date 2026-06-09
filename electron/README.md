# Noisium Desktop (Electron)

Thin Electron shell that loads `https://noisium.app`. All app features update automatically from the server — this wrapper only needs rebuilding for native changes.

## Requirements

- Node.js 18+
- macOS (for Mac builds), Windows (for Windows builds)
- For signed/notarized Mac builds: Apple Developer account + certificates

## Development

```bash
cd electron
npm install
npm start        # open the app locally against noisium.app
```

## Build

```bash
npm run build:mac   # → dist/Noisium-1.0.0.dmg + Noisium-1.0.0-mac.zip
npm run build:win   # → dist/Noisium Setup 1.0.0.exe
npm run build:all   # both
```

### Icons required before building

Place these files in `build/`:

| File | Size | Use |
|------|------|-----|
| `icon.icns` | — | macOS app icon |
| `icon.ico` | — | Windows app icon |
| `icon.png` | 512×512 | Fallback / Linux |
| `dmg-background.png` | 1080×768 px | DMG installer background (optional) |

You can generate `icon.icns` and `icon.ico` from `icon.png` using:
- [IconKitchen](https://icon.kitchen) (free, web)
- `electron-icon-builder` npm package

## Auto-updates

Releases are fetched from GitHub Releases on the `mndesigncz/Tymbr-APP` repository.

To publish a new shell version:
1. Bump `version` in `package.json`
2. Build: `npm run build:mac`
3. Create a GitHub Release tagged `v1.x.x` and attach the generated files from `dist/`

Users are notified in-app and can install with one click.
