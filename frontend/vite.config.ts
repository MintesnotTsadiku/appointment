import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isolated = process.env.FRAPPE_WORKTREE_SITE;
  let proxyConfig = {};
  if (env.VITE_SITE_NAME && env.VITE_SITE_PORT) {
    proxyConfig = {
      "^/(app|apps|desk|api|assets|files|private|logout)(/|$)": {
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
  if (isolated) {
    const target = `http://127.0.0.1:${process.env.FRAPPE_WORKTREE_WEB_PORT}`;
    proxyConfig = {
      "^/(app|apps|desk|api|assets|files|private|logout)(/|$)": {
        target,
        changeOrigin: true,
        headers: { "X-Frappe-Site-Name": isolated },
      },
      "/socket.io": {
        // Use `localhost` rather than `127.0.0.1` so the Host header matches
        // the browser Origin host and Frappe's realtime origin check passes.
        target: `http://localhost:${process.env.FRAPPE_WORKTREE_SOCKETIO_PORT}`,
        ws: true,
        changeOrigin: false,
        headers: { "X-Frappe-Site-Name": isolated },
      },
    };
  }
  return {
    plugins: [
      react(),
      {
        name: "frappe-development-entry",
        apply: "serve",
        transformIndexHtml(html) {
          // Frappe renders this block in production; Vite must not serve Jinja
          // expressions as JavaScript. Auth in development uses the API session.
          return html.replace(
            /<script data-frappe-boot>[\s\S]*?<\/script>/,
            '<script>window.frappe = window.frappe || {};</script>',
          );
        },
      },
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
          scope: "/",
          start_url: "/home",
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
              url: "/calendar",
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
              url: "/home",
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
          // CRITICAL FIX #4: Navigation fallback with denylist for Frappe routing
          // Updated to work on all routes, not just /schedule/
          // In production, HTML is at /schedule/index.html, in dev it's at root
          navigateFallback: "/schedule/index.html",
          navigateFallbackDenylist: [/^\/app/, /^\/api/, /^\/assets/, /^\/login/, /^\/files/, /^\/private/],
          
          // Caching strategies
          runtimeCaching: [
            // CRITICAL FIX #1: HTML Entry point - MUST be NetworkFirst to get fresh CSRF tokens
            // Updated to work on all routes (home, calendar, settings, etc.)
            {
              urlPattern: ({ request, url }) => {
                // Match all navigation requests except excluded paths
                const excluded = /^\/(app|api|assets|login|files|private)/;
                return request.mode === "navigate" && !excluded.test(url.pathname);
              },
              handler: "NetworkFirst",
              options: {
                cacheName: "html-cache",
                networkTimeoutSeconds: 3, // Wait 3s for network, then fall back to cache
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 // 1 day (but NetworkFirst ensures fresh tokens)
                }
              }
            },
            
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
            
            // App assets (JS, CSS) - Cache first for performance
            {
              urlPattern: /\/assets\/appointment\/frontend\/.*\.(js|css|woff|woff2|ttf|eot)$/i,
              handler: "CacheFirst",
              options: {
                cacheName: "app-assets-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                }
              }
            },
            
            // Images - Cache first
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
            
            // CRITICAL FIX #2: Volatile Data (Time Slots/Availability) - Network Only or very short cache
            {
              urlPattern: /\/api\/method\/appointment\.(scheduler|booking|availability)\..*(slot|availability|time)/i,
              handler: "NetworkOnly",
              options: {
                // No caching for availability slots to prevent double-booking
                // Always fetch fresh data from network
              }
            },
            
            // Static Data (Services, Locations, Providers) - Can cache longer
            {
              urlPattern: /\/api\/method\/appointment\.(scheduler|booking)\..*(service|location|provider|group)/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "static-data-cache",
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 // 1 hour (static data changes less frequently)
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            
            // General API calls - Network first with cache fallback (short duration)
            {
              urlPattern: /\/api\/method\/appointment\..*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5 // 5 minutes (reduced from 1 hour)
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            
            // Schedule pages - Stale while revalidate (for better UX)
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
          enabled: !isolated, // Keep isolated development sessions free of cached API responses
          type: "module"
        }
      })
    ],
    server: {
      host: '0.0.0.0', // Allow access from network (for iPhone testing)
      port: Number(process.env.FRAPPE_WORKTREE_FRONTEND_PORT || 5173),
      strictPort: true,
      proxy: proxyConfig,
    },
    cacheDir: process.env.VITE_CACHE_DIR || "node_modules/.vite",
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
        // eslint-disable-next-line no-undef
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
