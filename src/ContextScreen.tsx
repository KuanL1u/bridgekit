import { useState } from 'react'
import { ArrowRight, Check, Globe2, HeartHandshake, Sparkles } from 'lucide-react'
import { accessOptions, sampleContext } from './content'
import { buildPlan, checkpoint } from './workshops'
import { SourceLinks } from './ui'
import type { ScreenProps } from './ui'
import type { WorkshopContext } from './types'

export default function ContextScreen({ workshop, onUpdate, onNavigate, onNotify }: ScreenProps) {
  const [context, setContext] = useState(workshop.context)
  const [groupSize, setGroupSize] = useState(String(workshop.context.participants))
  const change = <K extends keyof WorkshopContext>(key: K, value: WorkshopContext[K]) => {
    const next = { ...context, [key]: value }
    setContext(next)
    onUpdate({ ...workshop, context: next, ready: false, updatedAt: new Date().toISOString() })
  }
  const useExample = () => {
    const next = { ...sampleContext, accessNeeds: ['internet' as const], materials: ['Paper & pens', 'Shared screen'] }
    setContext(next)
    setGroupSize(String(next.participants))
    onUpdate({ ...workshop, context: next, ready: false, updatedAt: new Date().toISOString() })
    onNotify('Example context added. Make it your own.')
  }
  return <div className="screen-enter">
    <div className="screen-intro">
      <p className="eyebrow"><span className="tiny-dot" /> 01 / GET TO KNOW YOUR COMMUNITY</p>
      <h1>Every community<br /><em>is a little different.</em></h1>
      <p>Tell us a little about your group. Together, we’ll make a plan that leaves room for the people in it.</p>
    </div>
    <div className="content-with-aside">
      <form className="panel context-panel" onSubmit={event => {
        event.preventDefault()
        const normalized = { ...context, title: context.title.trim(), languages: context.languages.trim(), participants: Number(groupSize) }
        if (!normalized.title) { onNotify('Give this workshop a name.', true); return }
        if (!normalized.languages) { onNotify('Name the languages the group will use.', true); return }
        const next = workshop.agenda.length
          ? checkpoint({ ...workshop, context: normalized }, 'Updated the community context')
          : buildPlan(workshop, normalized)
        onUpdate(next)
        onNavigate('plan')
        onNotify(workshop.agenda.length ? 'Community context updated. Your activity edits are kept.' : 'Your first plan is ready to make your own.')
      }}>
        <div className="panel-title"><Globe2 size={20} /><h2>The people and the place</h2></div>
        <label className="field">Workshop name <span className="required">*</span>
          <input required maxLength={180} value={context.title} onChange={event => change('title', event.target.value)} placeholder="e.g. A more welcoming campus" />
        </label>
        <div className="field-row">
          <label className="field">Community or group
            <input maxLength={180} value={context.community} onChange={event => change('community', event.target.value)} placeholder="e.g. Community college design club" />
          </label>
          <label className="field">Location
            <input maxLength={180} value={context.location} onChange={event => change('location', event.target.value)} placeholder="e.g. Oakland, California" />
          </label>
        </div>
        <label className="field">What would your group like to explore?
          <textarea maxLength={3000} rows={3} value={context.goal} onChange={event => change('goal', event.target.value)} placeholder="A question, an everyday friction, or something you’re curious about together…" />
          <span className="field-hint">Keep this open. The people in the room can help define the concern.</span>
        </label>
        <div className="field-row three">
          <label className="field">Time together
            <select value={context.duration} onChange={event => change('duration', Number(event.target.value))}>
              {[45, 60, 75, 90, 120, 180].map(value => <option key={value} value={value}>{value} minutes</option>)}
            </select>
          </label>
          <label className="field">Group size
            <input type="number" required min={1} max={200} value={groupSize} onChange={event => {
              setGroupSize(event.target.value)
              const count = Number(event.target.value)
              if (Number.isInteger(count) && count >= 1 && count <= 200) change('participants', count)
            }} />
          </label>
          <label className="field">Languages used
            <input required maxLength={180} value={context.languages} onChange={event => change('languages', event.target.value)} placeholder="e.g. English, Spanish" />
          </label>
        </div>
        <div className="form-section">
          <h3>Make room for participation</h3>
          <p className="muted">What should the session take into account? Ask your group as you go.</p>
          <div className="access-options">
            {accessOptions.map(option => <label className={`access-option ${context.accessNeeds.includes(option.id) ? 'selected' : ''}`} key={option.id}>
              <input type="checkbox" checked={context.accessNeeds.includes(option.id)} onChange={() => change('accessNeeds', context.accessNeeds.includes(option.id) ? context.accessNeeds.filter(value => value !== option.id) : [...context.accessNeeds, option.id])} />
              <span className="check-box" aria-hidden="true">{context.accessNeeds.includes(option.id) && <Check size={13} />}</span>
              <span><b>{option.label}</b><small>{option.description}</small></span>
            </label>)}
          </div>
        </div>
        <fieldset className="form-section materials">
          <legend>What’s available?</legend>
          <div className="choice-chips">
            {['Paper & pens', 'Shared screen', 'Personal devices', 'Open space'].map(material => <label className={`choice-chip ${context.materials.includes(material) ? 'selected' : ''}`} key={material}>
              <input type="checkbox" checked={context.materials.includes(material)} onChange={() => change('materials', context.materials.includes(material) ? context.materials.filter(item => item !== material) : [...context.materials, material])} />
              {context.materials.includes(material) && <Check size={13} />} {material}
            </label>)}
          </div>
        </fieldset>
        <div className="form-actions"><button className="text-button" type="button" onClick={useExample}><Sparkles size={15} /> Use an example</button><button className="button primary" type="submit">{workshop.agenda.length ? 'Save context & continue' : 'Create my workshop plan'}<ArrowRight size={17} /></button></div>
      </form>
      <aside className="page-aside">
        <div className="care-card"><span className="care-icon"><HeartHandshake size={24} /></span><p className="eyebrow">A SMALL REMINDER</p><h3>You don’t have to<br />have all the answers.</h3><p>A thoughtful session begins with curiosity. Leave space for your community to surprise you.</p><div className="care-divider" /><p className="care-question">“Whose perspective haven’t we heard yet?”</p><small>A reflection inspired by the BRIDGEGOOD Hack Pack.</small></div>
        <div className="aside-note"><h4>Grounded in BRIDGEGOOD</h4><p>These draft activities carry the philosophy into practice. Local knowledge and human judgment shape what happens next.</p><SourceLinks ids={['understand', 'prompts']} /></div>
      </aside>
    </div>
  </div>
}
