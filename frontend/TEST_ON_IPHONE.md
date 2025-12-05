# Test PWA on iPhone (Same WiFi) - Simple Guide

## Quick Steps

### Step 1: Find Your Windows Host IP

**Option A: From WSL (Easiest)**
```bash
# Run this in WSL terminal:
ip route show | grep default | awk '{print $3}'
```

This will show your Windows host IP (usually something like `172.x.x.1`)

**Option B: From Windows PowerShell**
```powershell
# Open PowerShell on Windows and run:
ipconfig | findstr /i "IPv4"
```

Look for the IP address under your WiFi adapter (usually `192.168.x.x` or `10.x.x.x`)

**Option C: Quick Windows Command**
Press `Win + R`, type `cmd`, then run:
```cmd
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter.

---

### Step 2: Start Dev Server (Already Configured!)

The Vite config is already updated to allow network access. Just start the dev server:

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment/frontend
npm run dev
```

You should see:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://0.0.0.0:5173/
  ➜  Network: http://172.x.x.x:5173/    ← This is your WSL IP
```

---

### Step 3: Access from iPhone

**On your iPhone:**

1. **Make sure iPhone is on the same WiFi network**

2. **Open Safari** (or Chrome) on iPhone

3. **Type in the address bar:**
   ```
   http://YOUR_WINDOWS_IP:5173/home
   ```
   
   Replace `YOUR_WINDOWS_IP` with the IP from Step 1.
   
   **Example:**
   - If Windows IP is `192.168.1.100`, use: `http://192.168.1.100:5173/home`
   - If Windows IP is `10.0.0.5`, use: `http://10.0.0.5:5173/home`

4. **If that doesn't work, try the WSL IP:**
   ```
   http://172.23.137.173:5173/home
   ```

---

### Step 4: Allow Windows Firewall (If Needed)

If you can't connect, Windows Firewall might be blocking it.

**Quick Fix:**
1. Press `Win + R`
2. Type: `wf.msc` and press Enter
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" → Enter port `5173` → Next
6. Select "Allow the connection" → Next
7. Check all boxes → Next
8. Name it "Vite Dev Server" → Finish

**Or use PowerShell (Run as Admin):**
```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

---

### Step 5: Test PWA on iPhone

Once you can access the site:

1. **Visit the page** (e.g., `http://192.168.1.100:5173/home`)

2. **Wait 30 seconds** or visit twice

3. **Look for install prompt** (should appear at bottom)

4. **Or manually add to home screen:**
   - Tap the **Share button** (square with arrow)
   - Scroll down → Tap **"Add to Home Screen"**
   - Tap **"Add"**

5. **Open from home screen** to test standalone mode

---

## Troubleshooting

### Problem: Can't connect from iPhone

**Solution 1: Check Windows IP**
```bash
# In WSL, try:
cat /etc/resolv.conf
# The nameserver IP is usually your Windows host IP
```

**Solution 2: Try WSL IP directly**
```bash
# In WSL:
hostname -I
# Use this IP: http://172.x.x.x:5173/home
```

**Solution 3: Port forwarding (Windows)**
If WSL IP doesn't work, forward the port:
```powershell
# Run in PowerShell as Admin:
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=172.23.137.173
```

Then use Windows IP: `http://YOUR_WINDOWS_IP:5173/home`

---

### Problem: "This site can't be reached"

**Check:**
1. ✅ Dev server is running (`npm run dev`)
2. ✅ iPhone is on same WiFi
3. ✅ Windows Firewall allows port 5173
4. ✅ Using correct IP address

---

### Problem: PWA features don't work

**Note:** PWA requires HTTPS for full functionality, BUT:
- **localhost works** (but iPhone can't access localhost)
- **HTTP works for testing** but install prompt might not show
- **Workaround:** Use manual "Add to Home Screen" (Share → Add to Home Screen)

---

## Quick Test URLs

Once you have the IP, test these:

- **Home page**: `http://YOUR_IP:5173/home`
- **Calendar**: `http://YOUR_IP:5173/calendar`
- **Org booking**: `http://YOUR_IP:5173/schedule/org/mahletmedicalclinic`

---

## Alternative: Use Windows IP Directly

If WSL networking is complicated, you can:

1. **Find Windows IP:**
   ```powershell
   # In PowerShell:
   (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"}).IPAddress
   ```

2. **Use that IP** in iPhone: `http://WINDOWS_IP:5173/home`

3. **Make sure Vite is accessible** (already configured with `host: '0.0.0.0'`)

---

## Success!

Once you can access the site on iPhone:
- ✅ Test the PWA install
- ✅ Test offline mode
- ✅ Test on different pages
- ✅ Check service worker registration

**Happy Testing! 📱**





