# Step-by-Step Icon Generation Guide

## ✅ Step 1: Install PWA Asset Generator

Open your terminal and run:

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment/frontend
npm install -g pwa-asset-generator
```

**What this does**: Installs a tool that automatically generates all required icon sizes from your SVG.

**Expected output**: 
```
+ pwa-asset-generator@x.x.x
added 1 package in Xs
```

---

## ✅ Step 2: Generate All Icons

Run this command:

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment/frontend
pwa-asset-generator public/icons/logo.svg public/icons \
  --icon-only \
  --favicon \
  --maskable \
  --padding "15%" \
  --background "#FFFFFF" \
  --type png \
  --path-override
```

**What this does**:
- Takes `logo.svg` as input
- Generates all required icon sizes (72x72, 96x96, 128x128, etc.)
- Creates maskable icon (Android adaptive)
- Generates favicon
- Adds 15% padding for safe zone
- Outputs PNG files

**Expected output**: You'll see progress like:
```
Generating icons...
✓ Generated icon-72x72.png
✓ Generated icon-96x96.png
✓ Generated icon-128x128.png
... (and so on)
```

---

## ✅ Step 3: Verify Generated Icons

Check that all files were created:

```bash
ls -lh public/icons/*.png
```

**You should see**:
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `icon-512x512-maskable.png`
- `favicon.ico`
- `apple-touch-icon.png` (or similar)

**If files are missing**: The tool might have generated them with different names. Check:
```bash
ls -lh public/icons/
```

---

## ✅ Step 4: Create Shortcut Icons (Manual)

The tool might not generate shortcut icons. Create them manually:

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment/frontend/public/icons

# Create shortcut-book.png (96x96) - You can use icon-96x96.png as base
cp icon-96x96.png shortcut-book.png

# Create shortcut-list.png (96x96) - Same
cp icon-96x96.png shortcut-list.png
```

**Or use ImageMagick** (if installed):
```bash
convert icon-96x96.png -resize 96x96 shortcut-book.png
convert icon-96x96.png -resize 96x96 shortcut-list.png
```

---

## ✅ Step 5: Create iOS Touch Icon

Ensure you have `apple-touch-icon-180x180.png`:

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment/frontend/public/icons

# If the tool generated apple-touch-icon.png, rename it
if [ -f "apple-touch-icon.png" ]; then
  cp apple-touch-icon.png apple-touch-icon-180x180.png
fi

# Or create from 192x192 icon
if [ ! -f "apple-touch-icon-180x180.png" ]; then
  cp icon-192x192.png apple-touch-icon-180x180.png
fi
```

---

## ✅ Step 6: Verify All Required Files

Run this checklist:

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment/frontend/public/icons

# Check required files
echo "Checking required icons..."
[ -f "icon-72x72.png" ] && echo "✓ icon-72x72.png" || echo "✗ MISSING: icon-72x72.png"
[ -f "icon-96x96.png" ] && echo "✓ icon-96x96.png" || echo "✗ MISSING: icon-96x96.png"
[ -f "icon-128x128.png" ] && echo "✓ icon-128x128.png" || echo "✗ MISSING: icon-128x128.png"
[ -f "icon-144x144.png" ] && echo "✓ icon-144x144.png" || echo "✗ MISSING: icon-144x144.png"
[ -f "icon-152x152.png" ] && echo "✓ icon-152x152.png" || echo "✗ MISSING: icon-152x152.png"
[ -f "icon-192x192.png" ] && echo "✓ icon-192x192.png" || echo "✗ MISSING: icon-192x192.png"
[ -f "icon-384x384.png" ] && echo "✓ icon-384x384.png" || echo "✗ MISSING: icon-384x384.png"
[ -f "icon-512x512.png" ] && echo "✓ icon-512x512.png" || echo "✗ MISSING: icon-512x512.png"
[ -f "icon-512x512-maskable.png" ] && echo "✓ icon-512x512-maskable.png" || echo "✗ MISSING: icon-512x512-maskable.png"
[ -f "apple-touch-icon-180x180.png" ] && echo "✓ apple-touch-icon-180x180.png" || echo "✗ MISSING: apple-touch-icon-180x180.png"
[ -f "shortcut-book.png" ] && echo "✓ shortcut-book.png" || echo "✗ MISSING: shortcut-book.png"
[ -f "shortcut-list.png" ] && echo "✓ shortcut-list.png" || echo "✗ MISSING: shortcut-list.png"
```

**All should show ✓** before proceeding.

---

## ✅ Step 7: Test the Icons

View one of the icons to make sure they look good:

```bash
# On Linux (if you have image viewer)
xdg-open public/icons/icon-192x192.png

# Or check file size (should be reasonable, not 0 bytes)
ls -lh public/icons/icon-*.png | head -5
```

---

## ✅ Step 8: Build and Deploy

Once all icons are generated:

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment/frontend
npm run build
```

This will:
1. Build the frontend
2. Copy icons to Frappe public folder
3. Generate service worker with icon references

---

## 🎉 Done!

Your PWA icons are now ready. The icons will be available at:
- `/assets/frappe_appointment/frontend/icons/icon-*.png`

---

## 🆘 Troubleshooting

### Problem: `pwa-asset-generator` command not found

**Solution**: Install globally with `-g` flag:
```bash
npm install -g pwa-asset-generator
```

### Problem: Icons generated with wrong names

**Solution**: The tool might use different naming. Check what was generated:
```bash
ls public/icons/
```

Then update `vite.config.ts` manifest to match the actual filenames.

### Problem: Icons look blurry or wrong size

**Solution**: The SVG might need adjustment. Edit `public/icons/logo.svg` and regenerate.

### Problem: Missing maskable icon

**Solution**: The `--maskable` flag should generate it. If not, manually create:
```bash
# Use the 512x512 icon as base for maskable
cp icon-512x512.png icon-512x512-maskable.png
```

---

## 📝 Quick Reference

**Source SVG**: `frontend/public/icons/logo.svg`  
**Output Directory**: `frontend/public/icons/`  
**Tool**: `pwa-asset-generator`  
**Command**: See Step 2 above


