/**
 * Inject route-specific SEO metadata into separate HTML files.
 *
 * After `vite build` produces dist/, this script:
 *   1. Reads dist/index.html (the SPA shell)
 *   2. For each SEO-critical route, creates a copy with the correct
 *      <title>, <meta description>, <meta keywords>, <link canonical>,
 *      Open Graph, and Twitter Card tags
 *   3. Writes each to dist/<route>/index.html
 *
 * This way Google and social crawlers see the correct metadata on the
 * initial HTTP response — no JavaScript execution required.
 *
 * No external dependencies needed (pure Node.js).
 *
 * Usage:  node scripts/prerender.js   (called automatically by build script)
 */

const fs = require('fs')
const path = require('path')

const DIST = path.resolve(__dirname, '..', 'dist')

// SEO metadata per route — matches what react-helmet-async sets client-side
const ROUTES = [
  {
    path: '/',
    title: 'PlatzPilot – Kostenlose Sitzplan- & Eventplanung',
    description:
      'Kostenlose Sitzpläne per Drag & Drop für Vereine, Hochzeiten und Events. Gästelisten importieren, ToGo-Bestellungen verwalten und als PDF exportieren.',
    keywords: 'Sitzplan, Tischplan, Event-Management, Hochzeitsplanung, Vereinsveranstaltung, Gästeliste, Gästelistenmanagement, Gästeliste online, kostenlos, Drag and Drop, PDF Export, CSV Import',
    canonical: 'https://platzpilot.de/',
  },
  {
    path: '/sitzplan-hochzeit',
    title: 'Sitzplan & Gästeliste für Hochzeiten erstellen - PlatzPilot',
    description:
      'Hochzeits-Sitzplan & Gästeliste online erstellen. RSVP-Tracking, Einladungen per WhatsApp/E-Mail, CSV-Import und PDF-Export – kostenlos.',
    keywords:
      'Gästeliste Hochzeit, Gästelistenmanagement, Gästeliste online verwalten, Hochzeit Gästeliste Tool, Sitzplan Hochzeit, Tischplan Hochzeit, Sitzordnung erstellen, RSVP Hochzeit, Einladungsmanagement, Gästeplanung Hochzeit, Gästeliste erstellen kostenlos',
    canonical: 'https://platzpilot.de/sitzplan-hochzeit',
  },
  {
    path: '/sitzplan-verein',
    title: 'Vereinsverwaltung & Sitzpläne für Vereine - PlatzPilot',
    description:
      'Sitzpläne, Mitgliederverwaltung & ToGo-Bestellungen für Vereine. PlatzPilot bietet Rollensystem, CSV-Import und PDF-Export – kostenlos.',
    keywords:
      'Sitzplan Verein, Tischplan Verein, ToGo Bestellungen, Vereinsveranstaltung planen, Vereinsverwaltung, Mitgliederverwaltung',
    canonical: 'https://platzpilot.de/sitzplan-verein',
  },
  {
    path: '/gaesteliste',
    title: 'G\u00e4steliste online erstellen & verwalten \u2013 kostenlos | PlatzPilot',
    description:
      'G\u00e4steliste online erstellen, Einladungen versenden und RSVP tracken. CSV-Import aus Excel, Kategorien, Statistiken und Sitzplan \u2013 kostenloses G\u00e4stelisten-Tool.',
    keywords:
      'G\u00e4steliste erstellen, G\u00e4stelistenmanagement, G\u00e4steliste Tool, G\u00e4steliste online, G\u00e4steliste verwalten, G\u00e4steverwaltung Excel, RSVP Tracking, Einladungen versenden, G\u00e4steliste kostenlos, G\u00e4steliste App',
    canonical: 'https://platzpilot.de/gaesteliste',
  },
]

function injectMeta(html, route) {
  let result = html

  // Replace <title>
  result = result.replace(
    /<title>[^<]*<\/title>/,
    `<title>${route.title}</title>`
  )

  // Replace <meta name="description">
  result = result.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${route.description}" />`
  )

  // Replace <meta name="keywords">
  result = result.replace(
    /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/,
    `<meta name="keywords" content="${route.keywords}" />`
  )

  // Insert <link rel="canonical"> after the canonical comment
  result = result.replace(
    /<!-- canonical is set per-page by react-helmet-async;[^>]*-->/,
    `<!-- canonical is set per-page by react-helmet-async; this was injected at build time -->\n    <link rel="canonical" href="${route.canonical}" />`
  )

  // Replace OG tags
  result = result.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${route.title}" />`
  )
  result = result.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${route.description}" />`
  )
  result = result.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${route.canonical}" />`
  )

  // Replace Twitter Card tags
  result = result.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${route.title}" />`
  )
  result = result.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${route.description}" />`
  )

  return result
}

function main() {
  const indexPath = path.join(DIST, 'index.html')
  if (!fs.existsSync(indexPath)) {
    console.error('[seo-inject] dist/index.html not found. Run "vite build" first.')
    process.exit(1)
  }

  const baseHtml = fs.readFileSync(indexPath, 'utf-8')

  for (const route of ROUTES) {
    const html = injectMeta(baseHtml, route)

    // Determine output directory
    const outDir =
      route.path === '/' ? DIST : path.join(DIST, route.path.replace(/^\//, ''))
    fs.mkdirSync(outDir, { recursive: true })

    const outFile = path.join(outDir, 'index.html')
    fs.writeFileSync(outFile, html, 'utf-8')
    console.log(
      `[seo-inject] ✓ ${route.path} → ${path.relative(DIST, outFile)} (${route.title})`
    )
  }

  console.log(`[seo-inject] Done — ${ROUTES.length} pages prepared.`)
}

main()
