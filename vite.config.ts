import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rawPreviewHostEnv = process.env.VITE_PREVIEW_ALLOWED_HOSTS || ''
const allowedHostsEnv = rawPreviewHostEnv
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean)

// If '*' or 'all' is specified, allow all hosts (required for reverse proxy)
const useAllHosts = allowedHostsEnv.includes('*') || allowedHostsEnv.includes('all')
const previewAllowedHosts: true | string[] = useAllHosts
  ? true
  : [...allowedHostsEnv, 'localhost', '127.0.0.1']

// Debug log: shows what Vite will allow at startup for preview requests.
console.log('[vite] preview.allowedHosts =', previewAllowedHosts)
console.log('[vite] raw VITE_PREVIEW_ALLOWED_HOSTS =', rawPreviewHostEnv || '<not set>')

/**
 * UTF-8 Charset Middleware
 * Ensures all HTML, JSON, and text responses include charset=utf-8
 * This is critical for proper display of German Umlauts (äöü, ÄÖÜ, ß)
 */
function utf8CharsetMiddleware() {
  return {
    name: 'utf8-charset-middleware',
    configResolved() {},
    apply: 'serve',
    async transform(code: string, id: string) {
      return null
    },
    configureServer(server: any) {
      return () => {
        server.middlewares.use((_req: any, res: any, next: any) => {
          // Set UTF-8 charset for HTML and JSON responses
          const originalSetHeader = res.setHeader
          res.setHeader = function(name: string, value: string) {
            if (name.toLowerCase() === 'content-type') {
              // Ensure charset=utf-8 is set for text-based responses
              if (
                value.includes('text/html') || 
                value.includes('application/json') || 
                value.includes('text/javascript') ||
                value.includes('application/javascript')
              ) {
                if (!value.includes('charset')) {
                  value = `${value}; charset=utf-8`
                }
              }
            }
            return originalSetHeader.call(this, name, value)
          }
          next()
        })
      }
    },
  }
}

/**
 * HTML UTF-8 Meta Tag Enforcer
 * Ensures index.html always has proper UTF-8 meta tags
 */
function htmlUtf8Plugin() {
  return {
    name: 'html-utf8-plugin',
    transformIndexHtml(html: string) {
      // Ensure charset is in the HTML head as close to the top as possible
      if (!html.includes('<meta charset="utf-8"') && !html.includes("<meta charset='utf-8'")) {
        // Insert after <head> opening tag
        const headRegex = /<head[^>]*>/i
        if (headRegex.test(html)) {
          html = html.replace(headRegex, (match) => {
            return `${match}\n    <meta charset="utf-8" />`
          })
        }
      }
      return html
    },
  }
}

export default defineConfig({
  plugins: [react(), utf8CharsetMiddleware(), htmlUtf8Plugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    middlewareMode: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: previewAllowedHosts,
  },
  define: {
    'import.meta.env.VITE_BUILD_SHA': JSON.stringify(process.env.VITE_BUILD_SHA || 'unknown'),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(process.env.VITE_BUILD_VERSION || 'unknown'),
  },
})
