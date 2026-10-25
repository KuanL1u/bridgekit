import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Clock3, Database, Download, FolderInput, Grid2X2, HeartHandshake, Leaf, Menu, MessageCircle, MoreHorizontal, Plus, Search, Sprout, Trash2, Users, X } from 'lucide-react'
import ContextScreen from './ContextScreen'
import PlanScreen from './PlanScreen'
import ReflectScreen from './ReflectScreen'
import KitScreen from './KitScreen'
import { LibraryScreen, PhilosophyScreen } from './ResourceScreens'
import { BridgeMark, CommunityArt, Modal, useFocusTrap, WorkshopArt } from './ui'
import { checkpoint, createSample, createWorkshop, downloadFile, hasDraftChanges, instantiate, loadWorkspace, MAX_IMPORT_BYTES, parseKit, STORAGE_KEY, totalMinutes, workshopStatus } from './workshops'
import type { ActivityTemplate, Screen, Workshop } from './types'

type Route = { view: 'dashboard' | 'library' | 'philosophy' } | { view: 'workshop'; id: string; screen: Screen }
const steps: { id: Screen; label: string; short: string }[] = [
  { id: 'context', label: 'Your community', short: 'Community' },
  { id: 'plan', label: 'Make a plan', short: 'Plan' },
  { id: 'reflect', label: 'Listen & adapt', short: 'Listen' },
  { id: 'kit', label: 'Pass it on', short: 'Handoff' },
]

function parseRoute(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/')
  if (parts[0] === 'library' || parts[0] === 'philosophy') return { view: parts[0] }
  if (parts[0] === 'workshop' && parts[1]) {
    return { view: 'workshop', id: parts[1], screen: steps.some(step => step.id === parts[2]) ? parts[2] as Screen : 'context' }
  }
  return { view: 'dashboard' }
}

function go(path: string) { window.location.hash = `/${path}` }

export default function App() {
  const [loaded] = useState(() => {
    try { return loadWorkspace(window.localStorage) } catch {
      return { workspace: { schemaVersion: 1, workshops: [createSample()] }, warning: 'Browser storage is unavailable. Download a kit before closing this tab.', canSave: false, recovery: null }
    }
  })
  const [workspace, setWorkspace] = useState(loaded.workspace)
  const [route, setRoute] = useState<Route>(parseRoute)
  const [saveState, setSaveState] = useState<'saved' | 'memory'>(loaded.canSave ? 'saved' : 'memory')
  const [storageWarning, setStorageWarning] = useState(loaded.warning)
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [deleting, setDeleting] = useState<Workshop | null>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  useFocusTrap(sidebarRef, mobileMenu, () => setMobileMenu(false))
  const selected = route.view === 'workshop' ? workspace.workshops.find(workshop => workshop.id === route.id) : undefined
  const notify = (message: string, error = false) => setToast({ message, error })

  useEffect(() => {
    const change = () => { setRoute(parseRoute()); setMobileMenu(false); window.scrollTo({ top: 0 }); requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true })) }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  useEffect(() => {
    const media = window.matchMedia('(max-width: 780px)')
    const closeOnDesktop = () => { if (!media.matches) setMobileMenu(false) }
    media.addEventListener('change', closeOnDesktop)
    return () => media.removeEventListener('change', closeOnDesktop)
  }, [])
  useEffect(() => {
    if (!loaded.canSave) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
      setSaveState('saved')
    } catch {
      setSaveState('memory')
      setStorageWarning('This browser cannot save more data. Your current work is still open; download a kit before closing the tab.')
    }
  }, [workspace, loaded.canSave])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 6000); return () => clearTimeout(timer) }, [toast])

  const updateWorkshop = (next: Workshop) => setWorkspace(current => ({ ...current, workshops: current.workshops.map(workshop => workshop.id === next.id ? next : workshop) }))
  const leave = (path: string) => {
    if (selected?.agenda.length && hasDraftChanges(selected)) updateWorkshop(checkpoint(selected))
    go(path)
  }
  const addWorkshop = (workshop: Workshop) => {
    if (workspace.workshops.length >= 100) { notify('This workspace holds up to 100 workshops. Download a kit before removing one.', true); return false }
    setWorkspace(current => ({ ...current, workshops: [...current.workshops, workshop] }))
    return true
  }
  const newWorkshop = () => {
    const workshop = createWorkshop()
    if (addWorkshop(workshop)) leave(`workshop/${workshop.id}/context`)
  }
  const openWorkshop = (workshop: Workshop) => leave(`workshop/${workshop.id}/${workshop.ready ? 'kit' : workshop.agenda.length ? 'plan' : 'context'}`)
  const addActivity = (workshop: Workshop, template: ActivityTemplate) => {
    if (workshop.agenda.some(activity => activity.templateId === template.templateId)) { notify('This activity is already in that workshop.'); return }
    updateWorkshop({ ...workshop, agenda: [...workshop.agenda, instantiate(template)], ready: false, updatedAt: new Date().toISOString() })
    notify(`${template.title} added to ${workshop.context.title}.`)
  }
  const loadSample = () => {
    const existing = workspace.workshops.find(workshop => workshop.sample && !workshop.revisions.length)
    if (existing) { openWorkshop(existing); return }
    const sample = createSample()
    if (addWorkshop(sample)) { openWorkshop(sample); notify('A synthetic sample is ready to explore.') }
  }
  const pageName = route.view === 'dashboard' ? 'Workshops' : route.view === 'library' ? 'Activity library' : route.view === 'philosophy' ? 'The philosophy' : selected?.context.title || 'New workshop'
  const navigateStep = (screen: Screen) => {
    if (!selected) return
    if (route.view === 'workshop' && route.screen === 'plan' && hasDraftChanges(selected)) updateWorkshop(checkpoint(selected))
    go(`workshop/${selected.id}/${screen}`)
  }
  const props = selected ? { workshop: selected, onUpdate: updateWorkshop, onNavigate: navigateStep, onNotify: notify } : null
  return <>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Skip to content</a>
    <div className="app-shell">
      {mobileMenu && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`} ref={sidebarRef} role={mobileMenu ? 'dialog' : undefined} aria-modal={mobileMenu ? true : undefined} aria-label={mobileMenu ? 'Navigation' : undefined}>
        <a className="brand" href="#/workshops" onClick={event => { event.preventDefault(); leave('workshops') }}><BridgeMark /><span>BridgeKit<small>DESIGN FOR SOCIAL GOOD</small></span></a>
        <p className="sidebar-section-label">YOUR WORKSPACE</p>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#/workshops" className={route.view === 'dashboard' || route.view === 'workshop' ? 'active' : ''} aria-current={route.view === 'dashboard' || route.view === 'workshop' ? 'page' : undefined} onClick={event => { event.preventDefault(); leave('workshops') }}><Grid2X2 size={18} />Your workshops<span>{workspace.workshops.length}</span></a>
          <a href="#/library" className={route.view === 'library' ? 'active' : ''} aria-current={route.view === 'library' ? 'page' : undefined} onClick={event => { event.preventDefault(); leave('library') }}><BookOpen size={18} />Activity library</a>
          <a href="#/philosophy" className={route.view === 'philosophy' ? 'active' : ''} aria-current={route.view === 'philosophy' ? 'page' : undefined} onClick={event => { event.preventDefault(); leave('philosophy') }}><HeartHandshake size={19} />The philosophy</a>
        </nav>
        <div className="sidebar-note"><span className="sidebar-flower" aria-hidden="true">✳</span><h3>Good ideas<br />are meant to travel.</h3><p>Build with your community.<br />Pass the learning on.</p><button className="text-button" onClick={loadSample}>Explore a sample<ArrowRight size={14} /></button></div>
        <div className="sidebar-footer"><span className="sidebar-source">Inspired by</span><a href="https://bridgegood.com/about" target="_blank" rel="noreferrer">BRIDGEGOOD<ArrowUpRight size={14} /></a><p>A philosophy. A community.<br />A little good, everywhere.</p></div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={20} /></button>
          <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="#/workshops" onClick={event => { event.preventDefault(); leave('workshops') }}>Your workspace</a><ChevronRight size={13} /><span>{pageName}</span></nav>
          <div className="topbar-actions"><span className={`save-status ${saveState === 'memory' ? 'unsaved' : ''}`}><span className="save-dot" />{saveState === 'saved' ? 'Saved on this device' : 'In this tab only'}</span><button className="button small secondary" onClick={() => importInput.current?.click()}><FolderInput size={15} /><span>Import a kit</span></button></div>
        </header>
        {storageWarning && <div className="storage-banner" role="status"><Database size={17} /><span>{storageWarning}</span>{loaded.recovery && <button className="text-button" onClick={() => downloadFile(loaded.recovery!, 'bridgekit-recovery.json')}>Download recovery copy<Download size={13} /></button>}</div>}
        <main className="main-content" id="main-content" tabIndex={-1}>
          {route.view === 'dashboard' && <Dashboard workshops={workspace.workshops} onCreate={newWorkshop} onOpen={openWorkshop} onPhilosophy={() => leave('philosophy')} onDelete={setDeleting} onDuplicate={workshop => { const duplicated = { ...structuredClone(workshop), id: crypto.randomUUID(), context: { ...workshop.context, title: `${workshop.context.title.slice(0, 170)} (copy)` }, updatedAt: new Date().toISOString() }; if (addWorkshop(duplicated)) notify('A copy is ready to adapt. The original is kept.') }} />}
          {route.view === 'library' && <LibraryScreen workshops={workspace.workshops} onAdd={addActivity} onCreate={newWorkshop} />}
          {route.view === 'philosophy' && <PhilosophyScreen onCreate={newWorkshop} />}
          {route.view === 'workshop' && selected && props && <>
            <div className="workshop-topline"><button className="text-button" onClick={() => leave('workshops')}><ArrowLeftIcon /> All workshops</button><span className="workshop-version">{selected.sample && <span className="sample-badge">Sample</span>} Version {selected.versions.length || 1}{hasDraftChanges(selected) && selected.versions.length > 0 ? ' · local draft saved' : ''}</span></div>
            <nav className="step-nav" aria-label="Workshop steps">{steps.map((step, index) => <button className={route.screen === step.id ? 'active' : ''} key={step.id} aria-current={route.screen === step.id ? 'step' : undefined} disabled={step.id !== 'context' && !selected.agenda.length} onClick={() => navigateStep(step.id)}><span className="step-number">{index + 1}</span><span className="step-full-label">{step.label}</span><span className="step-short-label">{step.short}</span>{index < steps.length - 1 && <ChevronRight className="step-chevron" size={14} />}</button>)}</nav>
            {route.screen === 'context' ? <ContextScreen key={selected.id} {...props} /> : selected.agenda.length === 0 ? <div className="empty-state panel"><BookOpen size={28} /><h2>Let’s begin with your community</h2><p>Create a plan before moving into the session.</p><button className="button primary" onClick={() => navigateStep('context')}>Add community context<ArrowRight size={16} /></button></div> : route.screen === 'plan' ? <PlanScreen key={selected.id} {...props} /> : route.screen === 'reflect' ? <ReflectScreen key={selected.id} {...props} /> : <KitScreen key={selected.id} {...props} />}
          </>}
          {route.view === 'workshop' && !selected && <div className="empty-state panel"><BookOpen size={30} /><h1>This workshop isn’t on this device</h1><p>Import a downloaded kit, or start with your own community.</p><button className="button primary" onClick={newWorkshop}>Create a workshop<Plus size={16} /></button></div>}
          <footer className="app-footer"><span><Leaf size={13} /> Built for community. Made to be adapted.</span><a href="https://bridgegood.com/about" target="_blank" rel="noreferrer">Design for Social Good, by BRIDGEGOOD<ArrowUpRight size={12} /></a></footer>
        </main>
      </div>
    </div>
    <input ref={importInput} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Import a BridgeKit file" onChange={async event => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      if (file.size > MAX_IMPORT_BYTES) { notify('Choose a BridgeKit file smaller than 1 MB.', true); return }
      try { const workshop = parseKit(await file.text()); if (addWorkshop(workshop)) { openWorkshop(workshop); notify('Kit imported as a new workshop. Make it your community’s own.') } } catch (error) { notify(error instanceof Error ? error.message : 'This kit could not be imported.', true) }
    }} />
    {toast && <div className={`toast ${toast.error ? 'error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.error ? <MessageCircle size={18} /> : <Check size={18} />}<span>{toast.message}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={15} /></button></div>}
    {deleting && <Modal title="Remove this workshop?" eyebrow="YOUR LOCAL WORKSPACE" onClose={() => setDeleting(null)}><p className="muted">“{deleting.context.title || 'Untitled workshop'}”, its reflections, and its version history will be removed from this device. Download a kit first if you want to keep the shareable plan.</p><div className="modal-actions"><button className="button secondary" onClick={() => setDeleting(null)}>Keep workshop</button><button className="button danger" onClick={() => { setWorkspace(current => ({ ...current, workshops: current.workshops.filter(workshop => workshop.id !== deleting.id) })); setDeleting(null); notify('Workshop removed from this device.') }}><Trash2 size={15} /> Remove workshop</button></div></Modal>}
  </>
}

function Dashboard({ workshops, onCreate, onOpen, onPhilosophy, onDelete, onDuplicate }: { workshops: Workshop[]; onCreate: () => void; onOpen: (workshop: Workshop) => void; onPhilosophy: () => void; onDelete: (workshop: Workshop) => void; onDuplicate: (workshop: Workshop) => void }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [menuId, setMenuId] = useState<string | null>(null)
  const reflections = workshops.reduce((sum, workshop) => sum + workshop.reflections.length, 0)
  const changes = workshops.reduce((sum, workshop) => sum + workshop.revisions.filter(revision => revision.decision === 'adapt').length, 0)
  const visible = workshops.filter(workshop => `${workshop.context.title} ${workshop.context.community} ${workshop.context.location}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (filter === 'ready' ? workshopStatus(workshop) === 'Ready to pass on' : filter === 'listening' ? workshopStatus(workshop) === 'Listening & adapting' : ['Draft', 'Plan ready'].includes(workshopStatus(workshop)))))
  return <div className="screen-enter dashboard">
    <section className="dashboard-hero"><div className="hero-copy"><p className="eyebrow"><span className="tiny-dot" /> A LITTLE CARE. A LASTING IMPACT.</p><h1>Good design<br />starts with <em>people.</em></h1><p>Bring your community together.<br />Make room for every voice.<br />Let the good you create travel.</p><div className="hero-actions"><button className="button primary" onClick={onCreate}><Plus size={17} /> Create a workshop</button><button className="text-button" onClick={onPhilosophy}>Explore the philosophy<ArrowRight size={16} /></button></div></div><CommunityArt /></section>
    <section className="workspace-stats" aria-label="Your workspace overview"><div className="stat-card"><span className="stat-icon sage"><BookOpen size={20} /></span><div><strong>{workshops.length}</strong><span>{workshops.length === 1 ? 'workshop taking shape' : 'workshops taking shape'}</span></div><span className="stat-decoration" aria-hidden="true">◌</span></div><div className="stat-card"><span className="stat-icon peach"><MessageCircle size={20} /></span><div><strong>{reflections}</strong><span>community reflections</span></div><span className="stat-decoration" aria-hidden="true">◌</span></div><div className="stat-card"><span className="stat-icon lilac"><Sprout size={20} /></span><div><strong>{changes}</strong><span>{changes === 1 ? 'change made through listening' : 'changes made through listening'}</span></div><span className="stat-decoration" aria-hidden="true">◌</span></div></section>
    <section className="dashboard-workshops"><div className="section-heading"><div><p className="eyebrow">YOUR CORNER OF GOOD</p><h2>Your workshops</h2></div><label className="search-box"><Search size={16} /><input aria-label="Search workshops" placeholder="Find a workshop…" value={search} onChange={event => setSearch(event.target.value)} /></label></div><div className="workshop-filters tab-group" aria-label="Filter workshops">{[{ id: 'all', label: 'All workshops' }, { id: 'planning', label: 'Planning' }, { id: 'listening', label: 'Listening & adapting' }, { id: 'ready', label: 'Ready to pass on' }].map(item => <button className={filter === item.id ? 'active' : ''} aria-pressed={filter === item.id} key={item.id} onClick={() => setFilter(item.id)}>{item.label}{item.id === 'all' && <span>{workshops.length}</span>}</button>)}</div>
      <div className="workshop-grid">{visible.map((workshop, index) => <article className="workshop-card" key={workshop.id}><div className="workshop-card-visual"><WorkshopArt variant={index} />{workshop.sample && <span className="sample-badge">Sample workshop</span>}<div className="card-menu-wrap"><button className="card-menu-button" aria-label={`Options for ${workshop.context.title || 'untitled workshop'}`} aria-expanded={menuId === workshop.id} onClick={() => setMenuId(menuId === workshop.id ? null : workshop.id)}><MoreHorizontal size={18} /></button>{menuId === workshop.id && <div className="card-menu"><button onClick={() => { onDuplicate(workshop); setMenuId(null) }}>Make a copy</button><button className="subtle-danger" onClick={() => { onDelete(workshop); setMenuId(null) }}>Remove workshop</button><button onClick={() => setMenuId(null)}>Close</button></div>}</div></div><div className="workshop-card-body"><span className={`status-pill ${workshopStatus(workshop) === 'Ready to pass on' ? 'responded' : workshop.reflections.length ? 'listening' : 'pending'}`}><span className="tiny-dot" />{workshopStatus(workshop)}</span><h3>{workshop.context.title || 'Your next good idea'}</h3><p>{workshop.context.community || 'A community waiting to take shape'}</p><div className="workshop-card-meta"><span><Clock3 size={14} />{workshop.agenda.length ? totalMinutes(workshop.agenda) : workshop.context.duration} min</span><span><Users size={14} />{workshop.context.participants} people</span><span><MessageCircle size={14} />{workshop.reflections.length}</span></div><div className="workshop-card-footer"><span className="small-text muted">{workshop.context.location || 'Make it your own'}</span><button className="text-button" onClick={() => onOpen(workshop)}>Open workshop<ArrowRight size={15} /></button></div></div></article>)}<button className="new-workshop-card" onClick={onCreate}><span><Plus size={27} /></span><h3>Start something good.</h3><p>A question, a community,<br />and a little curiosity.</p><b>Create a workshop<ArrowRight size={15} /></b></button></div>
      {!visible.length && workshops.length > 0 && <p className="filter-empty">No workshops in this view yet. Try another filter or start a new one.</p>}
    </section>
    <section className="dashboard-bottom"><div className="philosophy-teaser"><span className="teaser-flower" aria-hidden="true">✳</span><div><p className="eyebrow">MORE THAN A METHOD</p><h3>A philosophy you can put into practice.</h3><p>People. Purpose. Passion. Product. Ground your work in care, community, and a thoughtful “why.”</p></div><button className="round-button" aria-label="Explore the Design for Social Good philosophy" onClick={onPhilosophy}><ArrowUpRight size={23} /></button></div></section>
    {workshops.some(workshop => workshop.sample) && <p className="sample-footnote"><Sprout size={13} /> Sample workshops use synthetic reflections so you can explore the complete experience.</p>}
  </div>
}

function ArrowLeftIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M11 7H3m4-4L3 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
