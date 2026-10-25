import { describe, expect, it } from 'vitest'
import { activityTemplates, sampleContext } from './content'
import { SCHEMA_VERSION } from './types'
import { addReflection, buildPlan, checkpoint, createSample, createWorkshop, generateAgenda, hasDraftChanges, instantiate, loadWorkspace, makeKit, parseKit, parseWorkspace, RECOVERY_KEY, recordDecision, STORAGE_KEY, totalMinutes } from './workshops'

describe('planning for a community', () => {
  it('fits all supported durations and keeps breathing room, including quiet reflection', () => {
    for (const duration of [45, 60, 75, 90, 120, 180]) {
      const agenda = generateAgenda({ ...sampleContext, duration, accessNeeds: ['quiet', 'internet'] })
      expect(totalMinutes(agenda)).toBeLessThanOrEqual(duration - 5)
      expect(agenda.every(activity => activity.minutes >= 5)).toBe(true)
      expect(agenda.some(activity => activity.templateId === 'quiet')).toBe(true)
      expect(agenda.some(activity => activity.templateId === 'paper')).toBe(true)
      expect(agenda.some(activity => activity.templateId === 'ideas')).toBe(false)
    }
  })

  it('offers paper activities when personal devices are unavailable', () => {
    const agenda = generateAgenda({ ...sampleContext, materials: ['Paper & pens'] })
    expect(agenda.find(activity => activity.templateId === 'paper')?.adaptation).toContain('devices')
  })

  it('creates independent activity instances so editing cannot change the library', () => {
    const agenda = generateAgenda(sampleContext)
    agenda[0].prompts.push('A local question')
    expect(activityTemplates[0].prompts).not.toContain('A local question')
    expect(generateAgenda(sampleContext)[0].id).not.toBe(agenda[0].id)
  })
})

describe('feedback and version history', () => {
  it('preserves the exact activity before a change, including a facilitator’s unsnapshotted edit', () => {
    const original = createSample()
    const reflection = original.reflections[0]
    const edited = { ...original, agenda: original.agenda.map(activity => activity.id === reflection.activityId ? { ...activity, instructions: 'A locally edited original instruction.' } : activity) }
    const after = instantiate(activityTemplates.find(activity => activity.templateId === 'paper')!)
    const result = recordDecision(edited, reflection.id, reflection.activityId, 'Paper makes participation possible without a data connection.', after)
    expect(result.versions).toHaveLength(3)
    expect(result.versions[0].agenda).toEqual(original.agenda)
    expect(result.versions[1].agenda).toEqual(edited.agenda)
    expect(result.revisions[0].before.instructions).toBe('A locally edited original instruction.')
    expect(result.revisions[0].after.title).toBe('Paper-first idea studio')
    expect(result.revisions[0].after.id).toBe(reflection.activityId)
    expect(result.reflections[0].status).toBe('addressed')
    expect(result.versions[2].kind).toBe('feedback')
    expect(original.reflections[0].status).toBe('open')
  })

  it('records a reason for keeping the approach without inventing a changed version', () => {
    const original = createSample()
    const reflection = original.reflections[1]
    const result = recordDecision(original, reflection.id, reflection.activityId, 'Keep paired listening because the group found it helpful.')
    expect(result.versions).toHaveLength(1)
    expect(result.agenda).toEqual(original.agenda)
    expect(result.reflections[1].status).toBe('acknowledged')
    expect(result.revisions[0].decision).toBe('keep')
  })

  it('opens a ready kit to new listening when another reflection arrives', () => {
    const ready = { ...createSample(), ready: true }
    const result = addReflection(ready, { activityId: '', kind: 'idea', observation: 'More thinking time would help.', suggestion: '' })
    expect(result.ready).toBe(false)
  })

  it('rejects incomplete decisions and repeated responses', () => {
    const workshop = createSample()
    const reflection = workshop.reflections[0]
    expect(() => recordDecision(workshop, reflection.id, reflection.activityId, '  ')).toThrow('Explain')
    const result = recordDecision(workshop, reflection.id, reflection.activityId, 'Keep this format after discussing the alternative.')
    expect(() => recordDecision(result, reflection.id, reflection.activityId, 'Another response')).toThrow('already')
  })

  it('preserves earlier plans when rebuilding for a changed community context', () => {
    const original = buildPlan(createWorkshop(sampleContext))
    const rebuilt = buildPlan(original, { ...sampleContext, accessNeeds: ['internet'], duration: 60 })
    expect(rebuilt.versions[0].agenda).toEqual(original.agenda)
    expect(rebuilt.versions[1].context.duration).toBe(60)
    expect(totalMinutes(rebuilt.agenda)).toBeLessThanOrEqual(55)
  })

  it('only creates snapshots for changed content, not simply navigating the app', () => {
    const original = createSample()
    expect(hasDraftChanges(original)).toBe(false)
    expect(checkpoint(original)).toBe(original)
    expect(checkpoint({ ...original, context: { ...original.context, title: 'A changed title' } }).versions).toHaveLength(2)
  })
})

describe('portable kits and storage', () => {
  it('excludes raw participant responses and optional notes from shared files by default', () => {
    let workshop = buildPlan(createWorkshop(sampleContext))
    workshop = addReflection(workshop, { activityId: '', kind: 'barrier', observation: 'PRIVATE-RESPONSE-SENTINEL', suggestion: 'PRIVATE-SUGGESTION-SENTINEL' })
    workshop.handoffNote = 'OPTIONAL-SUMMARY-SENTINEL'
    const serialized = JSON.stringify(makeKit(workshop))
    expect(serialized).not.toContain('PRIVATE-RESPONSE-SENTINEL')
    expect(serialized).not.toContain('PRIVATE-SUGGESTION-SENTINEL')
    expect(serialized).not.toContain('OPTIONAL-SUMMARY-SENTINEL')
    expect(JSON.stringify(makeKit(workshop, true))).toContain('OPTIONAL-SUMMARY-SENTINEL')
  })

  it('round trips a revised kit without replacing the original or reintroducing responses', () => {
    const workshop = createSample()
    const reflection = workshop.reflections[0]
    const revised = recordDecision(workshop, reflection.id, reflection.activityId, 'Choose paper for this group.', instantiate(activityTemplates.find(activity => activity.templateId === 'paper')!))
    const restored = parseKit(JSON.stringify(makeKit(revised)))
    expect(restored.id).not.toBe(workshop.id)
    expect(restored.agenda).toEqual(revised.agenda)
    expect(restored.versions).toEqual(revised.versions)
    expect(restored.reflections).toEqual([])
    expect(restored.revisions[0].reflectionId).toBe('')
  })

  it('rejects invalid files, future formats, duplicate activities, and broken snapshots', () => {
    expect(() => parseKit('not json')).toThrow('valid JSON')
    const kit = makeKit(createSample())
    expect(() => parseKit(JSON.stringify({ ...kit, schemaVersion: 999 }))).toThrow('supported')
    const duplicated = structuredClone(kit)
    duplicated.workshop.agenda.push(duplicated.workshop.agenda[0])
    expect(() => parseKit(JSON.stringify(duplicated))).toThrow('supported')
    const malformed = structuredClone(kit)
    malformed.workshop.versions[0].version = 7
    expect(() => parseKit(JSON.stringify(malformed))).toThrow('supported')
    const malformedEnum = JSON.parse(JSON.stringify(kit))
    malformedEnum.workshop.agenda[0].principleId = ['listen']
    expect(() => parseKit(JSON.stringify(malformedEnum))).toThrow('supported')
  })

  it('round trips all the local workflow data, including private responses', () => {
    const workspace = { schemaVersion: SCHEMA_VERSION, workshops: [createSample()] }
    expect(parseWorkspace(JSON.stringify(workspace))).toEqual(workspace)
  })

  it('preserves malformed saved data in a recoverable copy before allowing new saves', () => {
    const data = new Map([[STORAGE_KEY, '{"broken":true}']])
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
    const result = loadWorkspace(storage)
    expect(result.workspace.workshops).toEqual([])
    expect(result.recovery).toBe('{"broken":true}')
    expect(data.get(RECOVERY_KEY)).toBe('{"broken":true}')
    expect(result.canSave).toBe(true)
  })

  it('keeps corrupt data untouched if a recovery copy cannot be written', () => {
    const storage = { getItem: () => 'corrupt original', setItem: () => { throw new Error('full') } }
    const result = loadWorkspace(storage)
    expect(result.canSave).toBe(false)
    expect(result.recovery).toBe('corrupt original')
  })
})
