import { useState } from 'react'
import { ArrowRight, ArrowUpRight, BookOpen, Check, Clock3, HeartHandshake, Leaf, Plus, Search } from 'lucide-react'
import { activityTemplates, principles } from './content'
import { Modal, SourceLinks } from './ui'
import type { ActivityTemplate, PrincipleId, Workshop } from './types'

export function LibraryScreen({ workshops, onAdd, onCreate }: { workshops: Workshop[]; onAdd: (workshop: Workshop, template: ActivityTemplate) => void; onCreate: () => void }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PrincipleId | 'all'>('all')
  const [preview, setPreview] = useState<ActivityTemplate | null>(null)
  const [targetId, setTargetId] = useState(workshops.find(workshop => workshop.agenda.length)?.id ?? '')
  const target = workshops.find(workshop => workshop.id === targetId)
  const visible = activityTemplates.filter(activity => (filter === 'all' || activity.principleId === filter) && `${activity.title} ${activity.category} ${activity.instructions}`.toLowerCase().includes(search.toLowerCase()))
  const alreadyAdded = (template: ActivityTemplate) => !!target?.agenda.some(activity => activity.templateId === template.templateId)
  return <div className="screen-enter">
    <div className="screen-intro"><p className="eyebrow"><span className="tiny-dot" /> ACTIVITY LIBRARY</p><h1>Choose an <em>activity.</em></h1><p>Start here. Adapt it for your group.</p></div>
    <div className="resource-toolbar"><label className="search-box"><Search size={17} /><input aria-label="Search activities" placeholder="Find an activity…" value={search} onChange={event => setSearch(event.target.value)} /></label>{workshops.some(workshop => workshop.agenda.length) ? <label className="add-target">Add to<select value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Choose a workshop</option>{workshops.filter(workshop => workshop.agenda.length).map(workshop => <option key={workshop.id} value={workshop.id}>{workshop.context.title}</option>)}</select></label> : <button className="button primary" onClick={onCreate}>Create a workshop<Plus size={16} /></button>}</div>
    <div className="filter-chips" aria-label="Filter activity principles"><button className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All activities</button>{(Object.keys(principles) as PrincipleId[]).map(id => <button key={id} className={filter === id ? 'active' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{principles[id].name}</button>)}</div>
    <div className="resource-grid">{visible.map((activity, index) => <article className="resource-card" key={activity.templateId}><div className={`resource-card-top ${principles[activity.principleId].color}`}><span className="resource-number">{String(index + 1).padStart(2, '0')}</span><span className="resource-symbol" aria-hidden="true">{activity.principleId === 'listen' ? '◌' : activity.principleId === 'agency' ? '✳' : activity.principleId === 'community' ? '◎' : '⌘'}</span><span className="time-pill"><Clock3 size={13} />{activity.minutes} min</span></div><div className="resource-card-body"><p className="eyebrow">{activity.category}</p><h2>{activity.title}</h2><p>{activity.rationale}</p><div className="resource-card-actions"><button className="text-button" onClick={() => setPreview(activity)}>View activity<ArrowRight size={14} /></button><button className="icon-button" disabled={!target || alreadyAdded(activity)} aria-label={alreadyAdded(activity) ? `${activity.title} is already in this workshop` : `Add ${activity.title} to workshop`} onClick={() => target && onAdd(target, activity)}>{alreadyAdded(activity) ? <Check size={17} /> : <Plus size={17} />}</button></div></div></article>)}</div>
    {!visible.length && <div className="empty-state panel"><Search size={28} /><h3>No activities match yet</h3><p>Try a different word or explore all the principles.</p><button className="button secondary" onClick={() => { setSearch(''); setFilter('all') }}>Show all activities</button></div>}
    <p className="resource-footnote"><BookOpen size={15} /> Draft activities from the BRIDGEGOOD Hack Pack.</p>
    {preview && <Modal title={preview.title} eyebrow={`${preview.category} · ${preview.minutes} MINUTES`} onClose={() => setPreview(null)} wide><p className="activity-instructions">{preview.instructions}</p><div className="activity-prompts"><span className="eyebrow">ASK THE ROOM</span>{preview.prompts.map(prompt => <p key={prompt}>{prompt}</p>)}</div><h3 className="modal-section-title">Another way to participate</h3><p className="muted">{preview.alternative}</p><div className={`principle-strip ${principles[preview.principleId].color}`}><Leaf size={17} /><div><b>{principles[preview.principleId].name}</b><p>{preview.rationale}</p></div></div><SourceLinks ids={preview.sourceIds} /><div className="modal-actions"><button className="button secondary" onClick={() => setPreview(null)}>Back to the library</button><button className="button primary" disabled={!target || alreadyAdded(preview)} onClick={() => { if (target) { onAdd(target, preview); setPreview(null) } }}>{alreadyAdded(preview) ? <><Check size={16} /> Already in your plan</> : <>Add to selected workshop<Plus size={16} /></>}</button></div></Modal>}
  </div>
}

export function PhilosophyScreen({ onCreate }: { onCreate: () => void }) {
  return <div className="screen-enter philosophy-page">
    <div className="screen-intro"><p className="eyebrow"><span className="tiny-dot" /> BRIDGEGOOD’S PHILOSOPHY</p><h1>Design with <em>people.</em></h1><p>Four ways to put care into practice.</p></div>
    <div className="philosophy-grid">{(Object.keys(principles) as PrincipleId[]).map((id, index) => {
      const principle = principles[id]
      return <article className={`philosophy-card ${principle.color}`} key={id}><span className="philosophy-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h2>{principle.name}</h2><p>{principle.description}</p><div className="philosophy-question"><h3>{principle.question}</h3></div><SourceLinks ids={principle.sourceIds} /></article>
    })}</div>
    <div className="philosophy-next"><span className="care-icon"><HeartHandshake size={25} /></span><div><h2>Put it into practice.</h2></div><button className="button primary" onClick={onCreate}>Create workshop<ArrowRight size={17} /></button></div>
    <div className="philosophy-attribution"><p>Draft adaptations of BRIDGEGOOD’s Design for Social Good philosophy.</p><a className="text-link" href="https://bridgegood.com/about" target="_blank" rel="noreferrer">About BRIDGEGOOD<ArrowUpRight size={14} /></a></div>
  </div>
}
