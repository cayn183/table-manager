#!/usr/bin/env node
/**
 * Validates that all SEO-critical routes have been prerendered
 * Called after npm run build to ensure dist/ has proper structure
 */

const fs = require('fs')
const path = require('path')

const DIST = path.resolve(__dirname, '..', 'dist')

const REQUIRED_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/sitzplan-hochzeit', name: 'Wedding Landing' },
  { path: '/sitzplan-verein', name: 'Club Landing' },
  { path: '/gaesteliste', name: 'Guest List Landing' },
]

function validateBuild() {
  console.log('\n🔍 Validating SEO build...')

  let allGood = true
  const results = []

  for (const route of REQUIRED_ROUTES) {
    const htmlPath =
      route.path === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route.path.replace(/^\//, ''), 'index.html')

    if (fs.existsSync(htmlPath)) {
      // Check if HTML has canonical tag
      const html = fs.readFileSync(htmlPath, 'utf-8')
      const hasCanonical = html.includes('rel="canonical"')

      if (hasCanonical) {
        results.push(`✅ ${route.name.padEnd(25)} → ${path.relative(DIST, htmlPath)}`)
      } else {
        results.push(`⚠️  ${route.name.padEnd(25)} → Missing canonical tag`)
        allGood = false
      }
    } else {
      results.push(`❌ ${route.name.padEnd(25)} → MISSING! Expected at ${path.relative(DIST, htmlPath)}`)
      allGood = false
    }
  }

  console.log(results.join('\n'))

  if (!allGood) {
    console.error('\n❌ Build validation FAILED. Running prerender manually...')
    const seo = require('child_process').spawnSync('node', [path.join(__dirname, 'prerender.js')], {
      stdio: 'inherit',
    })
    if (seo.status !== 0) {
      console.error('❌ Prerender failed. Please check build output above.')
      process.exit(1)
    }
    console.log('✅ Prerender completed. Build should now be ready.')
  } else {
    console.log('\n✅ All SEO routes validated successfully!')
  }
}

validateBuild()
