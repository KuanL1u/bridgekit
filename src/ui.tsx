import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { sources } from './content'
import type { Screen, Workshop } from './types'

export interface ScreenProps {
  workshop: Workshop
  onUpdate: (workshop: Workshop) => void
  onNavigate: (screen: Screen) => void
  onNotify: (message: string, error?: boolean) => void
}

export function BridgeMark({ small = false }: { small?: boolean }) {
  return <span className={`bridge-mark ${small ? 'small' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 40 40" fill="none">
      <path d="M7 28V15M33 28V15M7 21c6 0 6-9 13-9s7 9 13 9M7 28h26M14 21v7m12-7v7m-6-13v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </span>
}

export function SourceLinks({ ids }: { ids: string[] }) {
  return <div className="source-links">{[...new Set(ids)].map(id => {
    const source = sources.find(item => item.id === id)
    const label = source ? `${source.name} · ${source.section}` : ''
    return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer" title={label} aria-label={label}>{id === 'brief' ? 'Challenge brief' : `Hack Pack ${source.section.split(' · ')[0]}`}<ArrowUpRight size={13} /></a>
      : <span key={id} title={id}>Source unavailable</span>
  })}</div>
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape: () => void) {
  const closeRef = useRef(onEscape)
  closeRef.current = onEscape
  useEffect(() => {
    if (!active || !ref.current) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const el = ref.current!
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex="0"]')).filter(item => item.getClientRects().length > 0)
    focusable()[0]?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
      if (event.key !== 'Tab') return
      const elements = focusable()
      const first = elements[0]
      const last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      previous?.focus()
    }
  }, [active, ref])
}

export function Modal({ title, eyebrow, children, onClose, wide = false }: { title: string; eyebrow?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true, onClose)
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={ref}>
      <div className="modal-heading">
        <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 id="modal-title">{title}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
}

export function CommunityArt({ compact = false }: { compact?: boolean }) {
  return <div className={`community-art ${compact ? 'compact' : ''}`} aria-hidden="true">
    <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
    <div className="art-person person-one"><i /><b /></div>
    <div className="art-person person-two"><i /><b /></div>
    <div className="art-person person-three"><i /><b /></div>
    <div className="art-person person-four"><i /><b /></div>
    <div className="art-center"><svg viewBox="0 0 50 50" fill="none"><path d="M15 26c-8-9 4-18 10-9 6-9 18 0 10 9L25 36 15 26Z" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" /></svg></div>
    <span className="art-dot dot-one" /><span className="art-dot dot-two" /><span className="art-spark">✳</span>
    {!compact && <><span className="art-label label-one">Every voice counts.</span><span className="art-label label-two">Make room.</span></>}
  </div>
}

export function WorkshopArt({ variant = 0 }: { variant?: number }) {
  return <div className={`workshop-art art-variant-${variant % 3}`} aria-hidden="true">
    <div className="workshop-arch arch-one" /><div className="workshop-arch arch-two" /><div className="workshop-arch arch-three" />
    <div className="workshop-sun" /><span className="workshop-art-star">✳</span><span className="workshop-line" />
  </div>
}
