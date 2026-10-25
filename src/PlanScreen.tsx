import { useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Check, ChevronDown, Clock3, GripVertical, Leaf, Pencil, Plus, RotateCcw, Trash2, Users } from 'lucide-react'
import { activityTemplates, principles } from './content'
import { buildPlan, contextGuidance, instantiate, totalMinutes } from './workshops'
import { Modal, SourceLinks } from './ui'
import type { ScreenProps } from './ui'
import type { Activity } from './types'

export function ActivityEditor({ activity, onSave, onClose }: { activity: Activity; onSave: (activity: Activity) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(activity)
  const [promptText, setPromptText] = useState(activity.prompts.join('\n'))
  const [error, setError] = useState('')
  return <Modal title="Make this activity your own" eyebrow="LOCAL ADAPTATION" onClose={onClose} wide>
    <form onSubmit={event => {
      event.preventDefault()
      const prompts = promptText.split('\n').map(text => text.trim()).filter(Boolean)
      if (prompts.length > 40 || prompts.some(prompt => prompt.length > 300)) { setError('Use up to 40 prompts, with 300 characters or fewer in each.'); return }
      if (!draft.title.trim() || !draft.instructions.trim()) { setError('Add an activity name and instructions.'); return }
      onSave({ ...draft, title: draft.title.trim(), prompts })
    }}>
      <div className="field-row title-and-time"><label className="field">Activity name<input required maxLength={180} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label><label className="field">Minutes<input type="number" required min={1} max={180} value={draft.minutes || ''} onChange={event => setDraft({ ...draft, minutes: Number(event.target.value) })} /></label></div>
      <label className="field">Facilitation instructions<textarea required maxLength={10000} rows={5} value={draft.instructions} onChange={event => setDraft({ ...draft, instructions: event.target.value })} /></label>
      <label className="field">Questions to bring into the room<textarea rows={3} maxLength={10000} value={promptText} onChange={event => setPromptText(event.target.value)} /><span className="field-hint">One question per line.</span></label>
      <label className="field">Another way to participate<textarea rows={3} maxLength={10000} value={draft.alternative} onChange={event => setDraft({ ...draft, alternative: event.target.value })} /></label>
      <label className="field">Why this local adaptation?<textarea rows={2} maxLength={10000} value={draft.adaptation} onChange={event => setDraft({ ...draft, adaptation: event.target.value })} placeholder="What about your community makes this change useful?" /></label>
      <div className={`principle-strip ${principles[activity.principleId].color}`}><Leaf size={17} /><div><b>{principles[activity.principleId].name}</b><p>{activity.rationale}</p></div></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Save this adaptation<Check size={16} /></button></div>
    </form>
  </Modal>
}

export default function PlanScreen({ workshop, onUpdate, onNavigate, onNotify }: ScreenProps) {
  const [expanded, setExpanded] = useState<string | null>(workshop.agenda[0]?.id ?? null)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [library, setLibrary] = useState(false)
  const [rebuild, setRebuild] = useState(false)
  const total = totalMinutes(workshop.agenda)
  const available = workshop.context.duration - total
  const updateAgenda = (agenda: Activity[]) => onUpdate({ ...workshop, agenda, ready: false, updatedAt: new Date().toISOString() })
  const move = (index: number, offset: number) => {
    const agenda = [...workshop.agenda]
    ;[agenda[index], agenda[index + offset]] = [agenda[index + offset], agenda[index]]
    updateAgenda(agenda)
  }
  return <div className="screen-enter">
    <div className="screen-intro inline-intro"><div><p className="eyebrow"><span className="tiny-dot" /> 02 / MAKE IT YOUR OWN</p><h1>A plan with<br /><em>room for people.</em></h1><p>Start with these activities. Adapt the details, keep the reasoning, and follow your community’s lead.</p></div><button className="button secondary" onClick={() => setLibrary(true)}><Plus size={17} /> Add an activity</button></div>
    <div className="content-with-aside">
      <div className="activity-stack">
        <div className="list-heading"><h2>Your session flow <span>{workshop.agenda.length} activities</span></h2><button className="text-button" onClick={() => setRebuild(true)}><RotateCcw size={14} /> Rebuild plan</button></div>
        {workshop.agenda.length === 0 && <div className="empty-state panel"><BookOpen size={28} /><h3>Begin with an activity</h3><p>Add an activity from the library or rebuild a plan for your community.</p><button className="button primary" onClick={() => setLibrary(true)}>Explore activities<Plus size={16} /></button></div>}
        {workshop.agenda.map((activity, index) => <article className={`activity-card ${expanded === activity.id ? 'expanded' : ''}`} key={activity.id}>
          <div className="activity-top">
            <div className="activity-index"><GripVertical size={13} /><span>{String(index + 1).padStart(2, '0')}</span></div>
            <button className="activity-title" aria-expanded={expanded === activity.id} aria-controls={`activity-${activity.id}`} onClick={() => setExpanded(expanded === activity.id ? null : activity.id)}><span className={`principle-label ${principles[activity.principleId].color}`}>{principles[activity.principleId].name}</span><h3>{activity.title}</h3></button>
            <span className="time-pill"><Clock3 size={13} />{activity.minutes} min</span>
            <button className="icon-button expand-button" aria-label={`${expanded === activity.id ? 'Collapse' : 'Expand'} ${activity.title}`} onClick={() => setExpanded(expanded === activity.id ? null : activity.id)}><ChevronDown size={17} /></button>
          </div>
          {expanded === activity.id && <div className="activity-body" id={`activity-${activity.id}`}>
            <p className="activity-instructions">{activity.instructions}</p>
            <div className="activity-prompts"><span className="eyebrow">ASK THE ROOM</span>{activity.prompts.map((prompt, i) => <p key={i}>{prompt}</p>)}</div>
            <details className="activity-details"><summary><Leaf size={15} /> Why this activity matters<ChevronDown size={14} /></summary><p>{activity.rationale}</p><SourceLinks ids={activity.sourceIds} /></details>
            <details className="activity-details"><summary><Users size={15} /> Another way to participate<ChevronDown size={14} /></summary><p>{activity.alternative}</p></details>
            {activity.adaptation && <div className="local-note"><Check size={15} /><p><b>Local adaptation</b>{activity.adaptation}</p></div>}
            <div className="activity-actions">
              <button className="text-button" onClick={() => setEditing(activity)}><Pencil size={14} /> Adapt activity</button>
              <div className="activity-order"><button className="icon-button" disabled={index === 0} aria-label={`Move ${activity.title} earlier`} onClick={() => move(index, -1)}><ArrowUp size={15} /></button><button className="icon-button" disabled={index === workshop.agenda.length - 1} aria-label={`Move ${activity.title} later`} onClick={() => move(index, 1)}><ArrowDown size={15} /></button><button className="icon-button subtle-danger" aria-label={`Remove ${activity.title}`} onClick={() => { updateAgenda(workshop.agenda.filter(item => item.id !== activity.id)); onNotify('Activity removed. Earlier saved versions keep the original.') }}><Trash2 size={15} /></button></div>
            </div>
          </div>}
        </article>)}
        <button className="add-activity-row" onClick={() => setLibrary(true)}><Plus size={18} /> Make space for another activity</button>
        <div className="bottom-navigation"><button className="button secondary" onClick={() => onNavigate('context')}>Back to your community</button><button className="button primary" disabled={!workshop.agenda.length} onClick={() => onNavigate('reflect')}>Listen & reflect<ArrowRight size={17} /></button></div>
      </div>
      <aside className="page-aside">
        <div className="panel session-summary"><p className="eyebrow">YOUR TIME TOGETHER</p><div className="time-total">{total}<span>/ {workshop.context.duration} min</span></div><div className={`time-track ${available < 0 ? 'over' : ''}`}><span style={{ width: `${Math.min(100, total / workshop.context.duration * 100)}%` }} /></div><p className={available < 0 ? 'inline-error' : 'muted'}>{available < 0 ? `${Math.abs(available)} minutes over. Shorten an activity or give the group more time.` : `${available} minutes of breathing room.`}</p><div className="summary-meta"><span><Users size={15} />{workshop.context.participants} people</span><span><Clock3 size={15} />{workshop.context.duration} minutes</span></div><p className="summary-language">{workshop.context.languages || 'Languages to confirm'}</p><div className="care-divider" /><p className="aside-question">A useful plan can change.<br />Keep listening as you go.</p></div>
        {contextGuidance(workshop.context).length > 0 && <div className="guidance-card"><h4>A little preparation</h4>{contextGuidance(workshop.context).map(note => <p key={note}>{note}</p>)}</div>}
        <div className="aside-note"><h4>Carry the reasoning forward</h4><p>Every activity has a “why.” Keep that explanation with your local changes so the next facilitator can learn from them.</p><SourceLinks ids={['voice', 'understand']} /></div>
      </aside>
    </div>
    {editing && <ActivityEditor activity={editing} onClose={() => setEditing(null)} onSave={activity => { updateAgenda(workshop.agenda.map(item => item.id === activity.id ? activity : item)); setEditing(null); onNotify('Your adaptation is part of the plan.') }} />}
    {library && <Modal title="A little more room to explore" eyebrow="ACTIVITY LIBRARY" onClose={() => setLibrary(false)} wide><p className="muted modal-description">Draft activities adapted from the BRIDGEGOOD Hack Pack. Choose what will be useful for your group.</p><div className="library-picker">{activityTemplates.map(template => {
      const alreadyAdded = workshop.agenda.some(activity => activity.templateId === template.templateId)
      return <div className="library-pick" key={template.templateId}><span className={`principle-icon ${principles[template.principleId].color}`}><Leaf size={18} /></span><div><b>{template.title}</b><p>{template.category} · {template.minutes} minutes</p></div><button className="button small secondary" disabled={alreadyAdded} onClick={() => { updateAgenda([...workshop.agenda, instantiate(template)]); setLibrary(false); onNotify(`${template.title} added to your plan.`) }}>{alreadyAdded ? <><Check size={14} /> Added</> : <><Plus size={14} /> Add</>}</button></div>
    })}</div></Modal>}
    {rebuild && <Modal title="Build a new session flow?" eyebrow="KEEP LEARNING" onClose={() => setRebuild(false)}><p className="muted">A new agenda will use your current community context. Your previous plan stays in version history. Existing reflections stay linked to their original activities.</p><div className="modal-actions"><button className="button secondary" onClick={() => setRebuild(false)}>Keep this plan</button><button className="button primary" onClick={() => { const next = buildPlan(workshop); onUpdate(next); setExpanded(next.agenda[0]?.id ?? null); setRebuild(false); onNotify('A new plan is ready. Your earlier version is preserved.') }}>Rebuild the plan<RotateCcw size={16} /></button></div></Modal>}
  </div>
}
