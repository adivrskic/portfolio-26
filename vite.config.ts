import { realpathSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, join } from 'node:path'
import { defineConfig, loadEnv, searchForWorkspaceRoot, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import chat from './netlify/functions/chat.js'
import contact from './netlify/functions/contact.js'
import { PROJECTS } from './src/data/projects'
import { SITE } from './src/data/site'

const root = process.cwd()

export default defineConfig({
  plugins: [react(), functions(), seoHead(), seoFiles()],
  server: {
    port: 5173,
    host: true,
    // the project can live behind a virtualised/symlinked path (e.g. Windows app data);
    // allow both spellings so assets referenced from CSS (fonts) are served in dev
    fs: { allow: [searchForWorkspaceRoot(root), realpathSync(root), realpathSync.native(root)] },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'postprocessing'],
        },
      },
    },
  },
})

type Handler = (req: Request, context: { ip?: string }) => Promise<Response>

/** the functions' settings (see .env.example) */
const FUNCTION_ENV = ['ANTHROPIC_API_KEY', 'CHAT_MODEL', 'RESEND_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL']

/**
 * The site's functions (netlify/functions: the cube's chat and the contact form) on `npm run dev` and
 * `npm run preview`, at the same /api paths as on Netlify. They take a web Request and return a Response
 * (streamed, for the chat), so this only translates to and from Node's. Their keys come from .env.local
 * (or the shell, which wins); Vite restarts when an .env file changes, which reloads them.
 */
function functions(): Plugin {
  const routes: Record<string, Handler> = { '/api/chat': chat, '/api/contact': contact }
  const mount = (middlewares: Connect.Server) =>
    middlewares.use(async (req, res, next) => {
      const handler = routes[(req.url ?? '').split('?')[0]]
      if (!handler) return next()
      try {
        await send(await handler(await toRequest(req), { ip: req.socket.remoteAddress }), res)
      } catch (err) {
        next(err)
      }
    })
  return {
    name: 'site-functions',
    config(_, { mode }) {
      // what the shell set, once (process.env outlives restarts); the files are re-read every time
      const g = globalThis as { __shellEnv?: Record<string, string | undefined> }
      const shell = (g.__shellEnv ??= Object.fromEntries(FUNCTION_ENV.map((k) => [k, process.env[k]])))
      for (const key of FUNCTION_ENV) if (shell[key] === undefined) delete process.env[key]
      const files = loadEnv(mode, root, '')
      for (const key of FUNCTION_ENV) {
        const value = shell[key] ?? files[key]
        if (value) process.env[key] = value
      }
    },
    configureServer: (server) => void mount(server.middlewares),
    configurePreviewServer: (server) => void mount(server.middlewares),
  }
}

async function toRequest(req: IncomingMessage) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined || key.startsWith(':') || ['host', 'connection', 'content-length', 'transfer-encoding'].includes(key)) continue
    for (const v of Array.isArray(value) ? value : [value]) headers.append(key, v)
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
    method: req.method,
    headers,
    body: chunks.length && req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(chunks) : undefined,
  })
}

async function send(response: Response, res: ServerResponse) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  if (!response.body) return void res.end()
  res.flushHeaders()
  const reader = response.body.getReader()
  // the visitor closed the panel or the page mid-reply: stop reading upstream
  res.on('close', () => {
    if (!res.writableFinished) reader.cancel().catch(() => {})
  })
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  } catch {
    // the stream was cut short; end what we have
  }
  res.end()
}

// ---------- search engines and link previews ----------

/** where the site lives: Netlify sets URL for its builds (canonical links and sharing images use it) */
const SITE_URL = (process.env.URL || 'https://www.adivrskic.dev').replace(/\/+$/, '')

type Page = { path: string; title: string; description: string; image: string; imageAlt: string; index?: boolean }

const plain = (s: string) => s.replace(/\*\*/g, '')
const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** every page the site has, with what a search result or a shared link shows for it */
function pages(): Page[] {
  const card = { image: '/og/home.jpg', imageAlt: `${SITE.name}: a 3D cube that spells his name, beside a gallery of his work` }
  return [
    { path: '/', title: `${SITE.name} — ${SITE.role}`, description: SITE.description, ...card },
    { path: '/about', title: `About — ${SITE.name}`, description: plain(SITE.about.paragraphs[0]), ...card },
    {
      path: '/contact',
      title: `Contact — ${SITE.name}`,
      description: `Have a project in mind, or just want to say hi? Send ${SITE.name} a note and he'll get back to you.`,
      ...card,
    },
    {
      path: '/chat',
      title: `Chat — ${SITE.name}`,
      description: `Ask Qb, ${SITE.name}'s personal assistant, about his work, his projects or how this site was built.`,
      ...card,
      index: false,
    },
    ...PROJECTS.map((p) => ({
      path: `/work/${p.slug}`,
      title: `${p.title} — ${SITE.name}`,
      description: `${p.summary} ${p.kind}, ${p.year}, built with ${p.stack.slice(0, 4).join(', ')}.`,
      image: `/og/${p.slug}.jpg`,
      imageAlt: `${p.title}: ${p.summary}`,
    })),
  ]
}

const notFound: Page = {
  path: '/404',
  title: `Not found — ${SITE.name}`,
  description: 'That page drifted off the grid.',
  image: '/og/home.jpg',
  imageAlt: SITE.name,
  index: false,
}

/** a page's head: title, description, canonical link, Open Graph and Twitter cards, who it is about */
function headFor(p: Page) {
  const url = `${SITE_URL}${p.path === '/' ? '/' : p.path}`
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.name,
    url: `${SITE_URL}/`,
    jobTitle: SITE.title,
    sameAs: SITE.socials.filter((s) => s.icon !== 'mail').map((s) => s.href),
    knowsAbout: SITE.about.toolkit.flatMap((g) => g.items),
  }
  return [
    `<title>${attr(p.title)}</title>`,
    `<meta name="description" content="${attr(p.description)}" />`,
    p.index === false ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${p.path.startsWith('/work/') ? 'article' : 'website'}" />`,
    `<meta property="og:site_name" content="${attr(SITE.name)}" />`,
    `<meta property="og:title" content="${attr(p.title)}" />`,
    `<meta property="og:description" content="${attr(p.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE_URL}${p.image}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${attr(p.imageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<script type="application/ld+json">${JSON.stringify(person).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ')
}

const META = /<!-- meta -->[\s\S]*?<!-- \/meta -->/

/** without JavaScript (some crawlers): who this is, and a link to every page */
function noscript() {
  const links = pages()
    .filter((p) => p.index !== false)
    .map((p) => `<a href="${p.path}">${attr(p.title.split(' — ')[0])}</a>`)
    .join(' · ')
  return `<noscript><p>${attr(SITE.name)}, ${attr(SITE.title)}. ${attr(SITE.description)} This site needs JavaScript for its 3D scene; its pages: ${links}.</p></noscript>`
}

/** the head (the home page's) and the no-JavaScript text, in dev and in the build */
function seoHead(): Plugin {
  return {
    name: 'site-seo-head',
    transformIndexHtml: (html) =>
      html.replace(META, `<!-- meta -->\n    ${headFor(pages()[0])}\n    <!-- /meta -->`).replace('<!-- noscript -->', noscript()),
  }
}

/**
 * The build's own files for search engines and link previews: a page per route (the app with that page's
 * head, so a shared link or a crawler gets the right title and card before any JavaScript runs) and
 * Netlify's _redirects that serves each clean URL from its page, a 404 page for anything else, sitemap.xml
 * and robots.txt, and a sharing card per project from its cover. (The pages sit in /_pages rather than in
 * a folder per route, so no folder named like a route can make Netlify add a trailing slash.)
 */
function seoFiles(): Plugin {
  return {
    name: 'site-seo-files',
    apply: 'build',
    async closeBundle() {
      const dist = join(root, 'dist')
      const template = await readFile(join(dist, 'index.html'), 'utf8')
      const write = async (file: string, text: string | Buffer) => {
        await mkdir(dirname(file), { recursive: true })
        await writeFile(file, text)
      }
      const withHead = (p: Page) => template.replace(META, `<!-- meta -->\n    ${headFor(p)}\n    <!-- /meta -->`)
      const file = (p: Page) => (p.path === '/' ? '/index.html' : `/_pages${p.path}.html`)
      for (const p of pages()) await write(join(dist, file(p)), withHead(p))
      await write(join(dist, '404.html'), withHead(notFound))
      // (the functions answer /api/* before any of these, and the site's own files are served as they are)
      const rules = pages()
        .filter((p) => p.path !== '/')
        .map((p) => `${p.path}  ${file(p)}  200`)
      await write(join(dist, '_redirects'), [...rules, '/*  /404.html  404', ''].join('\n'))

      const day = new Date().toISOString().slice(0, 10)
      const urls = pages()
        .filter((p) => p.index !== false)
        .map((p) => `  <url><loc>${SITE_URL}${p.path === '/' ? '/' : p.path}</loc><lastmod>${day}</lastmod></url>`)
      await write(
        join(dist, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      )
      await write(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /_pages/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

      // a 1200×630 card per project from its cover (sharp is only needed here, at build time)
      const { default: sharp } = await import('sharp')
      await mkdir(join(dist, 'og'), { recursive: true })
      for (const p of PROJECTS) {
        if (!p.cover) continue
        await sharp(join(dist, p.cover))
          .resize(1200, 630, { fit: 'cover', position: 'top' })
          .jpeg({ quality: 82, mozjpeg: true })
          .toFile(join(dist, 'og', `${p.slug}.jpg`))
      }
    },
  }
}
