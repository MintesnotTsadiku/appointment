# PWA Testing Guide - Step by Step

**Status**: ✅ Ready to Test  
**Date**: 2025-11-28

---

## 📋 Pre-Testing Checklist

Before testing, verify you have:

- [x] All PWA code implemented
- [x] All icons generated (12 PNG files)
- [x] Icons in `frontend/public/icons/`
- [ ] Frontend built
- [ ] Frappe assets built
- [ ] Bench restarted

---

## 🚀 Step-by-Step Testing Guide

### Step 1: Build the Frontend

Open your terminal and run:

```bash
cd /home/minte/projects/frappe-bench/apps/appointment/frontend
npm run build
```

**What this does**:
- Builds React app with PWA support
- Generates service worker
- Copies icons to Frappe public folder
- Creates manifest.webmanifest

**Expected output**: 
```
✓ built in Xs
✓ Copied HTML entry
✓ Copied PWA assets
```

**⏱️ Time**: ~30-60 seconds

---

### Step 2: Copy Icons to Frappe Public Folder

The build script should copy icons, but let's verify and copy manually if needed:

```bash
cd /home/minte/projects/frappe-bench/apps/appointment/frontend

# Create icons directory in Frappe public folder
mkdir -p ../appointment/public/frontend/icons

# Copy all icons
cp public/icons/*.png ../appointment/public/frontend/icons/

# Verify icons were copied
ls -lh ../appointment/public/frontend/icons/*.png | wc -l
# Should show: 12 (or more)
```

**✅ Success**: You should see 12+ PNG files listed

---

### Step 3: Build Frappe Assets

```bash
cd /home/minte/projects/frappe-bench
bench build --app appointment
```

**What this does**:
- Compiles Frappe assets
- Includes frontend assets in Frappe's asset pipeline

**Expected output**:
```
Building appointment...
✓ Built assets
```

**⏱️ Time**: ~10-30 seconds

---

### Step 4: Restart Bench

```bash
bench restart
```

**What this does**:
- Restarts all Frappe services
- Loads new assets including PWA files

**Expected output**:
```
✓ Restarted services
```

**⏱️ Time**: ~10-20 seconds

---

### Step 5: Clear Cache (Important!)

```bash
# Replace 'your-site-name' with your actual site name
bench --site your-site-name clear-cache

# Or if you're not sure of the site name:
bench --site all clear-cache
```

**What this does**:
- Clears cached assets
- Forces browser to load new PWA files

**✅ Success**: Cache cleared message

---

### Step 6: Start Your Site (if not running)

```bash
bench start
```

**Or if using production mode**:
```bash
bench serve --port 8000
```

**✅ Success**: Site should be accessible at `http://localhost:8000` or your configured URL

---

## 🧪 Testing the PWA

### Test 1: Check Manifest File

**Open in browser**:
```
http://localhost:8000/manifest.webmanifest
```

**Or**:
```
http://localhost:8000/assets/appointment/frontend/manifest.webmanifest
```

**✅ Expected**: You should see JSON with:
- `name`: "Ethiopian Scheduler - መርሃግብር"
- `icons`: Array with all icon sizes
- `start_url`: "/schedule/"

**❌ If you see 404**: Icons might not be copied correctly. Go back to Step 2.

---

### Test 2: Check Service Worker Registration

1. **Open your site**: `http://localhost:8000/schedule/`

2. **Open Chrome DevTools** (F12)

3. **Go to Application tab** → **Service Workers**

4. **Look for**:
   - Service worker registered
   - Status: "activated and is running"
   - Scope: `/schedule/`

**✅ Success**: Service worker shows as "activated"

**❌ If not registered**: 
- Check Console tab for errors
- Make sure you're on `/schedule/` route (not `/app/`)
- Try hard refresh (Ctrl+Shift+R)

---

### Test 3: Check Manifest in DevTools

1. **In DevTools** → **Application tab** → **Manifest**

2. **You should see**:
   - App name: "Ethiopian Scheduler - መርሃግብር"
   - Icons: All 12 icons listed
   - Start URL: `/schedule/`
   - Display: "standalone"

3. **Check icons**: Click on each icon to verify they load

**✅ Success**: All icons show with green checkmarks

**❌ If icons missing**: 
- Check file paths in manifest
- Verify icons exist in `appointment/public/frontend/icons/`

---

### Test 4: Test Install Prompt (Desktop Chrome)

1. **Visit**: `http://localhost:8000/schedule/`

2. **Wait 30 seconds** (or visit twice)

3. **Look for**:
   - Install button in address bar (Chrome)
   - Or install prompt banner at bottom of page

4. **Click "Install"**

5. **Verify**:
   - App opens in standalone window (no browser UI)
   - App icon appears on desktop/taskbar
   - App name shows correctly

**✅ Success**: App installs and opens in standalone mode

**Note**: Install prompt might not appear immediately. It requires:
- HTTPS (or localhost)
- User engagement (2+ visits)
- No previous dismissal

---

### Test 5: Test Offline Mode

1. **Open DevTools** → **Network tab**

2. **Check "Offline" checkbox**

3. **Reload the page** (F5)

4. **Expected behavior**:
   - Page still loads (from cache)
   - Connection status indicator shows "You're offline"
   - Write operations disabled

5. **Uncheck "Offline"**

6. **Expected**: "Back online! Syncing your data..." message

**✅ Success**: App works offline, shows connection status

---

### Test 6: Test Update Notification

1. **Make a small change** to any frontend file (e.g., add a comment)

2. **Rebuild**:
   ```bash
   cd frontend
   npm run build
   bench restart
   ```

3. **Reload the page** (don't hard refresh yet)

4. **Expected**: Update notification appears at top

5. **Click "Update"** → Confirm dialog

6. **Expected**: Page reloads with new version

**✅ Success**: Update notification works

---

### Test 7: Test on Mobile (Android)

1. **Find your local IP**:
   ```bash
   hostname -I
   # Or: ip addr show | grep inet
   ```

2. **On your phone**:
   - Connect to same WiFi network
   - Open Chrome
   - Visit: `http://YOUR_IP:8000/schedule/`

3. **Wait 30 seconds** or visit twice

4. **Look for**:
   - "Add to Home Screen" banner
   - Or menu → "Add to Home Screen"

5. **Add to home screen**

6. **Open from home screen**

7. **Verify**:
   - Opens in standalone mode (no browser UI)
   - Splash screen shows
   - App icon displays correctly

**✅ Success**: PWA installs and works on mobile

---

### Test 8: Test iOS (iPhone/iPad)

1. **On iPhone/iPad**:
   - Connect to same WiFi
   - Open Safari
   - Visit: `http://YOUR_IP:8000/schedule/`

2. **Tap Share button** (square with arrow)

3. **Scroll down** → Tap **"Add to Home Screen"**

4. **Tap "Add"**

5. **Open from home screen**

6. **Verify**:
   - Opens in standalone mode
   - No browser UI
   - Icon displays correctly

**✅ Success**: PWA works on iOS

**Note**: iOS doesn't show automatic install prompt. Users must manually add.

---

### Test 9: Lighthouse PWA Audit

1. **Open your site**: `http://localhost:8000/schedule/`

2. **Open DevTools** → **Lighthouse tab**

3. **Select**:
   - ✅ Progressive Web App
   - Device: Mobile
   - Click "Analyze page load"

4. **Wait for audit** (~30 seconds)

5. **Check PWA score**:
   - Target: ≥90/100
   - Check all items are green

**✅ Success**: PWA score ≥90

**Common issues**:
- Missing icons → Check Step 2
- No HTTPS → Use localhost (OK for testing)
- Service worker not registered → Check Test 2

---

### Test 10: Verify Icons Load

1. **Check icon files directly**:
   ```
   http://localhost:8000/assets/appointment/frontend/icons/icon-192x192.png
   http://localhost:8000/assets/appointment/frontend/icons/icon-512x512.png
   ```

2. **Expected**: Icons display in browser

3. **Check all sizes**:
   - 72x72, 96x96, 128x128, 144x144, 152x152
   - 192x192, 384x384, 512x512
   - maskable version
   - apple-touch-icon

**✅ Success**: All icons load correctly

---

## 🐛 Troubleshooting

### Problem: Service Worker Not Registering

**Solution**:
```bash
# 1. Check console for errors
# 2. Clear service workers manually:
#    DevTools → Application → Service Workers → Unregister
# 3. Hard refresh (Ctrl+Shift+R)
# 4. Check you're on /schedule/ route (not /app/)
```

### Problem: Icons Not Loading (404)

**Solution**:
```bash
# 1. Verify icons exist:
ls -lh appointment/public/frontend/icons/*.png

# 2. If missing, copy them:
cd frontend
cp public/icons/*.png ../appointment/public/frontend/icons/

# 3. Rebuild:
bench build --app appointment
bench restart
```

### Problem: Install Prompt Not Showing

**Solution**:
- Must be on HTTPS (or localhost)
- Need 2+ visits
- Wait 30 seconds
- Check if previously dismissed (clear localStorage)
- Try incognito mode

### Problem: Offline Mode Not Working

**Solution**:
```bash
# 1. Check service worker is registered (Test 2)
# 2. Check cache in DevTools → Application → Cache Storage
# 3. Verify offline.html exists:
ls appointment/public/frontend/offline.html
```

### Problem: Update Notification Not Showing

**Solution**:
- Make sure you made actual changes to code
- Rebuild frontend
- Restart bench
- Hard refresh to get new service worker
- Wait a few seconds for update check

---

## ✅ Success Criteria

Your PWA is working correctly if:

- [x] Manifest loads at `/manifest.webmanifest`
- [x] Service worker registers and activates
- [x] All 12 icons load correctly
- [x] Install prompt appears (desktop/mobile)
- [x] App installs and opens in standalone mode
- [x] Offline mode works (page loads from cache)
- [x] Connection status indicator shows
- [x] Update notification appears after rebuild
- [x] Lighthouse PWA score ≥90

---

## 📝 Quick Test Commands

**Full rebuild and restart**:
```bash
cd /home/minte/projects/frappe-bench/apps/appointment/frontend
npm run build
cd ../..
bench build --app appointment
bench restart
bench --site all clear-cache
```

**Check if icons exist**:
```bash
ls -lh appointment/public/frontend/icons/*.png | wc -l
# Should show: 12
```

**Check service worker file**:
```bash
ls -lh appointment/public/frontend/sw.js
# Should exist
```

**Check manifest**:
```bash
cat appointment/public/frontend/manifest.webmanifest | head -20
```

---

## 🎯 Next Steps After Testing

Once all tests pass:

1. **Deploy to production** (with HTTPS)
2. **Test on real devices** (not just localhost)
3. **Monitor analytics** (track install rates)
4. **Gather user feedback**
5. **Optimize based on usage**

---

## 📞 Need Help?

If something doesn't work:

1. Check browser console for errors
2. Check DevTools → Application → Service Workers
3. Verify all files exist (icons, manifest, service worker)
4. Try incognito mode (clears cache)
5. Check network tab for 404 errors

---

**Good luck testing! 🚀**

