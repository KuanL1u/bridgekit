export const CONTENT_VERSION = 'hack-pack-2026.1'
export const SCHEMA_VERSION = 1

export type AccessNeed = 'internet' | 'devices' | 'quiet' | 'language' | 'mobility'
export type PrincipleId = 'listen' | 'agency' | 'access' | 'community'
export type Screen = 'context' | 'plan' | 'reflect' | 'kit'

export interface WorkshopContext {
  title: string
  community: string
  location: string
  goal: string
  duration: number
  participants: number
  languages: string
  accessNeeds: AccessNeed[]
  materials: string[]
}

export interface Activity {
  id: string
  templateId: string
  title: string
  minutes: number
  instructions: string
  prompts: string[]
  alternative: string
  rationale: string
  principleId: PrincipleId
  sourceIds: string[]
  adaptation: string
}

export interface ActivityTemplate extends Omit<Activity, 'id' | 'adaptation'> {
  category: string
  materials: string[]
}

export interface Reflection {
  id: string
  activityId: string
  kind: 'barrier' | 'worked' | 'idea'
  observation: string
  suggestion: string
  createdAt: string
  status: 'open' | 'addressed' | 'acknowledged'
  sample: boolean
}

export interface Revision {
  id: string
  reflectionId: string
  decision: 'adapt' | 'keep'
  reason: string
  before: Activity
  after: Activity
  beforeVersion: number
  afterVersion: number
  createdAt: string
}

export interface WorkshopVersion {
  version: number
  agenda: Activity[]
  context: WorkshopContext
  reason: string
  kind: 'initial' | 'facilitator' | 'feedback'
  createdAt: string
}

export interface Workshop {
  id: string
  context: WorkshopContext
  agenda: Activity[]
  reflections: Reflection[]
  revisions: Revision[]
  versions: WorkshopVersion[]
  contentVersion: string
  createdAt: string
  updatedAt: string
  sample: boolean
  ready: boolean
  handoffNote: string
}

export interface Workspace {
  schemaVersion: number
  workshops: Workshop[]
}

export interface Source {
  id: string
  name: string
  section: string
  url: string
}
