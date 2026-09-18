# Progressive Web App (PWA) Implementation Guide

**Document Version**: 1.0  
**Created**: 2025-11-16  
**Target**: Ethiopian Scheduling Platform - React Frontend  
**Complexity**: Medium  
**Estimated Time**: 4-6 hours  
**Priority**: High (Post-MVP Enhancement)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What is PWA & Why It Matters](#what-is-pwa--why-it-matters)
3. [Architecture & Scope](#architecture--scope)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Step-by-Step Implementation](#step-by-step-implementation)
6. [Best Practices & Optimization](#best-practices--optimization)
7. [UI/UX Considerations](#uiux-considerations)
8. [Performance Optimization](#performance-optimization)
9. [Reliability & Offline Strategy](#reliability--offline-strategy)
10. [Testing & Quality Assurance](#testing--quality-assurance)
11. [Deployment & Monitoring](#deployment--monitoring)
12. [Troubleshooting](#troubleshooting)

---

## Executive Summary

### Goals
Transform the React booking frontend into a Progressive Web App that provides:
- **Native app-like experience** on mobile and desktop
- **Offline functionality** for viewing appointments and basic operations
- **Fast load times** through aggressive caching (target: <2s on 3G)
- **Reduced bandwidth** consumption (critical for Ethiopian mobile networks)
- **Easy installation** without app store friction

### Success Metrics
- ✅ Lighthouse PWA score: ≥90/100
- ✅ First load: <3s on 3G
- ✅ Repeat visit: <1s (cached)
- ✅ Installation rate: ≥15% of repeat visitors
- ✅ Offline capability: 100% of read operations
- ✅ Service worker registration: >95% success rate

### Target Platforms
- **Primary**: Android mobile (Chrome, Samsung Internet)
- **Secondary**: Desktop Chrome/Edge, iOS Safari (limited)
- **Tertiary**: Firefox, Opera

---

## What is PWA & Why It Matters

### What is a PWA?
A Progressive Web App is a web application that uses modern web capabilities to deliver an app-like experience:
- **Installable**: Add to home screen like native apps
- **Offline-first**: Works without internet connection
- **Fast**: Instant loading with service worker caching
- **Engaging**: Push notifications, background sync
- **Secure**: HTTPS required

### Why PWA for Ethiopia?
1. **No app store friction**: Users install directly from browser
2. **Smaller footprint**: ~1-2MB vs 10-50MB for native apps
3. **Always up-to-date**: No manual updates required
4. **Works offline**: Critical for intermittent connectivity
5. **Lower data costs**: Caching reduces data consumption by 60-80%
6. **Cross-platform**: One codebase for Android, iOS, desktop

### Ethiopian Context Benefits
- **Bandwidth-constrained networks**: Aggressive caching strategy
- **Expensive data plans**: Minimize API calls through offline-first design
- **Mixed device ecosystem**: Works on low-end Android devices
- **App store barriers**: No need for Google Play/App Store presence
- **Instant updates**: Bug fixes deploy immediately without user action

---

## Architecture & Scope

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser/WebView                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           React Frontend (PWA)                    │  │
│  │           /schedule/* routes                      │  │
│  │           - Installable ✓                         │  │
│  │           - Service Worker ✓                      │  │
│  │           - Offline Support ✓                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Frappe Desk (Non-PWA)                   │  │
│  │           /app/* routes                           │  │
│  │           - Not installable ✗                     │  │
│  │           - No service worker                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
         │                              │
         │                              │
    ┌───▼────┐                    ┌────▼─────┐
    │ Service│                    │  Cache   │
    │ Worker │◄───────────────────│ Storage  │
    └────────┘                    └──────────┘
         │
         │
    ┌────▼────────────────────────────────────┐
    │   Frappe Backend (API + DB)             │
    │   - RESTful APIs                         │
    │   - Authentication                       │
    │   - Business Logic                       │
    └─────────────────────────────────────────┘
```

### Scope Definition

**✅ IN SCOPE (PWA Features)**
- `/schedule/*` routes (booking frontend)
- Service worker for caching
- Offline functionality (read-only)
- Install prompts and lifecycle
- Background sync (optional)
- Push notifications (future)

**❌ OUT OF SCOPE (Non-PWA)**
- `/app/*` routes (Frappe Desk admin)
- Backend API changes
- Native mobile app features (camera, GPS)
- Advanced offline write operations

### Service Worker Scope Strategy

The service worker will ONLY control `/schedule/` and its sub-routes:

```javascript
// Service worker scope
scope: '/schedule/'

// This means:
✅ Controlled:   /schedule/appointment-group/123
✅ Controlled:   /schedule/book/456
✅ Controlled:   /schedule/home
❌ Not controlled: /app/appointment-group
❌ Not controlled: /api/method/some.endpoint
```

This ensures:
1. Frappe Desk remains unaffected
2. API calls are not double-cached
3. Clear separation of concerns
4. Easier debugging and maintenance

---

## Implementation Roadmap

### Phase 1: Foundation (2 hours)
- [ ] Install PWA dependencies
- [ ] Configure Vite PWA plugin
- [ ] Create web app manifest
- [ ] Add basic service worker

### Phase 2: Assets & Branding (1 hour)
- [ ] Generate PWA icons (8 sizes)
- [ ] Create splash screens (iOS)
- [ ] Design offline page
- [ ] Add theme colors

### Phase 3: Caching Strategy (1.5 hours)
- [ ] Configure workbox strategies
- [ ] Implement cache versioning
- [ ] Add offline fallbacks
- [ ] Test cache invalidation

### Phase 4: UI/UX Enhancements (1 hour)
- [ ] Create install prompt component
- [ ] Add update notification
- [ ] Design onboarding for PWA users
- [ ] Add "Add to Home Screen" tutorial

### Phase 5: Testing & Optimization (1.5 hours)
- [ ] Lighthouse audits
- [ ] Cross-browser testing
- [ ] Offline scenario testing
- [ ] Performance profiling

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
cd /home/minte/projects/frappe-bench/apps/appointment/frontend
npm install -D vite-plugin-pwa
npm install workbox-window
```

**Dependencies Explained**:
- `vite-plugin-pwa`: Zero-config PWA plugin for Vite
- `workbox-window`: Google's service worker library for window context

---

### Step 2: Configure Vite PWA Plugin

**File**: `frontend/vite.config.ts`

```typescript
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  let proxyConfig = {};
  if (env.VITE_SITE_NAME && env.VITE_SITE_PORT) {
    proxyConfig = {
      "^/(app|api|assets|files|private)": {
        target: `http://localhost:${env.VITE_SITE_PORT}`,
        ws: true,
        changeOrigin: true,
        secure: false,
        router: function () {
          return `http://${env.VITE_SITE_NAME}:${env.VITE_SITE_PORT}`;
        },
      },
    };
  }
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
        
        // Web App Manifest
        manifest: {
          name: "Ethiopian Scheduler - መርሃግብር",
          short_name: "Scheduler",
          description: "Professional appointment scheduling for Ethiopian businesses",
          theme_color: "#4F46E5",
          background_color: "#FFFFFF",
          display: "standalone",
          orientation: "portrait-primary",
          scope: "/schedule/",
          start_url: "/schedule/",
          lang: "en-ET",
          dir: "ltr",
          categories: ["productivity", "business", "lifestyle"],
          
          icons: [
            {
              src: "/assets/appointment/frontend/icons/icon-72x72.png",
              sizes: "72x72",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/assets/appointment/frontend/icons/icon-96x96.png",
              sizes: "96x96",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/assets/appointment/frontend/icons/icon-128x128.png",
              sizes: "128x128",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/assets/appointment/frontend/icons/icon-144x144.png",
              sizes: "144x144",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/assets/appointment/frontend/icons/icon-152x152.png",
              sizes: "152x152",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/assets/appointment/frontend/icons/icon-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/assets/appointment/frontend/icons/icon-384x384.png",
              sizes: "384x384",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/assets/appointment/frontend/icons/icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/assets/appointment/frontend/icons/icon-512x512-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ],
          
          // iOS-specific
          apple: {
            statusBarStyle: "black-translucent"
          },
          
          // Android-specific
          prefer_related_applications: false,
          
          // Shortcuts (quick actions from home screen)
          shortcuts: [
            {
              name: "Book Appointment",
              short_name: "Book",
              description: "Book a new appointment",
              url: "/schedule/?action=book",
              icons: [
                {
                  src: "/assets/appointment/frontend/icons/shortcut-book.png",
                  sizes: "96x96"
                }
              ]
            },
            {
              name: "My Appointments",
              short_name: "Appointments",
              description: "View your appointments",
              url: "/schedule/home",
              icons: [
                {
                  src: "/assets/appointment/frontend/icons/shortcut-list.png",
                  sizes: "96x96"
                }
              ]
            }
          ]
        },
        
        // Service Worker Configuration
        workbox: {
          // Service worker scope
          navigateFallback: null, // Disable for Frappe compatibility
          
          // Caching strategies
          runtimeCaching: [
            // Static assets (images, fonts, etc.)
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            
            // App assets (JS, CSS)
            {
              urlPattern: /\/assets\/appointment\/frontend\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "app-assets-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                }
              }
            },
            
            // Images
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: "CacheFirst",
              options: {
                cacheName: "images-cache",
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            },
            
            // API calls - Network first with cache fallback
            {
              urlPattern: /\/api\/method\/appointment\..*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 // 1 hour
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            
            // Schedule pages - Stale while revalidate
            {
              urlPattern: /\/schedule\/.*/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "schedule-pages-cache",
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 // 1 day
                }
              }
            }
          ],
          
          // Files to precache (available offline immediately)
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,woff,woff2}"
          ],
          
          // Maximum cache size (in bytes)
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          
          // Clean up old caches
          cleanupOutdatedCaches: true,
          
          // Skip waiting (install service worker immediately)
          skipWaiting: true,
          clientsClaim: true
        },
        
        devOptions: {
          enabled: true, // Enable in development for testing
          type: "module"
        }
      })
    ],
    
    server: {
      port: 5173,
      proxy: proxyConfig,
    },
    
    build: {
      outDir: "../appointment/public/frontend",
      emptyOutDir: true,
      target: "es2015",
      
      // Optimize bundle size
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "ui-vendor": ["framer-motion", "lucide-react"],
            "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"]
          }
        }
      }
    },
    
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
```

**Configuration Breakdown**:
- **registerType**: `autoUpdate` = Auto-update service worker without user prompt
- **manifest**: Web app manifest embedded in build
- **workbox.runtimeCaching**: Define caching strategies per URL pattern
- **workbox.skipWaiting**: Install new service worker immediately (no waiting)
- **workbox.clientsClaim**: Take control of all clients immediately

---

### Step 3: Update HTML Template

**File**: `frontend/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.webmanifest" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/assets/appointment/appointment-logo.png" />
    
    <!-- PWA Meta Tags -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#4F46E5" />
    <meta name="description" content="Professional appointment scheduling for Ethiopian businesses - መርሃግብር" />
    
    <!-- iOS PWA Support -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Scheduler" />
    <link rel="apple-touch-icon" href="/assets/appointment/frontend/icons/apple-touch-icon-180x180.png" />
    <link rel="apple-touch-startup-image" href="/assets/appointment/frontend/icons/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px)" />
    <link rel="apple-touch-startup-image" href="/assets/appointment/frontend/icons/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px)" />
    <link rel="apple-touch-startup-image" href="/assets/appointment/frontend/icons/splash-1242x2208.png" media="(device-width: 414px) and (device-height: 736px)" />
    <link rel="apple-touch-startup-image" href="/assets/appointment/frontend/icons/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px)" />
    
    <!-- Windows/Edge PWA Support -->
    <meta name="msapplication-TileColor" content="#4F46E5" />
    <meta name="msapplication-TileImage" content="/assets/appointment/frontend/icons/icon-144x144.png" />
    <meta name="msapplication-config" content="/browserconfig.xml" />
    
    <!-- Preconnect for performance -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Noto+Sans+Ethiopic:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <title>{{app_name}}</title>
  </head>
  <body>
    <div id="root"></div>
    
    <!-- Frappe boot script -->
    <script>
      // Load everything from the page context to window object
      window.csrf_token = '{{ csrf_token }}';
      if (!window.frappe) window.frappe = {};
      window.app_name = "{{ app_name }}";
      frappe.boot = JSON.parse({{ boot }});
      frappe.csrf_token = "{{ csrf_token }}";
    </script>
    
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### Step 4: Create PWA Icons

Create directory: `frontend/public/icons/`

You need to generate icons in these sizes:

**Required Icon Sizes**:
- 72×72 (Android)
- 96×96 (Android)
- 128×128 (Android)
- 144×144 (Windows tile)
- 152×152 (iPad)
- 192×192 (Android, standard)
- 384×384 (Android)
- 512×512 (Android, splash screen)
- 512×512 maskable (Android adaptive)
- 180×180 (iOS touch icon)

**Icon Generation Tools**:
1. **PWA Asset Generator** (Recommended):
   ```bash
   npm install -g pwa-asset-generator
   pwa-asset-generator logo.svg ./public/icons \
     --icon-only \
     --favicon \
     --maskable \
     --padding "15%"
   ```

2. **Online Tools**:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator

**Icon Design Guidelines**:
- Use a square logo with padding (safe zone)
- Avoid text (should be readable at 48×48)
- Use brand colors
- Test on light/dark backgrounds
- Create maskable version (80% safe zone for Android adaptive icons)

**Example Icon Structure**:
```
frontend/public/icons/
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
├── icon-512x512.png
├── icon-512x512-maskable.png
├── apple-touch-icon-180x180.png
├── favicon.ico
├── shortcut-book.png (96×96)
├── shortcut-list.png (96×96)
└── splash/
    ├── splash-640x1136.png
    ├── splash-750x1334.png
    ├── splash-1242x2208.png
    └── splash-1125x2436.png
```

---

### Step 5: Create Offline Fallback Page

**File**: `frontend/public/offline.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Ethiopian Scheduler</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #1a202c;
    }
    
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: #f7fafc;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
    }
    
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #2d3748;
    }
    
    .subtitle {
      font-size: 18px;
      color: #4a5568;
      margin-bottom: 30px;
    }
    
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #718096;
      margin-bottom: 30px;
    }
    
    .features {
      text-align: left;
      background: #f7fafc;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .features h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #2d3748;
    }
    
    .features ul {
      list-style: none;
    }
    
    .features li {
      padding: 8px 0;
      font-size: 14px;
      color: #4a5568;
      display: flex;
      align-items: center;
    }
    
    .features li:before {
      content: "✓";
      color: #48bb78;
      font-weight: bold;
      margin-right: 10px;
      font-size: 18px;
    }
    
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 14px 32px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s;
    }
    
    .btn:hover {
      transform: translateY(-2px);
    }
    
    .btn:active {
      transform: translateY(0);
    }
    
    .amharic {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-family: 'Noto Sans Ethiopic', sans-serif;
    }
    
    @media (max-width: 480px) {
      .container {
        padding: 30px 20px;
      }
      
      h1 {
        font-size: 24px;
      }
      
      .subtitle {
        font-size: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p class="subtitle">No internet connection detected</p>
    
    <p>
      Don't worry! Some features are still available while you're offline.
      Your changes will sync automatically when you reconnect.
    </p>
    
    <div class="features">
      <h3>Available Offline:</h3>
      <ul>
        <li>View your cached appointments</li>
        <li>Browse your schedule</li>
        <li>Access saved provider information</li>
        <li>Review booking history</li>
      </ul>
    </div>
    
    <a href="javascript:window.location.reload()" class="btn">
      Try Again
    </a>
    
    <div class="amharic">
      <h1>ከመስመር ውጭ ነዎት</h1>
      <p>የበይነመረብ ግንኙነት የለም። አንዳንድ ባህሪያት አሁንም ይገኛሉ።</p>
    </div>
  </div>
  
  <script>
    // Auto-reload when back online
    window.addEventListener('online', () => {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    });
    
    // Update UI when online status changes
    function updateOnlineStatus() {
      if (navigator.onLine) {
        document.querySelector('.container').innerHTML = `
          <div class="icon">✓</div>
          <h1>Back Online!</h1>
          <p>Reconnecting...</p>
        `;
        setTimeout(() => window.location.reload(), 1000);
      }
    }
    
    window.addEventListener('online', updateOnlineStatus);
  </script>
</body>
</html>
```

---

### Step 6: Create Install Prompt Component

**File**: `frontend/src/components/pwa/InstallPrompt.tsx`

```typescript
import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if user previously dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissed = dismissedDate
      ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // Show again after 7 days
    if (dismissedDate && daysSinceDismissed < 7) {
      setHasBeenDismissed(true);
    }

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 30 seconds or 2nd visit
      const visitCount = parseInt(localStorage.getItem("visit-count") || "0");
      if (visitCount >= 1 && !hasBeenDismissed) {
        setTimeout(() => setShowPrompt(true), 30000); // 30 seconds
      }

      localStorage.setItem("visit-count", String(visitCount + 1));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [hasBeenDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("PWA installed successfully");
      // Track analytics
      trackInstallEvent("accepted");
    } else {
      console.log("PWA installation dismissed");
      trackInstallEvent("dismissed");
    }

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
    trackInstallEvent("dismissed");
  };

  const trackInstallEvent = (action: string) => {
    // Track with your analytics tool
    if (window.frappe?.call) {
      window.frappe.call({
        method: "appointment.api.analytics.track_pwa_event",
        args: {
          event: "pwa_install_prompt",
          action: action,
          platform: isIOS ? "ios" : "android",
        },
      });
    }
  };

  // Don't show if already installed or on iOS (iOS doesn't support beforeinstallprompt)
  if (isStandalone || hasBeenDismissed) return null;

  // iOS-specific instructions
  if (isIOS && !isStandalone && !hasBeenDismissed) {
    return (
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Install App
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add to Home Screen
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium text-gray-900 dark:text-white">
                  To install this app on your iPhone:
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Tap the <span className="font-semibold">Share</span> button below
                  </li>
                  <li>
                    Scroll down and tap{" "}
                    <span className="font-semibold">"Add to Home Screen"</span>
                  </li>
                  <li>
                    Tap <span className="font-semibold">"Add"</span> to confirm
                  </li>
                </ol>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  💡 Works offline · Faster loading · Native app feel
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Android/Desktop prompt
  return (
    <AnimatePresence>
      {showPrompt && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Install Ethiopian Scheduler
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    መርሃግብር - ኢትዮጵያ
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Install this app for a better experience. Works offline, loads faster, and
              feels like a native app.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div>
                <div className="text-2xl mb-1">📱</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">App-like</p>
              </div>
              <div>
                <div className="text-2xl mb-1">⚡</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Fast</p>
              </div>
              <div>
                <div className="text-2xl mb-1">📡</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Offline</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105"
              >
                Install
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### Step 7: Add Update Notification Component

**File**: `frontend/src/components/pwa/UpdateNotification.tsx`

```typescript
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdateNotification() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered:", r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-indigo-600 text-white rounded-lg shadow-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5" />
          <div>
            {offlineReady ? (
              <p className="font-medium">App ready to work offline</p>
            ) : (
              <p className="font-medium">New version available!</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-4 py-1.5 bg-white text-indigo-600 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Update
            </button>
          )}
          <button
            onClick={close}
            className="px-4 py-1.5 bg-indigo-700 rounded-md hover:bg-indigo-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 8: Register Components in Main App

**File**: `frontend/src/App.tsx` (or main layout component)

```typescript
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdateNotification } from "@/components/pwa/UpdateNotification";

export function App() {
  return (
    <>
      {/* Your existing app content */}
      <YourRouterAndComponents />
      
      {/* PWA Components */}
      <InstallPrompt />
      <UpdateNotification />
    </>
  );
}
```

---

### Step 9: Update Package.json Scripts

**File**: `frontend/package.json`

```json
{
  "scripts": {
    "copy-html-entry": "cp ../appointment/public/frontend/index.html ../appointment/www/schedule/index.html",
    "copy-pwa-assets": "cp -r public/icons ../appointment/public/frontend/ && cp public/offline.html ../appointment/public/frontend/",
    "dev": "vite",
    "build": "npm install && vite build --base=/assets/appointment/frontend/ && npm run copy-html-entry && npm run copy-pwa-assets",
    "lint": "eslint . --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "preview": "vite preview",
    "pwa:test": "vite build && vite preview"
  }
}
```

---

## Best Practices & Optimization

### 1. Service Worker Best Practices

**DO:**
- ✅ Use versioned cache names (e.g., `v1-assets`)
- ✅ Clean up old caches on activation
- ✅ Implement stale-while-revalidate for frequently changing content
- ✅ Network-first for API calls (fresh data priority)
- ✅ Cache-first for static assets (performance priority)
- ✅ Set reasonable expiration times
- ✅ Use `skipWaiting` and `clientsClaim` for faster updates
- ✅ Handle failed fetches gracefully with fallbacks

**DON'T:**
- ❌ Cache authenticated API responses without careful consideration
- ❌ Cache infinitely (set max age and max entries)
- ❌ Intercept POST/PUT/DELETE requests (let them go to network)
- ❌ Cache the service worker file itself
- ❌ Use overly aggressive caching for user-specific data

### 2. Manifest Best Practices

**DO:**
- ✅ Use descriptive name and short_name
- ✅ Provide all required icon sizes
- ✅ Set appropriate start_url and scope
- ✅ Choose correct display mode (standalone for app-like)
- ✅ Add theme_color matching your brand
- ✅ Include description for app stores
- ✅ Add shortcuts for quick actions
- ✅ Specify language and text direction

**DON'T:**
- ❌ Use generic names ("App", "Website")
- ❌ Omit required icon sizes
- ❌ Set scope too broadly (affects non-PWA routes)
- ❌ Use "browser" display mode (defeats PWA purpose)

### 3. Caching Strategy Guidelines

**Cache-First** (best for: static assets)
```javascript
// Fast, uses cache if available, network as fallback
handler: "CacheFirst"
// Use for: CSS, JS, fonts, logos
```

**Network-First** (best for: API data)
```javascript
// Fresh data priority, falls back to cache if offline
handler: "NetworkFirst",
options: {
  networkTimeoutSeconds: 10 // Fallback to cache after 10s
}
// Use for: User data, appointments, real-time info
```

**Stale-While-Revalidate** (best for: pages, images)
```javascript
// Returns cache immediately, updates cache in background
handler: "StaleWhileRevalidate"
// Use for: HTML pages, profile images, content
```

**Network-Only** (best for: writes, auth)
```javascript
// Always hits network, no caching
handler: "NetworkOnly"
// Use for: Login, POST/PUT/DELETE, payments
```

### 4. Performance Optimization

**Bundle Size Optimization**:
```javascript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      // Split vendor chunks
      manualChunks: {
        "react-vendor": ["react", "react-dom"],
        "ui-vendor": ["framer-motion", "lucide-react"],
      }
    }
  },
  // Minification
  minify: "terser",
  terserOptions: {
    compress: {
      drop_console: true, // Remove console.logs in production
    }
  }
}
```

**Asset Optimization**:
- Compress images (use WebP format)
- Lazy-load components with `React.lazy()`
- Use font-display: swap for web fonts
- Minimize third-party scripts
- Enable gzip/brotli compression on server

**Loading Strategy**:
```typescript
// Lazy load route components
const Home = lazy(() => import("@/pages/home"));
const Booking = lazy(() => import("@/pages/booking"));

// Show suspense fallback
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/home" element={<Home />} />
  </Routes>
</Suspense>
```

### 5. Security Best Practices

**HTTPS Required**:
```nginx
# Nginx config - Force HTTPS
server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;
  
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  # ... rest of config
}
```

**Content Security Policy**:
```html
<!-- Add to index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
               font-src 'self' https://fonts.gstatic.com;
               img-src 'self' data: https:;
               connect-src 'self' https://yourdomain.com;">
```

**Service Worker Security**:
- Never cache sensitive data (passwords, tokens)
- Always validate cached responses
- Use SRI (Subresource Integrity) for CDN assets
- Implement proper CORS headers

---

## UI/UX Considerations

### 1. Installation UX Flow

**First Visit** (0-30 seconds):
- User lands on booking page
- No install prompt (don't be pushy)
- Track visit count

**Second Visit** (after 30 seconds):
- Show subtle install banner (bottom-right)
- Easy to dismiss
- Track dismissal

**Post-Installation**:
- Welcome screen for installed users
- Quick tour of offline features
- Badge indicator "You're using the app!"

### 2. Offline Experience Design

**Connection Status Indicator**:
```typescript
export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
      <p className="text-sm font-medium">
        📡 You're offline - Some features may be limited
      </p>
    </div>
  );
}
```

**Optimistic UI Updates**:
```typescript
// Show success immediately, sync in background
async function bookAppointment(data) {
  // 1. Update UI optimistically
  addToLocalState(data);
  showSuccessToast("Appointment booked!");

  try {
    // 2. Sync to server
    await api.post("/book", data);
  } catch (error) {
    // 3. Rollback on failure
    removeFromLocalState(data);
    showErrorToast("Failed to sync. Will retry when online.");
    
    // 4. Queue for background sync
    if ("serviceWorker" in navigator && "sync" in ServiceWorkerRegistration.prototype) {
      await navigator.serviceWorker.ready.then((registration) => {
        registration.sync.register("sync-bookings");
      });
    }
  }
}
```

### 3. Update Experience

**Silent Updates** (default):
- Auto-update service worker in background
- User sees new version on next visit
- No interruption

**Prompted Updates** (for critical fixes):
```typescript
// Show update notification
<UpdateNotification 
  message="New features available!"
  action="Update Now"
  onUpdate={() => updateServiceWorker(true)}
/>
```

### 4. Loading States

**First Load** (cold start):
```typescript
<div className="min-h-screen flex items-center justify-center">
  <div className="text-center">
    <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
    <p className="text-gray-600">Loading Ethiopian Scheduler...</p>
    <p className="text-sm text-gray-400 mt-2">መርሃግብር በመጫን ላይ...</p>
  </div>
</div>
```

**Subsequent Loads** (from cache):
- Should be near-instant (<500ms)
- Minimal or no loading screen needed

### 5. Error Handling

**Network Errors**:
```typescript
try {
  const data = await fetchAppointments();
  return data;
} catch (error) {
  // Check if offline
  if (!navigator.onLine) {
    // Return cached data
    const cached = await getCachedAppointments();
    if (cached) {
      showInfo("Showing cached appointments (offline mode)");
      return cached;
    }
  }
  
  // Other errors
  showError("Failed to load appointments. Please try again.");
  throw error;
}
```

---

## Performance Optimization

### 1. Lighthouse Score Targets

Target scores for PWA audit:
- **Performance**: ≥90
- **Accessibility**: 100
- **Best Practices**: ≥95
- **SEO**: ≥90
- **PWA**: ≥90

### 2. Core Web Vitals

**LCP (Largest Contentful Paint)**: <2.5s
- Optimize hero images
- Preload critical assets
- Use CDN for static assets

**FID (First Input Delay)**: <100ms
- Minimize JavaScript execution
- Code splitting
- Defer non-critical JS

**CLS (Cumulative Layout Shift)**: <0.1
- Set explicit width/height for images
- Avoid inserting content above fold
- Use CSS aspect-ratio

### 3. Ethiopian Network Optimization

**3G Connection Assumptions**:
- Bandwidth: ~400 Kbps
- Latency: 300-600ms
- Packet loss: 5-10%

**Optimization Strategies**:
```javascript
// 1. Aggressive code splitting
const AdminPanel = lazy(() => import(/* webpackChunkName: "admin" */ "./AdminPanel"));

// 2. Image optimization
<img 
  src="profile.webp" 
  loading="lazy"
  decoding="async"
  width="200" 
  height="200"
  alt="Profile"
/>

// 3. API request batching
const appointments = await Promise.all([
  fetchUpcoming(),
  fetchPast(),
  fetchCancelled()
]);

// 4. Compression
// Ensure server sends gzip/brotli
Accept-Encoding: gzip, deflate, br
```

### 4. Cache Storage Limits

**Browser Limits**:
- Chrome: ~60% of free disk space (up to 6GB on mobile)
- Safari: 50MB (iOS), 1GB (macOS)
- Firefox: 50% of free disk space (up to 2GB)

**Strategy**:
- Monitor cache size
- Implement cache expiration
- Delete old caches on update
- Use quota API to check available space

```typescript
// Check storage quota
if (navigator.storage && navigator.storage.estimate) {
  const { usage, quota } = await navigator.storage.estimate();
  const percentUsed = (usage / quota) * 100;
  console.log(`Using ${percentUsed.toFixed(2)}% of available storage`);
  
  if (percentUsed > 80) {
    // Warn user or clean up old caches
    await cleanupOldCaches();
  }
}
```

---

## Reliability & Offline Strategy

### 1. Offline-First Architecture

**Data Flow**:
```
User Action → Update Local State → Update UI Optimistically
     ↓
Background Sync → Send to Server → Confirm/Rollback
```

**Implementation**:
```typescript
// Local database (IndexedDB via Dexie.js)
import Dexie, { Table } from "dexie";

class AppDatabase extends Dexie {
  appointments!: Table<Appointment>;
  pendingSync!: Table<PendingAction>;

  constructor() {
    super("EthiopianSchedulerDB");
    this.version(1).stores({
      appointments: "++id, userId, date, status",
      pendingSync: "++id, action, data, timestamp"
    });
  }
}

const db = new AppDatabase();

// Queue action for sync
async function queueForSync(action: string, data: any) {
  await db.pendingSync.add({
    action,
    data,
    timestamp: Date.now()
  });
  
  // Trigger background sync if available
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if ("sync" in registration) {
      await registration.sync.register("sync-appointments");
    }
  }
}
```

### 2. Background Sync

**Service Worker** (handled by Workbox):
```javascript
// auto-generated by vite-plugin-pwa
// But you can customize:

workbox: {
  // Enable background sync
  runtimeCaching: [
    {
      urlPattern: /\/api\/method\/appointment\.booking\.create/,
      handler: "NetworkOnly",
      options: {
        backgroundSync: {
          name: "booking-queue",
          options: {
            maxRetentionTime: 24 * 60 // Retry for 24 hours
          }
        }
      }
    }
  ]
}
```

### 3. Conflict Resolution

**Scenario**: User books offline, another user books same slot online

**Strategy**:
```typescript
async function syncBooking(localBooking) {
  try {
    const response = await api.post("/book", localBooking);
    
    // Success - update local record
    await db.appointments.put(response.data);
    await db.pendingSync.delete(localBooking.syncId);
    
  } catch (error) {
    if (error.status === 409) {
      // Conflict - slot no longer available
      await db.appointments.delete(localBooking.id);
      
      showNotification({
        title: "Booking Conflict",
        message: "This time slot is no longer available. Please choose another.",
        actions: [
          { label: "Choose New Time", action: () => navigate("/book") }
        ]
      });
    } else {
      // Network error - retry later
      console.log("Will retry sync later");
    }
  }
}
```

### 4. Data Freshness Strategy

**Stale-While-Revalidate Pattern**:
```typescript
async function getAppointments() {
  // 1. Show cached data immediately
  const cached = await getCachedAppointments();
  if (cached) {
    displayAppointments(cached);
  }
  
  // 2. Fetch fresh data in background
  try {
    const fresh = await api.get("/appointments");
    
    // 3. Update cache and UI if data changed
    if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
      await cacheAppointments(fresh);
      displayAppointments(fresh);
      showToast("Appointments updated", { icon: "🔄" });
    }
  } catch (error) {
    // Network error - cached data is still valid
    if (!cached) {
      showError("Unable to load appointments");
    }
  }
}
```

---

## Testing & Quality Assurance

### 1. PWA Checklist

**Core Requirements**:
- [ ] HTTPS enabled
- [ ] Web app manifest present
- [ ] Service worker registered
- [ ] Icons (192x192, 512x512)
- [ ] Start URL loads offline
- [ ] Page load < 3s on 3G
- [ ] Viewport meta tag
- [ ] Theme color

**Enhanced Requirements**:
- [ ] Maskable icon (Android adaptive)
- [ ] Apple touch icon (iOS)
- [ ] Splash screens (iOS)
- [ ] Shortcuts defined
- [ ] Offline page
- [ ] Background sync (optional)
- [ ] Push notifications (optional)

### 2. Testing Tools

**Chrome DevTools**:
```bash
# 1. Open DevTools (F12)
# 2. Go to Application tab
# 3. Check:
#    - Manifest (verify all fields)
#    - Service Workers (status: activated)
#    - Cache Storage (verify cached files)
#    - Storage (check quota usage)

# 4. Test offline:
#    - Network tab → Offline checkbox
#    - Reload page
#    - Test core functionality
```

**Lighthouse Audit**:
```bash
# Run from DevTools Lighthouse tab
# Or CLI:
npm install -g lighthouse
lighthouse https://yourdomain.com/schedule/ --view
```

**PWA Builder**:
- Visit: https://www.pwabuilder.com/
- Enter your URL
- Get PWA score and recommendations

### 3. Cross-Browser Testing

**Priority Testing Matrix**:
| Browser | Platform | Priority | Notes |
|---------|----------|----------|-------|
| Chrome | Android | P0 | Full PWA support |
| Samsung Internet | Android | P0 | Full PWA support |
| Chrome | Desktop | P1 | Full PWA support |
| Edge | Desktop | P1 | Full PWA support |
| Safari | iOS | P1 | Limited PWA (no prompt) |
| Firefox | Android | P2 | Good PWA support |
| Opera | Android | P2 | Good PWA support |
| Safari | macOS | P3 | Limited PWA support |

**Test Scenarios**:
1. Install flow (prompt, install, launch)
2. Offline mode (view data, queue actions)
3. Update flow (new version notification)
4. Uninstall (clean cache removal)
5. Performance (load time, cache hit rate)

### 4. Ethiopian Context Testing

**Network Conditions**:
```bash
# Chrome DevTools → Network tab → Throttling

# Test with:
- Slow 3G (400 Kbps, 400ms RTT, 5% packet loss)
- Fast 3G (1.6 Mbps, 150ms RTT)
- Offline
- Online → Offline → Online (transitions)
```

**Device Testing**:
- Low-end Android (2GB RAM, entry-level CPU)
- Mid-range Android (4GB RAM)
- iPhone (Safari limitations)
- Desktop (Chrome/Edge)

**Scenarios**:
1. Book appointment on slow 3G
2. Go offline mid-booking
3. View cached appointments offline
4. Sync after coming back online
5. Receive update while app is open
6. Install on low-storage device

---

## Deployment & Monitoring

### 1. Deployment Checklist

**Pre-Deploy**:
- [ ] Run Lighthouse audit (all scores ≥90)
- [ ] Test on real devices (Android, iOS)
- [ ] Test offline scenarios
- [ ] Verify manifest.json accessible
- [ ] Verify service worker scope
- [ ] Check HTTPS certificate
- [ ] Test cross-browser (Chrome, Safari, Firefox)
- [ ] Verify icons display correctly
- [ ] Test install/uninstall flow

**Deploy**:
```bash
# 1. Build with PWA
cd frontend
npm run build

# 2. Copy to Frappe public folder (automated in build script)
# frontend/public/icons → appointment/public/frontend/icons
# frontend/public/offline.html → appointment/public/frontend/offline.html

# 3. Build Frappe assets
cd /home/minte/projects/frappe-bench
bench build --app appointment

# 4. Restart bench
bench restart

# 5. Clear cache
bench --site appointment.com clear-cache

# 6. Migrate if needed
bench --site appointment.com migrate
```

**Post-Deploy**:
- [ ] Verify manifest loads: https://yourdomain.com/assets/appointment/frontend/manifest.webmanifest
- [ ] Verify service worker registers
- [ ] Test install prompt appears
- [ ] Check analytics for PWA events
- [ ] Monitor error logs

### 2. Analytics Tracking

**Track PWA Events**:
```typescript
// Track install events
window.addEventListener("appinstalled", (e) => {
  console.log("PWA installed", e);
  
  // Send to analytics
  if (window.frappe?.call) {
    window.frappe.call({
      method: "appointment.api.analytics.track_pwa_event",
      args: {
        event: "pwa_installed",
        platform: /iPad|iPhone|iPod/.test(navigator.userAgent) ? "ios" : "android",
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Track usage mode (standalone vs browser)
if (window.matchMedia("(display-mode: standalone)").matches) {
  console.log("Running as PWA");
  trackEvent("pwa_launch", { mode: "standalone" });
} else {
  console.log("Running in browser");
  trackEvent("browser_visit", { mode: "browser" });
}
```

**Backend Analytics Endpoint**:
```python
# appointment/api/analytics.py

@frappe.whitelist()
def track_pwa_event(event, action=None, platform=None):
    """Track PWA-related events"""
    doc = frappe.get_doc({
        "doctype": "PWA Analytics",
        "event": event,
        "action": action,
        "platform": platform,
        "user": frappe.session.user,
        "timestamp": frappe.utils.now()
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
```

### 3. Monitoring & Debugging

**Service Worker Lifecycle**:
```javascript
// Log service worker events
navigator.serviceWorker.addEventListener("controllerchange", () => {
  console.log("Service worker controller changed");
});

navigator.serviceWorker.ready.then((registration) => {
  console.log("Service worker ready", registration);
  
  // Check for updates every hour
  setInterval(() => {
    registration.update();
  }, 60 * 60 * 1000);
});
```

**Error Tracking**:
```typescript
// Catch and log service worker errors
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.error("Service worker registration failed:", error);
    
    // Send to error tracking service
    if (window.frappe?.call) {
      frappe.call({
        method: "appointment.api.errors.log_sw_error",
        args: {
          error: error.message,
          stack: error.stack,
          userAgent: navigator.userAgent
        }
      });
    }
  });
}
```

**Performance Monitoring**:
```typescript
// Use Performance API
const perfData = window.performance.timing;
const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;

console.log(`Page load: ${pageLoadTime}ms, DOM ready: ${domReadyTime}ms`);

// Track to analytics
trackEvent("performance", {
  pageLoad: pageLoadTime,
  domReady: domReadyTime,
  cacheHit: performance.getEntriesByType("resource").filter(r => r.transferSize === 0).length
});
```

### 4. Cache Debugging

**Inspect Cache Storage**:
```javascript
// DevTools Console
caches.keys().then(keys => console.log("Cache keys:", keys));

caches.open("v1-assets-cache").then(cache => {
  cache.keys().then(keys => {
    console.log("Cached assets:", keys.map(k => k.url));
  });
});

// Clear specific cache
caches.delete("v1-assets-cache");

// Clear all caches
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Service Worker Not Registering

**Symptoms**:
- No service worker in DevTools → Application → Service Workers
- Install prompt never appears

**Causes**:
- Not using HTTPS (required except localhost)
- Service worker file not found (404)
- JavaScript error in service worker
- Scope misconfiguration

**Solutions**:
```bash
# Check if HTTPS enabled
curl -I https://yourdomain.com/schedule/

# Check service worker file
curl https://yourdomain.com/assets/appointment/frontend/sw.js

# Check console for errors
# DevTools → Console → Filter by "service worker"

# Force unregister and re-register
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
location.reload();
```

#### 2. Manifest Not Loading

**Symptoms**:
- DevTools shows "No manifest detected"
- Install button doesn't appear

**Causes**:
- Manifest file not found (404)
- Invalid JSON in manifest
- Incorrect MIME type
- Wrong path in <link> tag

**Solutions**:
```bash
# Verify manifest file exists
curl https://yourdomain.com/manifest.webmanifest

# Check MIME type (should be application/manifest+json)
curl -I https://yourdomain.com/manifest.webmanifest

# Validate JSON
cat frontend/public/manifest.json | jq .

# Check HTML link tag
<link rel="manifest" href="/manifest.webmanifest" />
```

#### 3. Icons Not Displaying

**Symptoms**:
- Generic browser icon shown instead of app icon
- Blank icon on home screen

**Causes**:
- Icon files not found (404)
- Wrong paths in manifest
- Incorrect icon sizes
- Corrupted image files

**Solutions**:
```bash
# Verify all icons exist
ls -lh appointment/public/frontend/icons/

# Check icon paths in manifest
cat manifest.json | jq '.icons'

# Verify image format
file appointment/public/frontend/icons/icon-192x192.png

# Test icon loading
curl -I https://yourdomain.com/assets/appointment/frontend/icons/icon-192x192.png
```

#### 4. Offline Mode Not Working

**Symptoms**:
- "No internet" error when offline
- Cached pages not loading

**Causes**:
- Service worker not caching resources
- Incorrect cache strategies
- Resources not in cache
- Service worker scope issues

**Solutions**:
```javascript
// Check cached resources
caches.open("v1-assets-cache").then(cache => {
  cache.keys().then(requests => {
    console.log("Cached URLs:", requests.map(r => r.url));
  });
});

// Verify service worker active
navigator.serviceWorker.controller ? 
  console.log("SW active") : 
  console.log("SW not controlling page");

// Force service worker to claim page
// In sw.js:
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});
```

#### 5. Install Prompt Not Showing (iOS)

**Symptoms**:
- No install option on iPhone/iPad

**Explanation**:
- iOS Safari doesn't support `beforeinstallprompt` event
- Users must manually add to home screen via Share menu

**Solution**:
- Show custom instructions for iOS users
- Use the `InstallPrompt` component with iOS detection (already included)
- Guide users: Share → Add to Home Screen

#### 6. Updates Not Applying

**Symptoms**:
- Old version still showing after deployment
- Changes not visible to users

**Causes**:
- Service worker stuck in "waiting" state
- Browser cache not cleared
- Service worker not updating

**Solutions**:
```javascript
// Force skip waiting (in vite.config.ts workbox config)
workbox: {
  skipWaiting: true,
  clientsClaim: true
}

// Or manually:
// In service worker
self.addEventListener("message", event => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});

// From page
navigator.serviceWorker.controller?.postMessage("skipWaiting");
```

#### 7. High Cache Usage

**Symptoms**:
- Quota exceeded errors
- Low storage warnings

**Solutions**:
```typescript
// Implement cache cleanup
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentVersion = "v1";
  
  // Delete old versions
  await Promise.all(
    cacheNames
      .filter(name => !name.includes(currentVersion))
      .map(name => caches.delete(name))
  );
  
  // Limit cache size
  const cache = await caches.open("v1-assets-cache");
  const keys = await cache.keys();
  
  if (keys.length > 100) {
    // Delete oldest 20 entries
    await Promise.all(
      keys.slice(0, 20).map(key => cache.delete(key))
    );
  }
}
```

---

## Advanced Features (Future)

### 1. Push Notifications

**When to Implement**: After MVP, based on user demand

**Use Cases**:
- Appointment reminder (15 min before)
- Booking confirmation
- Cancellation alerts
- Provider updates

**Implementation**:
```typescript
// Request permission
async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("Browser doesn't support notifications");
    return false;
  }
  
  const permission = await Notification.requestPermission();
  
  if (permission === "granted") {
    // Subscribe to push
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY
    });
    
    // Send subscription to server
    await api.post("/subscribe-push", {
      subscription: subscription.toJSON()
    });
    
    return true;
  }
  
  return false;
}
```

### 2. Background Sync

**Already included in config**, but can be enhanced:

```typescript
// Queue failed requests
if ("serviceWorker" in navigator && "sync" in ServiceWorkerRegistration.prototype) {
  // Register sync event
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register("sync-bookings");
}

// In service worker
self.addEventListener("sync", event => {
  if (event.tag === "sync-bookings") {
    event.waitUntil(syncBookings());
  }
});

async function syncBookings() {
  const pendingBookings = await db.pendingSync.toArray();
  
  for (const booking of pendingBookings) {
    try {
      await fetch("/api/book", {
        method: "POST",
        body: JSON.stringify(booking.data)
      });
      
      await db.pendingSync.delete(booking.id);
    } catch (error) {
      console.log("Sync failed, will retry");
    }
  }
}
```

### 3. Periodic Background Sync

**Use Case**: Check for new appointments every hour

```typescript
// Request permission
const status = await navigator.permissions.query({
  name: "periodic-background-sync"
});

if (status.state === "granted") {
  const registration = await navigator.serviceWorker.ready;
  await registration.periodicSync.register("sync-appointments", {
    minInterval: 60 * 60 * 1000 // 1 hour
  });
}

// In service worker
self.addEventListener("periodicsync", event => {
  if (event.tag === "sync-appointments") {
    event.waitUntil(fetchLatestAppointments());
  }
});
```

### 4. Share Target API

**Allow sharing TO your app**:

```json
// In manifest
{
  "share_target": {
    "action": "/schedule/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

---

## Resources & References

### Official Documentation
- **PWA**: https://web.dev/progressive-web-apps/
- **Workbox**: https://developers.google.com/web/tools/workbox
- **Vite PWA Plugin**: https://vite-pwa-org.netlify.app/
- **Web App Manifest**: https://developer.mozilla.org/en-US/docs/Web/Manifest

### Testing Tools
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **PWA Builder**: https://www.pwabuilder.com/
- **Favicon Generator**: https://realfavicongenerator.net/

### Icon Tools
- **PWA Asset Generator**: https://github.com/onderceylan/pwa-asset-generator
- **App Icon Generator**: https://www.appicon.co/
- **Maskable Icon**: https://maskable.app/

### Learning Resources
- **PWA Checklist**: https://web.dev/pwa-checklist/
- **Service Worker Cookbook**: https://serviceworke.rs/
- **Workbox Recipes**: https://developers.google.com/web/tools/workbox/guides/get-started

### Ethiopian Context
- **Ethiopia Internet Stats**: https://www.internetworldstats.com/africa.htm
- **Mobile Network Performance**: https://www.speedtest.net/global-index/ethiopia

---

## Implementation Timeline

### Week 1: Foundation
- **Day 1-2**: Setup (dependencies, config, manifest)
- **Day 3**: Icons and branding
- **Day 4**: Service worker configuration
- **Day 5**: Testing and debugging

### Week 2: Enhancement
- **Day 1-2**: Install prompt component
- **Day 3**: Update notification system
- **Day 4**: Offline experience optimization
- **Day 5**: Cross-browser testing

### Week 3: Polish
- **Day 1-2**: Performance optimization
- **Day 3**: Analytics integration
- **Day 4**: Documentation
- **Day 5**: Final testing and deployment

---

## Success Metrics (30 Days Post-Launch)

Track these metrics to measure PWA success:

1. **Installation Rate**: Target ≥15% of repeat visitors
2. **Engagement**: PWA users vs browser users (sessions, duration)
3. **Performance**: Load time improvements (target: 60% faster)
4. **Offline Usage**: % of sessions with offline interactions
5. **Retention**: 7-day, 30-day retention rates
6. **Data Savings**: Bandwidth reduction (target: 70%)
7. **Error Rate**: Service worker errors <1%

---

## Conclusion

This guide provides everything needed to transform your React booking frontend into a professional PWA. The implementation is straightforward but powerful, providing significant benefits for Ethiopian users:

- ✅ **Better performance** through caching
- ✅ **Lower data costs** through offline-first design
- ✅ **Easier installation** without app stores
- ✅ **Native app feel** on mobile and desktop
- ✅ **Always up-to-date** with auto-updates

Follow this guide step-by-step, test thoroughly, and you'll have a production-ready PWA that works beautifully even on slow connections.

---

**Document Prepared By**: AI Assistant  
**For Project**: Ethiopian Scheduling Platform  
**Last Updated**: 2025-11-16  
**Status**: Ready for Implementation

---

**Next Steps**:
1. Review this document thoroughly
2. Set aside 4-6 hours for implementation
3. Follow steps sequentially
4. Test on real devices
5. Deploy with confidence

Good luck! 🚀



