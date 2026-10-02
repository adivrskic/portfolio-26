import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useLocation, useMatch, useNavigate } from 'react-router'
import { PROJECTS, projectIndex } from './data/projects'
import { SITE } from './data/site'
import { markLayoutDirty, useUI, type Leaving, type Panel } from './state/store'
import { Carousel } from './components/Carousel'
import { LeftColumn } from './components/LeftColumn'
import { Loader } from './components/Loader'
import { InfoSection } from './components/InfoSection'
import { Morph } from './components/Morph'
import { tuning } from './config'
import { ProjectPage } from './components/ProjectPage'
import './styles/layout.css'

const Scene = lazy(() => import('./scene/Scene'))

const PANEL_TITLES = { about: 'About', contact: 'Contact', chat: 'Chat' } as const
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const workMatch = useMatch('/work/:slug')
  const aboutMatch = useMatch('/about')
  const contactMatch = useMatch('/contact')
  const chatMatch = useMatch('/chat')
  const { pathname } = useLocation()
  // a path the site doesn't have is not found (rather than quietly showing the gallery)
  const known = pathname === '/' || !!(workMatch || aboutMatch || contactMatch || chatMatch)
  const slug = workMatch?.params.slug
  const index = slug ? projectIndex(slug) : -1
  const project = index >= 0 ? PROJECTS[index] : null
  const next = project ? PROJECTS[(index + 1) % PROJECTS.length] : null
  const panel: Panel = aboutMatch ? 'about' : contactMatch ? 'contact' : chatMatch ? 'chat' : null
  const view = project ? 'project' : 'home'
  const ready = useUI((s) => s.ready)
  // a gallery card is growing into its project (the gallery fades rather than drops away, see Carousel)
  const expanding = useUI((s) => s.morph?.dir === 'expand')
  const navigate = useNavigate()

  // from one project page to another the pages slide past each other, both at once: on to the next
  // project, up; back to the previous one, down (see ProjectPage). Not when the next project's picture
  // grows into its hero (see Morph): that page simply comes in under it; and not on a phone, where the
  // cube, the title and the menu stay at the top of the screen (a page would slide across them)
  const lastIndex = useRef(-1)
  const slid = useMemo<0 | 1 | -1>(() => {
    const from = lastIndex.current
    if (index < 0 || from < 0 || from === index || reducedMotion() || window.innerWidth < 860) return 0
    return index === (from - 1 + PROJECTS.length) % PROJECTS.length ? -1 : 1
  }, [index])
  const slide = expanding ? 0 : slid
  useEffect(() => {
    lastIndex.current = index
  }, [index])
  const leaving: Leaving | undefined = expanding ? { expanding } : slide ? { slide } : undefined

  useEffect(() => {
    useUI.getState().setRoute(view, panel)
    markLayoutDirty(120)
  }, [view, panel])

  useEffect(() => {
    if (index < 0) return
    const ui = useUI.getState()
    ui.setActive(index)
    ui.setInfoMode(false)
    // no gallery on project pages, so the cube spins its slice on request
    ui.requestTwist()
    window.scrollTo({ top: 0 })
    // the link that was followed has gone with the old page: keyboard and screen-reader users carry on
    // from the new one, not from the top of the document
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) document.getElementById('content')?.focus({ preventScroll: true })
    })
  }, [index])

  // a click on the cube opens its chat (and closes it again, like the menu's About and Contact)
  useEffect(
    () =>
      useUI.subscribe((s, prev) => {
        if (s.chatAsk !== prev.chatAsk) navigate(s.panel === 'chat' ? '/' : '/chat')
      }),
    [navigate],
  )

  // each page's title, read out when it changes (the first is read with the page)
  const [heard, setHeard] = useState('')
  const firstTitle = useRef(true)
  useEffect(() => {
    document.title = project
      ? `${project.title} — ${SITE.name}`
      : !known || slug
        ? `Not found — ${SITE.name}`
        : panel
          ? `${PANEL_TITLES[panel]} — ${SITE.name}`
          : `${SITE.name} — ${SITE.role}`
    if (firstTitle.current) firstTitle.current = false
    else setHeard(document.title)
  }, [project, panel, known, slug])

  // ?tune: the settings panel for the cube and the equalizer (its code only loads then)
  useEffect(() => {
    if (tuning) import('./components/Tuner').then((m) => m.mountTuner())
  }, [])

  // on the single-column layout the cube anchor scrolls with the page
  useEffect(() => {
    const onScroll = () => markLayoutDirty(2)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <LeftColumn project={project} />
      <main id="content" className="main" tabIndex={-1}>
        {/* content waits for the intro: the ring fades, the cube flies to its spot, then this animates in */}
        <AnimatePresence mode={slide ? 'sync' : 'wait'} custom={leaving}>
          {!ready ? null : project && next ? (
            <ProjectPage key={project.slug} project={project} next={next} arrive={slide} />
          ) : slug || !known ? (
            <NotFound key="missing" />
          ) : panel ? (
            <InfoSection key={`info-${panel}`} kind={panel} />
          ) : (
            <Carousel key="home" />
          )}
        </AnimatePresence>
      </main>
      <Morph project={project} panel={panel} />
      <p className="sr-only" aria-live="polite">
        {heard}
      </p>
      <Loader />
    </>
  )
}

function NotFound() {
  return (
    <motion.div className="missing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="frame frame--text missing-card">
        <p className="mono">404</p>
        <h2 className="frame-body">This page drifted off the grid.</h2>
        <Link to="/" className="btn btn--dark">
          <span className="btn-label">Back to the work</span>
        </Link>
      </div>
    </motion.div>
  )
}
