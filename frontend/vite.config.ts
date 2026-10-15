import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * The code every website page shares (data, page shells, content helpers, the template kit), as one chunk instead
 * of about twenty small ones. Template packages (loaded per site by the registry) stay out.
 */
function publicCoreModule(id: string): boolean {
  const file = id.split("/frontend/src/")[1];
  if (!file || file.endsWith(".css")) return false;
  if (/^pages\/public-experience\/(site|booking)\.tsx$/.test(file)) return true;
  if (/^lib\/(phone|time|online-session|platform-brand|platform-brand-core)\.tsx?$/.test(file)) return true;
  if (!file.startsWith("public-experience/")) return false;
  if (/^public-experience\/templates\/(booking-skin|moments|types)\./.test(file)) return false;
  return !/^public-experience\/templates\/[^/]+\//.test(file) || file.startsWith("public-experience/templates/kit/");
}

/** The English translation groups that website pages use (src/lib/i18n/english-site.ts). */
export const WEBSITE_TRANSLATION_GROUPS = ["publicSite", "bookingStates"];

export default defineConfig(({ mode }) => {
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
      "^/(app|apps|desk|api|assets|files|private|logout|tools|am/tools|directory|am/directory|partners|am/partners)(/|$)|^/(sitemap\\.xml|robots\\.txt)$": {
        target,
        // Preserve the browser Host so public-experience resolution exercises
        // the same trusted-host contract as the production reverse proxy.
        changeOrigin: false,
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
  // A business website page loads a lean entry (site-main.tsx) from its own page, `site.html`, which is
  // index.html with the other entry script. appointment/www/index.py chooses it for website addresses.
  const siteHtml = path.resolve(__dirname, "site.html");
  return {
    plugins: [
      react(),
      {
        // `virtual:english-site`: only the website groups of en.json, so website pages skip the staff strings.
        name: "english-site",
        resolveId(id) {
          return id === "virtual:english-site" ? "\0virtual:english-site" : null;
        },
        async load(id) {
          if (id !== "\0virtual:english-site") return null;
          const { readFile } = await import("node:fs/promises");
          const file = path.resolve(__dirname, "src/lib/i18n/translations/en.json");
          this.addWatchFile(file);
          const catalog = JSON.parse(await readFile(file, "utf8"));
          const groups = Object.fromEntries(WEBSITE_TRANSLATION_GROUPS.map((group) => [group, catalog[group] || {}]));
          return `export default JSON.parse(${JSON.stringify(JSON.stringify(groups))});`;
        },
      },
      {
        name: "public-site-entry",
        apply: "build",
        enforce: "pre",
        resolveId(id) {
          return id === siteHtml ? siteHtml : null;
        },
        async load(id) {
          if (id !== siteHtml) return null;
          const { readFile } = await import("node:fs/promises");
          const html = await readFile(path.resolve(__dirname, "index.html"), "utf8");
          if (!html.includes('src="/src/main.tsx"')) throw new Error("index.html must load /src/main.tsx");
          return html.replace('src="/src/main.tsx"', 'src="/src/site-main.tsx"');
        },
      },
      {
        name: "frappe-development-entry",
        apply: "serve",
        transformIndexHtml(html) {
          // Frappe renders this block in production; Vite must not serve Jinja
          // expressions as JavaScript. Auth in development uses the API session.
          return html
            .replace(
              /<script data-frappe-boot[^>]*>[\s\S]*?<\/script>/,
              '<script>window.frappe = window.frappe || {};</script>',
            )
            // Business link-preview tags are rendered by Frappe (appointment/growth/sharing.py).
            .replace(/\{\{\s*public_meta_tags[^}]*\}\}/, "");
        },
      },
      VitePWA({
        registerType: "autoUpdate",
        scope: "/",
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
          // Frappe renders session-specific HTML; no cached app-shell fallback.
          navigateFallback: null,
          importScripts: ["privacy-cache-cleanup.js"],
          
          // Caching strategies
          runtimeCaching: [
            // Session boot and consent links must never survive in a browser cache.
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkOnly",
            },
            {
              urlPattern: /\/api\//i,
              handler: "NetworkOnly",
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
            
          ],
          
          // Files to precache (available offline immediately)
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,woff,woff2}"
          ],
          globIgnores: ["index.html", "site.html", "schedule/index.html"],
          
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
        input: { main: path.resolve(__dirname, "index.html"), site: siteHtml },
        output: {
          // By package folder, so shared helpers (such as react/jsx-runtime) stay with their package and a
          // website page never loads the motion library through them.
          manualChunks(id: string) {
            // Its own chunk, evaluated before the application chunk: see src/early-requests.ts.
            if (/\/frontend\/src\/(early-requests|lib\/scheduler-prefetch)\.ts$/.test(id)) return "early-requests";
            // Vite's dynamic-import helper goes where every entry has it, never into the scheduler-only chunk.
            if (publicCoreModule(id) || id.includes("vite/preload-helper")) return "public-core";
            const vendor = /node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(id)?.[1];
            if (!vendor) return undefined;
            if (["react", "react-dom", "scheduler", "react-router", "react-router-dom", "@remix-run/router", "cookie", "set-cookie-parser"].includes(vendor)) return "react-vendor";
            if (["framer-motion", "motion-dom", "motion-utils"].includes(vendor)) return "motion-vendor";
            if (vendor === "lucide-react") return "icon-vendor";
            // Its own chunk, so a scheduler can start its data request (lib/scheduler-prefetch.ts) before the
            // application code evaluates.
            if (["frappe-react-sdk", "frappe-js-sdk", "axios", "socket.io-client", "engine.io-client", "socket.io-parser",
              "engine.io-parser", "@socket.io/component-emitter", "xmlhttprequest-ssl", "debug", "ms"].includes(vendor)) return "frappe-vendor";
            if (["react-hook-form", "@hookform/resolvers", "zod"].includes(vendor)) return "form-vendor";
            return undefined;
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
