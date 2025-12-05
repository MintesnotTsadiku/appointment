# PWA Icons Generation Guide

This directory should contain all PWA icons required for installation on various platforms.

## Required Icon Sizes

You need to generate icons in the following sizes:

### Standard Icons
- `icon-72x72.png` - Android (small)
- `icon-96x96.png` - Android
- `icon-128x128.png` - Android
- `icon-144x144.png` - Windows tile
- `icon-152x152.png` - iPad
- `icon-192x192.png` - Android (standard)
- `icon-384x384.png` - Android
- `icon-512x512.png` - Android (splash screen)

### Maskable Icon (Android Adaptive)
- `icon-512x512-maskable.png` - Android adaptive icon (must have 80% safe zone)

### iOS Icons
- `apple-touch-icon-180x180.png` - iOS home screen icon

### Shortcut Icons
- `shortcut-book.png` (96x96) - Book appointment shortcut
- `shortcut-list.png` (96x96) - View appointments shortcut

## How to Generate Icons

### Option 1: Using PWA Asset Generator (Recommended)

```bash
# Install globally
npm install -g pwa-asset-generator

# Generate all icons from a source image (1024x1024 recommended)
pwa-asset-generator logo.png ./public/icons \
  --icon-only \
  --favicon \
  --maskable \
  --padding "15%" \
  --background "#FFFFFF"
```

### Option 2: Using Online Tools

1. **RealFaviconGenerator**: https://realfavicongenerator.net/
   - Upload your logo
   - Configure settings
   - Download the generated package
   - Extract icons to this directory

2. **PWA Builder Image Generator**: https://www.pwabuilder.com/imageGenerator
   - Upload your logo
   - Download generated icons

### Option 3: Manual Creation

If you have a design tool (Figma, Photoshop, etc.):

1. Create a square logo (1024x1024px recommended)
2. Export at each required size
3. For maskable icon: Ensure important content is within 80% of the center (safe zone)
4. Save with the exact filenames listed above

## Icon Design Guidelines

1. **Use a square logo** with padding (safe zone)
2. **Avoid text** - should be readable at 48x48px
3. **Use brand colors** matching your app theme
4. **Test on light/dark backgrounds**
5. **Create maskable version** with 80% safe zone for Android adaptive icons

## Maskable Icon Safe Zone

For Android adaptive icons, ensure important content is within the center 80% of the image:

```
┌─────────────────────────┐
│                         │
│  ┌─────────────────┐   │ ← 10% padding
│  │                 │   │
│  │   Safe Zone     │   │ ← 80% content area
│  │   (Important    │   │
│  │    Content)     │   │
│  │                 │   │
│  └─────────────────┘   │
│                         │
└─────────────────────────┘
```

## After Generation

Once icons are generated:

1. Place all icon files in this directory (`frontend/public/icons/`)
2. Run `npm run build` to copy them to the Frappe public folder
3. Icons will be available at `/assets/frappe_appointment/frontend/icons/`

## Testing

After deployment, verify icons load correctly:

```bash
# Check if icons are accessible
curl https://yourdomain.com/assets/frappe_appointment/frontend/icons/icon-192x192.png

# Check manifest
curl https://yourdomain.com/manifest.webmanifest
```

## Notes

- Icons are referenced in `vite.config.ts` manifest configuration
- The build process will copy these to the Frappe public folder
- If icons are missing, the PWA will still work but may show generic icons





