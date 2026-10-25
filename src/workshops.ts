import { activityTemplates, blankContext, sampleContext } from './content'
import { CONTENT_VERSION, SCHEMA_VERSION } from './types'
import type { Activity, ActivityTemplate, Reflection, Workshop, WorkshopContext, Workspace } from './types'

export const STORAGE_KEY = 'bridgekit.workspace.v1'
export const RECOVERY_KEY = 'bridgekit.workspace.recovery'
export const MAX_IMPORT_BYTES = 1_000_000

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()
const copy = <T,>(value: T): T => structuredClone(value)

export function totalMinutes(agenda: Activity[]) {
  return agenda.reduce((sum, activity) => sum + activity.minutes, 0)
}

export function instantiate(template: ActivityTemplate): Activity {
  const { category: _category, materials: _materials, ...activity } = template
  return { ...copy(activity), id: uid(), adaptation: '' }
}

export function generateAgenda(context: WorkshopContext): Activity[] {
  const offline = context.accessNeeds.includes('internet') || context.accessNeeds.includes('devices') || !context.materials.includes('Personal devices')
  const ids = ['welcome', 'listen', 'voices', offline ? 'paper' : 'ideas', 'success', 'reflect']
  if (context.accessNeeds.includes('quiet')) ids.splice(1, 0, 'quiet')
  const agenda = ids.map(id => instantiate(activityTemplates.find(activity => activity.templateId === id)!))
  const budget = context.duration - 5
  const originalTotal = totalMinutes(agenda)
  if (originalTotal > budget) {
    const minimum = 5
    const remaining = budget - agenda.length * minimum
    const weights = agenda.map(activity => activity.minutes - minimum)
    const weightTotal = weights.reduce((sum, value) => sum + value, 0)
    const allocations = weights.map(weight => minimum + (weightTotal ? remaining * weight / weightTotal : remaining / agenda.length))
    agenda.forEach((activity, index) => { activity.minutes = Math.floor(allocations[index]) })
    const remainder = budget - totalMinutes(agenda)
    const indices = allocations.map((value, index) => ({ index, fraction: value % 1 })).sort((a, b) => b.fraction - a.fraction)
    for (let i = 0; i < remainder; i++) agenda[indices[i].index].minutes++
  }
  if (offline) {
    agenda.find(activity => activity.templateId === 'paper')!.adaptation = 'A paper-first format fits this group’s devices and internet access.'
  }
  return agenda
}

export function createWorkshop(context: WorkshopContext = blankContext, sample = false): Workshop {
  const timestamp = now()
  return {
    id: uid(),
    context: copy(context),
    agenda: [],
    reflections: [],
    revisions: [],
    versions: [],
    contentVersion: CONTENT_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    sample,
    ready: false,
    handoffNote: '',
  }
}

export function hasDraftChanges(workshop: Workshop) {
  const latest = workshop.versions.at(-1)
  return !latest || JSON.stringify(latest.agenda) !== JSON.stringify(workshop.agenda) || JSON.stringify(latest.context) !== JSON.stringify(workshop.context)
}

export function checkpoint(workshop: Workshop, reason = 'Facilitator adapted the plan'): Workshop {
  if (!hasDraftChanges(workshop)) return workshop
  const timestamp = now()
  return {
    ...workshop,
    updatedAt: timestamp,
    ready: false,
    versions: [...workshop.versions, {
      version: workshop.versions.length + 1,
      context: copy(workshop.context),
      agenda: copy(workshop.agenda),
      reason,
      kind: workshop.versions.length ? 'facilitator' : 'initial',
      createdAt: timestamp,
    }],
  }
}

export function buildPlan(workshop: Workshop, context = workshop.context): Workshop {
  if (!isContext(context) || !context.title.trim()) throw new Error('Add a workshop name and a valid community context before creating the plan.')
  const before = workshop.agenda.length ? checkpoint(workshop) : workshop
  return checkpoint({
    ...before,
    context: copy(context),
    agenda: generateAgenda(context),
    ready: false,
  }, workshop.agenda.length ? 'Rebuilt the agenda for this community' : 'First plan, grounded in the BRIDGEGOOD Hack Pack')
}

export function addReflection(
  workshop: Workshop,
  input: Pick<Reflection, 'activityId' | 'kind' | 'observation' | 'suggestion'>,
  sample = false,
): Workshop {
  if (!input.observation.trim() && !input.suggestion.trim()) throw new Error('Add an observation or a suggestion so there is something to respond to.')
  return {
    ...workshop,
    updatedAt: now(),
    ready: false,
    reflections: [...workshop.reflections, { ...input, id: uid(), createdAt: now(), status: 'open', sample }],
  }
}

export function recordDecision(
  workshop: Workshop,
  reflectionId: string,
  activityId: string,
  reason: string,
  after?: Activity,
): Workshop {
  if (!reason.trim()) throw new Error('Explain the decision so the next facilitator can understand it.')
  if (after && !isActivity(after)) throw new Error('Add a valid activity name, duration, and instructions.')
  const reflection = workshop.reflections.find(item => item.id === reflectionId)
  const before = workshop.agenda.find(item => item.id === activityId)
  if (!reflection || !before) throw new Error('Choose an activity that is still in the workshop.')
  if (reflection.status !== 'open') throw new Error('This reflection already has a response.')
  if (after && JSON.stringify({ ...after, id: before.id }) === JSON.stringify(before)) {
    throw new Error('Change the activity, or choose to keep the current approach.')
  }
  let next = checkpoint(workshop)
  const beforeVersion = next.versions.length
  const changed = after ? { ...copy(after), id: before.id, adaptation: reason.trim() } : copy(before)
  if (after) {
    next = {
      ...next,
      agenda: next.agenda.map(activity => activity.id === activityId ? changed : activity),
      ready: false,
    }
    const timestamp = now()
    next = {
      ...next,
      versions: [...next.versions, {
        version: next.versions.length + 1,
        agenda: copy(next.agenda),
        context: copy(next.context),
        reason: reason.trim(),
        kind: 'feedback',
        createdAt: timestamp,
      }],
    }
  }
  return {
    ...next,
    updatedAt: now(),
    reflections: next.reflections.map(item => item.id === reflectionId ? { ...item, status: after ? 'addressed' : 'acknowledged' } : item),
    revisions: [...next.revisions, {
      id: uid(),
      reflectionId,
      decision: after ? 'adapt' : 'keep',
      reason: reason.trim(),
      before: copy(before),
      after: changed,
      beforeVersion,
      afterVersion: next.versions.length,
      createdAt: now(),
    }],
  }
}

export function createSample(): Workshop {
  let workshop = buildPlan(createWorkshop(sampleContext, true))
  const ideas = workshop.agenda.find(activity => activity.templateId === 'ideas')!
  const listen = workshop.agenda.find(activity => activity.templateId === 'listen')!
  workshop = addReflection(workshop, {
    activityId: ideas.id,
    kind: 'barrier',
    observation: 'The shared digital board was hard to join without a reliable phone or data connection.',
    suggestion: 'Could we collect ideas on paper and read them aloud so everyone can contribute?',
  }, true)
  workshop = addReflection(workshop, {
    activityId: listen.id,
    kind: 'worked',
    observation: 'Being listened to in a pair helped people take part before the full group discussion.',
    suggestion: 'Keep the time in pairs in the next session.',
  }, true)
  workshop = addReflection(workshop, {
    activityId: '',
    kind: 'idea',
    observation: 'Some people wanted more thinking time before speaking.',
    suggestion: 'Offer a short quiet moment at the start of each activity.',
  }, true)
  return workshop
}

export function initialWorkspace(): Workspace {
  return { schemaVersion: SCHEMA_VERSION, workshops: [createSample()] }
}

export function workshopStatus(workshop: Workshop) {
  if (workshop.ready && !hasDraftChanges(workshop)) return 'Ready to pass on'
  if (workshop.reflections.length) return 'Listening & adapting'
  if (workshop.agenda.length) return 'Plan ready'
  return 'Draft'
}

export function contextGuidance(context: WorkshopContext): string[] {
  const notes: string[] = []
  if (context.accessNeeds.includes('language') || !/^english$/i.test(context.languages.trim())) {
    notes.push('Drafts are in English. Prepare translations with your group.')
  }
  if (context.accessNeeds.includes('mobility')) notes.push('Ask which seated, spoken, or sensory options the group needs.')
  if (!context.materials.includes('Paper & pens')) notes.push('Bring paper or offer a spoken alternative.')
  return notes
}

export function makeKit(workshop: Workshop, includeSummary = false) {
  const prepared = checkpoint(workshop, 'Prepared the kit for another facilitator')
  return {
    format: 'bridgekit-kit',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now(),
    attribution: 'BridgeKit is a hackathon prototype inspired by BRIDGEGOOD’s Design for Social Good philosophy. Activities are draft adaptations of the BRIDGEGOOD Hack Pack, not official program materials.',
    workshop: {
      ...copy(prepared),
      reflections: [],
      handoffNote: includeSummary ? prepared.handoffNote : '',
      revisions: prepared.revisions.map(revision => ({ ...copy(revision), reflectionId: '' })),
    },
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
const string = (value: unknown, max = 10_000): value is string => typeof value === 'string' && value.length <= max
const number = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
const list = <T,>(value: unknown, guard: (entry: unknown) => entry is T, max = 200): value is T[] => Array.isArray(value) && value.length <= max && value.every(guard)
const strings = (value: unknown) => list(value, (item): item is string => string(item, 300), 40)

function isContext(value: unknown): value is WorkshopContext {
  return record(value) && string(value.title, 180) && string(value.community, 180) && string(value.location, 180)
    && string(value.goal, 3000) && number(value.duration, 45, 180) && number(value.participants, 1, 200)
    && string(value.languages, 180) && strings(value.materials)
    && list(value.accessNeeds, (need): need is WorkshopContext['accessNeeds'][number] => typeof need === 'string' && ['internet', 'devices', 'quiet', 'language', 'mobility'].includes(need), 5)
}

function isActivity(value: unknown): value is Activity {
  return record(value) && string(value.id, 100) && string(value.templateId, 100) && string(value.title, 180) && !!value.title.trim()
    && number(value.minutes, 1, 180) && string(value.instructions) && !!value.instructions.trim() && strings(value.prompts)
    && string(value.alternative) && string(value.rationale) && string(value.adaptation)
    && typeof value.principleId === 'string' && ['listen', 'agency', 'access', 'community'].includes(value.principleId) && strings(value.sourceIds)
}

function isReflection(value: unknown): value is Reflection {
  return record(value) && string(value.id, 100) && string(value.activityId, 100) && string(value.observation, 3000)
    && string(value.suggestion, 3000) && string(value.createdAt, 100) && typeof value.sample === 'boolean'
    && typeof value.kind === 'string' && ['barrier', 'worked', 'idea'].includes(value.kind)
    && typeof value.status === 'string' && ['open', 'addressed', 'acknowledged'].includes(value.status)
}

function isWorkshop(value: unknown): value is Workshop {
  if (!record(value) || !string(value.id, 100) || !isContext(value.context)
    || !list(value.agenda, isActivity, 40) || !list(value.reflections, isReflection, 500)
    || !string(value.createdAt, 100) || !string(value.updatedAt, 100) || !string(value.contentVersion, 100)
    || !string(value.handoffNote, 3000) || typeof value.sample !== 'boolean' || typeof value.ready !== 'boolean') return false
  if (!list(value.versions, (version): version is Workshop['versions'][number] =>
    record(version) && number(version.version, 1, 1000) && isContext(version.context) && list(version.agenda, isActivity, 40)
      && string(version.reason) && string(version.createdAt, 100) && typeof version.kind === 'string' && ['initial', 'facilitator', 'feedback'].includes(version.kind), 1000)) return false
  if (!list(value.revisions, (revision): revision is Workshop['revisions'][number] =>
    record(revision) && string(revision.id, 100) && string(revision.reflectionId, 100) && string(revision.reason)
      && string(revision.createdAt, 100) && isActivity(revision.before) && isActivity(revision.after)
      && number(revision.beforeVersion, 1, 1000) && number(revision.afterVersion, 1, 1000)
      && typeof revision.decision === 'string' && ['adapt', 'keep'].includes(revision.decision), 500)) return false
  if (value.versions.some((version, index) => version.version !== index + 1)) return false
  return new Set(value.agenda.map(activity => activity.id)).size === value.agenda.length
}

export function parseWorkspace(text: string): Workspace {
  const value: unknown = JSON.parse(text)
  if (!record(value) || value.schemaVersion !== SCHEMA_VERSION || !list(value.workshops, isWorkshop, 100)) {
    throw new Error('This saved workspace uses an unsupported or incomplete format.')
  }
  if (new Set(value.workshops.map(workshop => workshop.id)).size !== value.workshops.length) throw new Error('Duplicate workshop identifiers in saved data.')
  return value as unknown as Workspace
}

export function parseKit(text: string): Workshop {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('Choose a BridgeKit file smaller than 1 MB.')
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('This file is not valid JSON. Choose a kit downloaded from BridgeKit.') }
  if (!record(value) || value.format !== 'bridgekit-kit' || value.schemaVersion !== SCHEMA_VERSION || !isWorkshop(value.workshop)) {
    throw new Error('This is not a supported BridgeKit kit. Your existing workshops have not been changed.')
  }
  // Imported kits always become a new workshop; shared files do not inject raw responses.
  const workshop = copy(value.workshop)
  return { ...workshop, id: uid(), reflections: [], revisions: workshop.revisions.map(revision => ({ ...revision, reflectionId: '' })), updatedAt: now() }
}

export function loadWorkspace(storage: Pick<Storage, 'getItem' | 'setItem'>): { workspace: Workspace; warning: string; canSave: boolean; recovery: string | null } {
  let raw: string | null
  try { raw = storage.getItem(STORAGE_KEY) } catch {
    return { workspace: initialWorkspace(), warning: 'Browser storage is unavailable. Download your kit before closing this tab.', canSave: false, recovery: null }
  }
  if (!raw) return { workspace: initialWorkspace(), warning: '', canSave: true, recovery: null }
  try { return { workspace: parseWorkspace(raw), warning: '', canSave: true, recovery: null } } catch {
    try {
      storage.setItem(RECOVERY_KEY, raw)
      return { workspace: { schemaVersion: SCHEMA_VERSION, workshops: [] }, warning: 'Your saved workspace could not be loaded. Its original data is preserved in a recovery copy.', canSave: true, recovery: raw }
    } catch {
      return { workspace: { schemaVersion: SCHEMA_VERSION, workshops: [] }, warning: 'Your saved workspace could not be loaded. Download the original data for recovery; new work cannot be saved here.', canSave: false, recovery: raw }
    }
  }
}

export function downloadFile(contents: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function kitFilename(workshop: Workshop) {
  return `${workshop.context.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workshop'}-bridgekit.json`
}
