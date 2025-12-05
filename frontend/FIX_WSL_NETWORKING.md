# Fix WSL2 Networking for iPhone Access

## The Problem
WSL2 uses a virtual network, so `172.23.128.1` (Windows host) doesn't automatically forward to WSL. We need to set up port forwarding.

## Solution: Port Forwarding

### Step 1: Find Your Windows WiFi IP

**On Windows (PowerShell or CMD):**
```powershell
ipconfig
```

Look for your WiFi adapter (usually "Wireless LAN adapter Wi-Fi" or similar) and find the "IPv4 Address". It will be something like:
- `192.168.1.100`
- `10.0.0.5`
- `192.168.0.50`

**This is the IP you'll use on iPhone!**

---

### Step 2: Set Up Port Forwarding (Windows PowerShell as Admin)

**Open PowerShell as Administrator** (Right-click → Run as Administrator), then run:

```powershell
# Get WSL IP (you already have this: 172.23.137.173)
# Replace with your actual WSL IP if different

# Forward port 5173 from Windows to WSL
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=172.23.137.173

# Allow firewall rule
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

**To verify it worked:**
```powershell
netsh interface portproxy show all
```

You should see:
```
Listen on ipv4:             Connect to ipv4:
Address         Port        Address         Port
--------------- ----------  --------------- ----------
0.0.0.0         5173        172.23.137.173  5173
```

---

### Step 3: Start Dev Server

**In WSL:**
```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment/frontend
npm run dev
```

Make sure it shows:
```
➜  Network: http://0.0.0.0:5173/
```

---

### Step 4: Access from iPhone

**On your iPhone Safari, use your Windows WiFi IP:**

```
http://YOUR_WINDOWS_WIFI_IP:5173/home
```

**Example:**
- If Windows WiFi IP is `192.168.1.100`, use: `http://192.168.1.100:5173/home`
- If Windows WiFi IP is `10.0.0.5`, use: `http://10.0.0.5:5173/home`

---

## Alternative: Quick Test Script

Create a file `test-connection.ps1` on Windows:

```powershell
# Get Windows WiFi IP
$wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -like "*Wi-Fi*" -or 
    $_.InterfaceAlias -like "*Wireless*"
}).IPAddress | Select-Object -First 1

Write-Host "Your Windows WiFi IP: $wifiIP"
Write-Host ""
Write-Host "Use this URL on iPhone:"
Write-Host "http://$wifiIP:5173/home"
Write-Host ""
Write-Host "Setting up port forwarding..."

# Forward port
netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0 2>$null
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=172.23.137.173

# Firewall rule
$existing = Get-NetFirewallRule -DisplayName "Vite Dev Server" -ErrorAction SilentlyContinue
if (-not $existing) {
    New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
}

Write-Host "Done! Now start your dev server in WSL and use the URL above on iPhone."
```

Run it:
```powershell
.\test-connection.ps1
```

---

## Troubleshooting

### Still can't connect?

1. **Check if dev server is running:**
   ```bash
   # In WSL
   curl http://localhost:5173
   ```

2. **Check Windows firewall:**
   ```powershell
   # In PowerShell (Admin)
   Get-NetFirewallRule -DisplayName "Vite Dev Server"
   ```

3. **Try restarting port forwarding:**
   ```powershell
   # Remove old rule
   netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0
   
   # Add new rule
   netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=172.23.137.173
   ```

4. **Check if port is in use:**
   ```powershell
   netstat -an | findstr 5173
   ```

---

## Remove Port Forwarding (When Done)

```powershell
netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0
Remove-NetFirewallRule -DisplayName "Vite Dev Server"
```





