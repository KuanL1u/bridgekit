import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, Clock3, Download, FileText, History, Leaf, MapPin, Printer, ShieldCheck, Sprout, Users } from 'lucide-react'
import { principles, sources } from './content'
import { checkpoint, downloadFile, hasDraftChanges, kitFilename, makeKit, totalMinutes } from './workshops'
import { BridgeMark, CommunityArt, Modal, SourceLinks } from './ui'
import type { ScreenProps } from './ui'
import type { Workshop } from './types'

export function PrintableKit({ workshop, includeSummary }: { workshop: Workshop; includeSummary: boolean }) {
  const sourceIds = [...new Set(workshop.agenda.flatMap(activity => activity.sourceIds))]
  let elapsed = 0
  return <div className="print-kit">
    <header className="print-header"><BridgeMark small /><b>BridgeKit</b><span>DESIGN FOR SOCIAL GOOD · FACILITATOR KIT</span></header>
    <h1>{workshop.context.title}</h1>
    <p className="print-subtitle">{workshop.context.community}{workshop.context.location && ` · ${workshop.context.location}`}</p>
    {workshop.sample && <p className="print-draft-note">Synthetic demonstration workshop</p>}
    <p>{workshop.context.goal}</p>
    <div className="print-facts"><span>{workshop.context.duration} minutes together</span><span>{workshop.context.participants} participants</span><span>Languages: {workshop.context.languages}</span><span>Version {workshop.versions.length}</span></div>
    <h2>Before the session</h2>
    <p>Confirm participation options with the group. Let people pass on a question, contribute without personal disclosure, and use a format that suits their resources and abilities.</p>
    <p>Materials available: {workshop.context.materials.join(', ') || 'Confirm with the group'}. Planned activities: {totalMinutes(workshop.agenda)} minutes, leaving {Math.max(0, workshop.context.duration - totalMinutes(workshop.agenda))} minutes for transitions.</p>
    {workshop.agenda.map((activity, index) => {
      const start = elapsed
      elapsed += activity.minutes
      return <section className="print-activity" key={activity.id}>
        <div className="print-activity-heading"><h2>{index + 1}. {activity.title}</h2><span>{start}-{elapsed} min</span></div>
        <p className="print-principle">{principles[activity.principleId].name}</p>
        <p>{activity.instructions}</p>
        {activity.prompts.length > 0 && <><h3>Invite a conversation</h3><ul>{activity.prompts.map((prompt, i) => <li key={i}>{prompt}</li>)}</ul></>}
        <h3>Another way to participate</h3><p>{activity.alternative}</p>
        <h3>Why this activity matters</h3><p>{activity.rationale}</p>
        {activity.adaptation && <><h3>Local adaptation</h3><p>{activity.adaptation}</p></>}
      </section>
    })}
    {workshop.revisions.length > 0 && <section className="print-learning"><h2>What we learned and changed</h2>{workshop.revisions.map(revision => <div key={revision.id}><h3>{revision.decision === 'adapt' ? `${revision.before.title} → ${revision.after.title}` : `Keeping: ${revision.before.title}`}</h3><p>{revision.reason}</p></div>)}</section>}
    {includeSummary && workshop.handoffNote.trim() && <section className="print-learning"><h2>A note for the next facilitator</h2><p>{workshop.handoffNote}</p></section>}
    <section className="print-sources"><h2>Sources and attribution</h2><p>Inspired by BRIDGEGOOD’s Design for Social Good philosophy. These activities are draft adaptations created for a hackathon, not official BRIDGEGOOD program materials. Retain the sources and explain local changes when passing this kit on.</p>{sourceIds.map(id => { const source = sources.find(item => item.id === id); return source && <p key={id}><b>{source.name} - {source.section}</b><br />{source.url}</p> })}<p>Content reference: {workshop.contentVersion}. Raw participant reflections are excluded from this kit.</p></section>
    <footer className="print-footer">Make room for every voice. Keep learning together. · BridgeKit</footer>
  </div>
}

export default function KitScreen({ workshop, onUpdate, onNavigate, onNotify }: ScreenProps) {
  const [includeSummary, setIncludeSummary] = useState(false)
  const [history, setHistory] = useState(false)
  const open = workshop.reflections.filter(reflection => reflection.status === 'open').length
  const adapted = workshop.revisions.filter(revision => revision.decision === 'adapt')
  const ready = workshop.ready && !hasDraftChanges(workshop)
  const overTime = totalMinutes(workshop.agenda) > workshop.context.duration
  const prepare = () => {
    const next = checkpoint(workshop, 'Prepared the kit for the next facilitator')
    if (next !== workshop) onUpdate(next)
    return next
  }
  return <div className="screen-enter">
    <div className="screen-intro inline-intro"><div><p className="eyebrow"><span className="tiny-dot" /> 04 / SHARE</p><h1>Pass it <em>on.</em></h1><p>Share your plan and what you learned.</p></div><span className={`status-pill ${ready ? 'responded' : 'pending'}`}>{ready ? <><Check size={13} /> Ready to share</> : 'Draft kit'}</span></div>
    <div className="content-with-aside">
      <div>
        <div className="kit-cover panel"><div className="kit-cover-art"><CommunityArt compact /></div><div className="kit-cover-content"><p className="eyebrow">WORKSHOP KIT</p><h2>{workshop.context.title}</h2><p>{workshop.context.community || 'A community design workshop'}</p><div className="kit-cover-meta"><span><Clock3 size={15} />{totalMinutes(workshop.agenda)} min of activities</span><span><Users size={15} />{workshop.context.participants} people</span>{workshop.context.location && <span><MapPin size={15} />{workshop.context.location}</span>}</div><div className="kit-cover-footer"><span><FileText size={14} />{workshop.agenda.length} activities · Version {workshop.versions.length}{hasDraftChanges(workshop) ? ' + local draft' : ''}</span><button className="text-button" onClick={() => setHistory(true)}><History size={14} /> Version history</button></div></div></div>
        <section className="panel kit-learning"><div className="panel-title"><Sprout size={20} /><h2>What changed</h2></div>{adapted.length ? adapted.map(revision => <div className="change-record" key={revision.id}><div className="change-comparison"><div><span className="eyebrow">BEFORE · V{revision.beforeVersion}</span><h3>{revision.before.title}</h3><details className="change-details"><summary>View instructions</summary><p>{revision.before.instructions}</p></details></div><span className="change-arrow"><ArrowRight size={19} /></span><div><span className="eyebrow">AFTER · V{revision.afterVersion}</span><h3>{revision.after.title}</h3><details className="change-details"><summary>View instructions</summary><p>{revision.after.instructions}</p></details></div></div><div className="change-reason"><Leaf size={16} /><p><b>Why it changed</b>{revision.reason}</p></div></div>) : <div className="gentle-empty"><Sprout size={22} /><p>Respond to feedback to record a change.</p><button className="text-button" onClick={() => onNavigate('reflect')}>Review feedback<ArrowRight size={14} /></button></div>}{open > 0 && <div className="pending-note"><span className="tiny-dot" /><span>{open} awaiting a response.</span><button className="text-button" onClick={() => onNavigate('reflect')}>Review<ArrowRight size={13} /></button></div>}</section>
        <section className="panel handoff-panel"><div className="panel-title"><FileText size={19} /><h2>Handoff note</h2></div><label className="field"><span className="visually-hidden">Note for the next facilitator</span><textarea rows={4} maxLength={3000} value={workshop.handoffNote} onChange={event => onUpdate({ ...workshop, handoffNote: event.target.value, updatedAt: new Date().toISOString() })} placeholder="What worked? What should change? Leave out names." /></label><label className="summary-check"><input type="checkbox" checked={includeSummary} onChange={event => setIncludeSummary(event.target.checked)} /><span>Include this note in the kit</span></label><p className="field-hint">Review before sharing. Raw feedback is excluded.</p></section>
        {overTime && <p className="inline-error">This plan exceeds your time. Shorten it before sharing.</p>}
        <div className="bottom-navigation"><button className="button secondary" onClick={() => onNavigate('reflect')}><ArrowLeft size={15} /> Back</button><button className={`button ${ready ? 'secondary' : 'primary'}`} disabled={ready || overTime || !workshop.agenda.length || !workshop.context.title.trim()} onClick={() => { onUpdate({ ...prepare(), ready: true }); onNotify('Kit ready to share.') }}>{ready ? <><CheckCircle2 size={16} /> Ready to share</> : <>Mark ready<Check size={16} /></>}</button></div>
      </div>
      <aside className="page-aside">
        <div className="panel export-card"><span className="export-icon"><Download size={24} /></span><h3>Share your kit.</h3><p>Let the next group make it their own.</p><button className="button primary full-width" disabled={!workshop.agenda.length} onClick={() => { const next = prepare(); downloadFile(JSON.stringify(makeKit(next, includeSummary), null, 2), kitFilename(next)); onNotify('Kit downloaded.') }}><Download size={16} /> Download kit</button><button className="button secondary full-width" onClick={() => { prepare(); requestAnimationFrame(() => window.print()) }}><Printer size={16} /> Print / PDF</button><div className="privacy-note"><ShieldCheck size={16} /><span>Raw feedback stays on this device.</span></div></div>
        <div className="aside-note"><h4>Keep the sources</h4><p>Pass BRIDGEGOOD’s sources on with your changes.</p><SourceLinks ids={['brief', 'preserve']} /><a className="text-link" href="https://bridgegood.com/about" target="_blank" rel="noreferrer">About BRIDGEGOOD<ArrowUpRight size={13} /></a></div>
      </aside>
    </div>
    {history && <Modal title="Version history" onClose={() => setHistory(false)} wide><p className="muted modal-description">Original plans stay intact.</p><div className="version-list">{[...workshop.versions].reverse().map(version => <details className="version-card" key={version.version}><summary><span className={`version-number ${version.kind === 'feedback' ? 'feedback' : ''}`}>v{version.version}</span><div><b>{version.reason}</b><small>{version.kind === 'feedback' ? 'Feedback' : version.kind === 'initial' ? 'Original' : 'Edited'} · {totalMinutes(version.agenda)} minutes</small></div><ChevronIcon /></summary><div className="version-content"><h4>{version.context.title}</h4>{version.agenda.map((activity, index) => <div className="version-activity" key={activity.id}><b>{index + 1}. {activity.title}<span>{activity.minutes} min</span></b><p>{activity.instructions}</p></div>)}</div></details>)}</div></Modal>}
    {createPortal(<PrintableKit workshop={workshop} includeSummary={includeSummary} />, document.body)}
  </div>
}

function ChevronIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" /></svg>
}
