import { useState } from 'react'
import { ArrowRight, Check, ChevronRight, Heart, Lightbulb, MessageCircle, Plus, Sprout, Users } from 'lucide-react'
import { activityTemplates, principles } from './content'
import { addReflection, instantiate, recordDecision, totalMinutes } from './workshops'
import { Modal, SourceLinks } from './ui'
import type { ScreenProps } from './ui'
import type { Activity, Reflection, Workshop } from './types'

const kinds = {
  barrier: { name: 'Barrier', label: 'Barrier', color: 'peach', Icon: Users },
  worked: { name: 'What worked', label: 'Helped', color: 'sage', Icon: Heart },
  idea: { name: 'New idea', label: 'Idea', color: 'lilac', Icon: Lightbulb },
}

function ReflectionForm({ workshop, onClose, onSave }: { workshop: Workshop; onClose: () => void; onSave: (input: Pick<Reflection, 'kind' | 'activityId' | 'observation' | 'suggestion'>) => void }) {
  const [kind, setKind] = useState<Reflection['kind']>('barrier')
  const [activityId, setActivityId] = useState('')
  const [observation, setObservation] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [error, setError] = useState('')
  return <Modal title="Add feedback" eyebrow="COMMUNITY REFLECTION" onClose={onClose} wide>
    <p className="muted modal-description">Feedback is optional. Leave out names and identifying details.</p>
    <form onSubmit={event => { event.preventDefault(); if (!observation.trim() && !suggestion.trim()) { setError('Add an observation or a suggestion.'); return } onSave({ kind, activityId, observation: observation.trim(), suggestion: suggestion.trim() }) }}>
      <fieldset className="reflection-kinds"><legend className="field-label">Type</legend>{(Object.keys(kinds) as Reflection['kind'][]).map(value => {
        const { Icon } = kinds[value]
        return <label className={`reflection-kind ${kind === value ? 'selected' : ''}`} key={value}><input type="radio" name="reflection-kind" value={value} checked={kind === value} onChange={() => setKind(value)} /><Icon size={17} /><span>{kinds[value].label}</span></label>
      })}</fieldset>
      <label className="field">Activity<select value={activityId} onChange={event => setActivityId(event.target.value)}><option value="">Whole workshop</option>{workshop.agenda.map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label>
      <label className="field">What happened?<textarea rows={4} maxLength={3000} value={observation} onChange={event => setObservation(event.target.value)} placeholder="What made participation easier, or what got in the way?" /></label>
      <label className="field">Suggestion <span className="optional">Optional</span><textarea rows={3} maxLength={3000} value={suggestion} onChange={event => setSuggestion(event.target.value)} placeholder="A change, something to keep, or a question to explore…" /></label>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="privacy-note"><Heart size={15} /><span>Saved on this device. Excluded from shared kits.</span></div>
      <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Save feedback<Plus size={16} /></button></div>
    </form>
  </Modal>
}

function RespondDialog({ workshop, reflection, onClose, onSave }: { workshop: Workshop; reflection: Reflection; onClose: () => void; onSave: (activityId: string, reason: string, after?: Activity) => void }) {
  const originalTarget = workshop.agenda.find(activity => activity.id === reflection.activityId) ?? workshop.agenda[0]
  const initialTemplate = originalTarget.templateId === 'ideas' && reflection.kind === 'barrier' ? activityTemplates.find(template => template.templateId === 'paper')! : null
  const [targetId, setTargetId] = useState(originalTarget.id)
  const [decision, setDecision] = useState<'adapt' | 'keep'>(reflection.kind === 'worked' ? 'keep' : 'adapt')
  const [choice, setChoice] = useState(initialTemplate?.templateId ?? 'current')
  const [after, setAfter] = useState<Activity>(initialTemplate ? { ...instantiate(initialTemplate), id: originalTarget.id, minutes: originalTarget.minutes } : structuredClone(originalTarget))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const target = workshop.agenda.find(activity => activity.id === targetId)!
  const choose = (templateId: string, activity = target) => {
    setChoice(templateId)
    const template = activityTemplates.find(item => item.templateId === templateId)
    setAfter(template ? { ...instantiate(template), id: activity.id, minutes: activity.minutes } : structuredClone(activity))
  }
  return <Modal title="Respond to feedback" eyebrow="YOUR RESPONSE" onClose={onClose} wide>
    <div className={`reflection-quote ${kinds[reflection.kind].color}`}><MessageCircle size={18} /><div><p>{reflection.observation || reflection.suggestion}</p>{reflection.observation && reflection.suggestion && <small>{reflection.suggestion}</small>}{reflection.sample && <span className="sample-note">Demo feedback</span>}</div></div>
    <form onSubmit={event => { event.preventDefault(); setError(''); if (!reason.trim()) { setError('Add a reason for your choice.'); return } try { onSave(targetId, reason, decision === 'adapt' ? { ...after, id: targetId, title: after.title.trim(), instructions: after.instructions.trim() } : undefined) } catch (err) { setError(err instanceof Error ? err.message : 'This decision could not be saved.') } }}>
      <label className="field">Activity<select value={targetId} onChange={event => { const selected = workshop.agenda.find(activity => activity.id === event.target.value)!; setTargetId(selected.id); choose('current', selected) }}>{workshop.agenda.map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label>
      {!workshop.agenda.some(activity => activity.id === reflection.activityId) && reflection.activityId && <p className="field-hint">The original activity is in an earlier version. Choose where this feedback fits in the current plan.</p>}
      <fieldset className="decision-options"><legend className="field-label">Your choice</legend><label className={decision === 'adapt' ? 'selected' : ''}><input type="radio" name="decision" checked={decision === 'adapt'} onChange={() => setDecision('adapt')} /><Sprout size={18} /><b>Change activity</b><small>Fit the group’s needs.</small></label><label className={decision === 'keep' ? 'selected' : ''}><input type="radio" name="decision" checked={decision === 'keep'} onChange={() => setDecision('keep')} /><Heart size={18} /><b>Keep activity</b><small>Explain why it works.</small></label></fieldset>
      {decision === 'adapt' && <>
        <label className="field">Start from<select value={choice} onChange={event => choose(event.target.value)}><option value="current">Edit the current activity</option>{activityTemplates.filter(template => template.templateId !== target.templateId).map(template => <option key={template.templateId} value={template.templateId}>{template.title}</option>)}</select></label>
        <div className="field-row title-and-time"><label className="field">Activity name<input required maxLength={180} value={after.title} onChange={event => setAfter({ ...after, title: event.target.value })} /></label><label className="field">Minutes<input required type="number" min={1} max={180} value={after.minutes || ''} onChange={event => setAfter({ ...after, minutes: Number(event.target.value) })} /></label></div>
        <label className="field">Instructions<textarea required rows={4} maxLength={10000} value={after.instructions} onChange={event => setAfter({ ...after, instructions: event.target.value })} /></label>
        <label className="field">Participation options<textarea rows={2} maxLength={10000} value={after.alternative} onChange={event => setAfter({ ...after, alternative: event.target.value })} /></label>
        <p className="field-hint">Your revised plan will take {totalMinutes(workshop.agenda) - target.minutes + after.minutes} minutes of the {workshop.context.duration} available.</p>
      </>}
      <label className="field">Why this choice? <span className="required">*</span><textarea required maxLength={10000} rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Because the group told us…, we’re choosing to…" /><span className="field-hint">This reason is shared. Leave out names.</span></label>
      {decision === 'adapt' && <div className={`principle-strip ${principles[after.principleId].color}`}><Sprout size={17} /><div><b>{principles[after.principleId].name}</b><p>{after.rationale}</p></div></div>}
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit">{decision === 'adapt' ? 'Save change' : 'Save response'}<Check size={16} /></button></div>
    </form>
  </Modal>
}

export default function ReflectScreen({ workshop, onUpdate, onNavigate, onNotify }: ScreenProps) {
  const [adding, setAdding] = useState(false)
  const [reviewing, setReviewing] = useState<Reflection | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'responded'>('all')
  const open = workshop.reflections.filter(reflection => reflection.status === 'open').length
  const visible = workshop.reflections.filter(reflection => filter === 'all' || (filter === 'open' ? reflection.status === 'open' : reflection.status !== 'open'))
  return <div className="screen-enter">
    <div className="screen-intro inline-intro"><div><p className="eyebrow"><span className="tiny-dot" /> 03 / LISTEN</p><h1>Listen.<br /><em>Then adapt.</em></h1><p>Turn feedback into your next step.</p></div><button className="button primary" disabled={workshop.reflections.length >= 500} onClick={() => setAdding(true)}><Plus size={17} /> Add feedback</button></div>
    {workshop.sample && <div className="sample-banner"><Sprout size={16} /><span>Demo feedback is fictional.</span></div>}
    <div className="content-with-aside">
      <div>
        <div className="list-heading"><div className="tab-group" aria-label="Filter reflections">{(['all', 'open', 'responded'] as const).map(value => <button className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{value === 'all' ? 'All' : value === 'open' ? 'Open' : 'Responded'}{value === 'open' && <span>{open}</span>}</button>)}</div><span className="muted small-text">{workshop.reflections.length} reflections</span></div>
        <div className="reflection-stack">
          {visible.map(reflection => {
            const { Icon, name, color } = kinds[reflection.kind]
            const activity = workshop.agenda.find(item => item.id === reflection.activityId) ?? workshop.versions.flatMap(version => version.agenda).find(item => item.id === reflection.activityId)
            const response = workshop.revisions.find(revision => revision.reflectionId === reflection.id)
            return <article className="reflection-card" key={reflection.id}>
              <div className="reflection-heading"><span className={`principle-icon ${color}`}><Icon size={18} /></span><div><b>{name}</b><small>{activity?.title ?? 'Whole workshop'}</small></div><span className={`status-pill ${reflection.status === 'open' ? 'pending' : 'responded'}`}>{reflection.status === 'open' ? 'Open' : <><Check size={12} />{reflection.status === 'addressed' ? 'Adapted' : 'Acknowledged'}</>}</span></div>
              {reflection.observation && <blockquote>{reflection.observation}</blockquote>}
              {reflection.suggestion && <p className="reflection-suggestion"><Lightbulb size={15} /><span>{reflection.suggestion}</span></p>}
              {response && <div className="response-note"><Sprout size={16} /><div><b>{response.decision === 'adapt' ? `${response.before.title} → ${response.after.title}` : 'Keeping the current approach'}</b><p>{response.reason}</p></div></div>}
              <div className="reflection-footer"><span className="small-text muted">{reflection.sample ? 'Demo' : 'Local feedback'}</span>{reflection.status === 'open' && <button className="text-button" disabled={!workshop.agenda.length} onClick={() => setReviewing(reflection)}>Respond<ChevronRight size={16} /></button>}</div>
            </article>
          })}
          {!visible.length && <div className="empty-state panel"><MessageCircle size={30} /><h3>{filter === 'open' ? 'All feedback reviewed' : filter === 'responded' ? 'No responses yet' : 'Add your first feedback'}</h3><p>{filter === 'all' ? 'Ask what helped or what should change.' : 'Feedback helps the plan improve.'}</p>{filter === 'all' && <button className="button primary" onClick={() => setAdding(true)}>Add feedback<Plus size={16} /></button>}</div>}
        </div>
        <div className="bottom-navigation"><button className="button secondary" onClick={() => onNavigate('plan')}>Back</button><button className="button primary" onClick={() => onNavigate('kit')}>Next: share<ArrowRight size={17} /></button></div>
      </div>
      <aside className="page-aside">
        <div className="panel listening-summary"><p className="eyebrow">FEEDBACK</p>{(Object.keys(kinds) as Reflection['kind'][]).map(kind => { const { Icon, color } = kinds[kind]; return <div className="listening-stat" key={kind}><span className={`principle-icon ${color}`}><Icon size={16} /></span><span>{kind === 'barrier' ? 'Barriers' : kind === 'worked' ? 'Keep' : 'Ideas'}</span><b>{workshop.reflections.filter(reflection => reflection.kind === kind).length}</b></div> })}<div className="care-divider" /><div className="respond-count"><b>{open}</b><span>awaiting a response</span></div></div>
        <div className="care-card small-care"><span className="care-icon"><Sprout size={24} /></span><h3>Act on what you hear.</h3><p>Make a change or explain what works.</p></div>
        <div className="aside-note"><SourceLinks ids={['voice', 'preserve']} /></div>
      </aside>
    </div>
    {adding && <ReflectionForm workshop={workshop} onClose={() => setAdding(false)} onSave={input => { onUpdate(addReflection(workshop, input)); setAdding(false); onNotify('Feedback saved.') }} />}
    {reviewing && <RespondDialog workshop={workshop} reflection={reviewing} onClose={() => setReviewing(null)} onSave={(activityId, reason, after) => { onUpdate(recordDecision(workshop, reviewing.id, activityId, reason, after)); setReviewing(null); onNotify(after ? 'Change saved.' : 'Response saved.') }} />}
  </div>
}
