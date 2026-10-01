import media from './media.generated.json'
import type { Media, Project } from './types'

type GeneratedFrame = Media & { w: number; h: number }
const generated = media as Record<
  string,
  { accent: string; cover: number; frames: GeneratedFrame[]; scroll?: { src: string; w: number; h: number } }
>

type Content = Omit<Project, 'accent' | 'cover' | 'blur' | 'tone' | 'media' | 'scroll'> & { accent?: string }

/** joins written content with the processed images (see scripts/process-images.mjs) */
function project(c: Content): Project {
  const g = generated[c.slug]
  const frames = g?.frames ?? []
  const cover = frames[g?.cover ?? 0]
  return {
    ...c,
    accent: c.accent ?? g?.accent ?? '#ff4d23',
    cover: cover?.src ?? '',
    blur: cover?.blur ?? '',
    tone: cover?.tone ?? 'dark',
    media: frames.map(({ src, blur, alt, device, focus, w, h, tone }) => ({ src, blur, alt, device, focus, w, h, tone })),
    scroll: g?.scroll,
  }
}

export const PROJECTS: Project[] = [
  project({
    slug: 'plumeform',
    accent: '#1fbf8f',
    title: 'Plumeform',
    kind: 'Survey platform',
    year: '2026',
    summary: 'Research-grade surveys: a visual builder, themeable renderer and response-quality analytics in one app.',
    stack: ['Next.js 16', 'React 19', 'Tailwind 4', 'Supabase', 'Stripe', 'Resend', 'Anthropic API', 'Vitest', 'Playwright'],
    links: { live: 'https://plumeform.com' },
    sections: [
      {
        label: 'Overview',
        body: 'Plumeform is a survey platform built for research-grade data. One Next.js app holds the visual builder, a themeable public renderer, a results dashboard with response-quality analysis, and the marketing site.',
      },
      {
        label: 'Architecture',
        body: 'Every survey is a single versioned JSON document. Published versions are immutable and each response records the version it answered. Anonymous respondents reach Postgres only through SECURITY DEFINER functions, while row-level security denies everything else.',
      },
      {
        label: 'Scope',
        body: 'Classic and conversational renderers, 20 question types, logic, quotas, A/B arms, attention checks and panel-ID dedupe. Exports to CSV, XLSX, codebook and R, imports Qualtrics .qsf, drafts surveys with AI, and exposes webhooks and a public Results API.',
      },
      {
        label: 'Research pack',
        body: 'The Pro tier adds tooling for panel studies on Prolific, CloudResearch Connect and MTurk — informed consent, debriefs and participant-ID handling built into the flow.',
      },
    ],
  }),
  project({
    slug: 'nautilus',
    accent: '#3d7bff',
    title: 'Nautilus',
    kind: 'Inventory platform',
    year: '2026',
    summary: 'Warehouse inventory SaaS: a web dashboard, an Expo app for the floor, and an AI-assisted marketing site.',
    stack: ['Next.js 15', 'TypeScript', 'Supabase', 'React Three Fiber', 'Stripe', 'Expo 54', 'GSAP', 'Claude API'],
    links: { live: 'https://nautilusinventory.com', repo: 'https://github.com/adivrskic/ims-app' },
    sections: [
      {
        label: 'Overview',
        body: 'Nautilus is a warehouse-inventory product built as three apps: a Next.js dashboard, an Expo mobile app for the warehouse floor, and a marketing site with an AI sales assistant.',
      },
      {
        label: 'Dashboard',
        body: 'Reorder purchase orders are drafted from 60-day scan velocity — reorder point and EOQ, with a line of reasoning per item. A 2D facility builder pairs with a 3D viewer, Zebra labels print over WebUSB, and Slack, Shopify, HMAC webhooks, TOTP MFA and a kiosk mode round it out. 293 Vitest tests.',
      },
      {
        label: 'Mobile',
        body: 'Barcode scan-and-register, pick and receive runs, returns and a floor-plan map — with an offline queue that resolves conflicts, role permissions and biometric login.',
      },
      {
        label: 'Marketing site',
        body: 'The Nautilus Helper streams Claude responses through a tool loop for lead capture, email drafts and call booking, with prompt caching and four layers of rate limiting, next to an ROI calculator and industry pages.',
      },
    ],
  }),
  project({
    slug: 'nimbus',
    accent: '#ff5a36',
    title: 'Nimbus',
    kind: 'AI website generator',
    year: '2025',
    summary: 'Describe a site in plain English, watch it stream into a live preview, refine it, export it.',
    stack: ['React 19', 'Vite 7', 'SCSS', 'Framer Motion', 'React Three Fiber', 'Supabase', 'Claude API', 'Stripe'],
    links: { live: 'https://nimbuswebsites.com', repo: 'https://github.com/adivrskic/nimbus' },
    sections: [
      {
        label: 'Overview',
        body: 'Nimbus turns a plain-English description into a website. HTML streams into a sandboxed live preview, design controls refine it, and the result exports as a real project.',
      },
      {
        label: 'How it works',
        body: 'A single Supabase Edge Function talks to Claude; the browser does the parsing and patching. Edits travel as a custom six-operation PATCH protocol, so changes land incrementally instead of regenerating the page.',
      },
      {
        label: 'Scope',
        body: '60+ design controls, multi-page generation across five templates, and export to plain HTML, Vite + React, Next.js or Astro. Saved projects keep a version history; Google and GitHub sign-in, Stripe token purchases.',
      },
    ],
  }),
  project({
    slug: 'ljiljan',
    accent: '#f2b631',
    title: 'Ljiljan',
    kind: 'Language learning',
    year: '2026',
    summary: 'Bosnian for heritage speakers — web, mobile and an AI tutor on one shared curriculum.',
    stack: ['Next.js 16', 'React 19', 'Tailwind 4', 'Expo 57', 'Supabase', 'Anthropic', 'Azure Speech', 'Stripe'],
    links: { live: 'https://ljiljan.netlify.app' },
    sections: [
      {
        label: 'Overview',
        body: 'Ljiljan teaches Bosnian to diaspora and heritage speakers. A monorepo holds the Next.js web app, a landing site, an Expo app, and a shared package for curriculum, spaced repetition and progress.',
      },
      {
        label: 'Curriculum',
        body: '20 units, 116 lessons and 26 grammar topics with exams — plus SM-2 spaced repetition, branching dialogue scenes, timed duels and illustrated stories. Every listening exercise has an option that works without audio.',
      },
      {
        label: 'Tutor',
        body: 'Ajla is a Claude-powered tutor with server-side usage limits; Azure Speech supplies the Bosnian voices. Progress is local-first and merges across web and phone.',
      },
    ],
  }),
  project({
    slug: 'xsbl',
    accent: '#7b61ff',
    title: 'XSBL',
    kind: 'Accessibility SaaS',
    year: '2026',
    summary: 'WCAG 2.2 scanning that explains every issue — and opens the pull request that fixes it.',
    stack: ['React 19', 'Vite 7', 'Next.js 15', 'Supabase', 'axe-core', 'GitHub API'],
    links: { live: 'https://xsbl.io', repo: 'https://github.com/adivrskic/xsbl' },
    sections: [
      {
        label: 'Overview',
        body: 'XSBL scans rendered pages with axe-core, explains each issue with an AI-suggested fix, and can open a GitHub pull request with the change. A GitHub Action re-scans after every deploy.',
      },
      {
        label: 'Monitoring',
        body: 'Scheduled scans, score trends, Slack and email alerts, PDF and VPAT reports, and a built-in accessibility simulator.',
      },
      {
        label: 'For teams',
        body: 'A browser extension, client dashboards, an audit log and compliance-evidence export — plus free contrast, alt-text and heading checkers.',
      },
    ],
  }),
  project({
    slug: 'keyfall',
    accent: '#b8f53a',
    title: 'Keyfall',
    kind: 'Piano practice',
    year: '2026',
    summary: 'YouTube links and recordings become falling notes on an 88-key keyboard, played from an iPad.',
    stack: ['React 19', 'Vite', 'TypeScript', 'Node', 'Python', 'ONNX Runtime', 'TensorFlow.js', 'OpenSheetMusicDisplay'],
    links: {},
    sections: [
      {
        label: 'Overview',
        body: 'Keyfall turns YouTube links, recordings or MIDI files into notes falling onto an 88-key keyboard. It runs on a computer and is played from an iPad over local Wi-Fi.',
      },
      {
        label: 'Transcription',
        body: 'Two engines: a GPU piano model on ONNX Runtime that captures pedal and velocity, and Spotify’s Basic Pitch running in the browser for any instrument.',
      },
      {
        label: 'Practice',
        body: '10–150% speed without pitch change, A–B loops, hand split and wait mode. Scoring from on-screen keys, a MIDI keyboard or the iPad microphone, and sheet music with fingering and chords, exportable as MusicXML or MIDI.',
      },
    ],
  }),
  project({
    slug: 'halo',
    accent: '#ffb52e',
    title: 'Halo',
    kind: 'WebGL experiment',
    year: '2025',
    summary: 'Neon 3D type orbiting a sculpted bust — tunable live and shareable by URL.',
    stack: ['React 19', 'React Three Fiber', 'drei', 'Postprocessing', 'Leva'],
    links: { live: 'https://halo-effect.netlify.app', repo: 'https://github.com/adivrskic/halo' },
    sections: [
      {
        label: 'Overview',
        body: 'Halo is a small WebGL piece: neon 3D text orbits a sculpted bust, lifted by bloom post-processing.',
      },
      {
        label: 'Controls',
        body: 'Live controls for text, font, colour, orbit, letter size and glow — and every configuration can be shared as a URL.',
      },
    ],
  }),
  project({
    slug: 'afs',
    accent: '#d12e57',
    title: 'American Flooring',
    kind: 'Client website',
    year: '2025',
    summary: 'A CMS-driven website for a commercial flooring contractor.',
    stack: ['Next.js 15', 'Sanity', 'SCSS', 'pdf-lib'],
    links: {
      live: 'https://americanflooringservices.com',
      repo: 'https://github.com/adivrskic/american-flooring-services',
    },
    sections: [
      {
        label: 'Overview',
        body: 'A website for a commercial flooring contractor, with every page built from content blocks managed in an embedded Sanity studio.',
      },
      {
        label: 'Features',
        body: 'An interactive US state map, CMS-driven page blocks, and a subcontractor application that generates a PDF with pdf-lib and emails it to the team.',
      },
    ],
  }),
]

export const projectIndex = (slug: string) => PROJECTS.findIndex((p) => p.slug === slug)
