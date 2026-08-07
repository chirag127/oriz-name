import { useCallback, useMemo, useRef, useState } from 'react'
import {
  generateNames,
  KINDS,
  VIBES,
  type NameKind,
  type NameResult,
  type Vibe,
} from '../lib/generate'
import { estimateAvailability } from '../lib/availability'

type AiState = 'idle' | 'thinking' | 'done' | 'error'

const VIBE_LABEL: Record<Vibe, string> = {
  techy: 'Techy',
  playful: 'Playful',
  luxe: 'Luxe',
  minimal: 'Minimal',
  retro: 'Retro',
  organic: 'Organic',
  edgy: 'Edgy',
  friendly: 'Friendly',
}
const KIND_LABEL: Record<NameKind, string> = {
  brand: 'Brand',
  product: 'Product',
  startup: 'Startup',
  username: 'Username',
  repo: 'Repo',
}

interface AiPick {
  name: string
  tagline: string
  why: string
}

export default function Generator() {
  const [keywords, setKeywords] = useState('')
  const [vibe, setVibe] = useState<Vibe>('retro')
  const [kind, setKind] = useState<NameKind>('startup')
  const [maxLen, setMaxLen] = useState(14)
  const [results, setResults] = useState<NameResult[]>([])
  const [selected, setSelected] = useState<NameResult | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [seed, setSeed] = useState(0)

  const [ai, setAi] = useState<AiState>('idle')
  const [aiPicks, setAiPicks] = useState<AiPick[]>([])
  const [aiErr, setAiErr] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const kwList = useMemo(
    () =>
      keywords
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [keywords],
  )

  const spin = useCallback(() => {
    const nextSeed = (Date.now() ^ (Math.random() * 1e9)) >>> 0
    setSeed(nextSeed)
    setSpinning(true)
    setSelected(null)
    const out = generateNames({
      keywords: kwList,
      vibe,
      kind,
      count: 15,
      maxLen,
      seed: nextSeed,
    })
    // slot-machine reveal: stagger in
    setResults([])
    let i = 0
    const tick = () => {
      i++
      setResults(out.slice(0, i))
      if (i < out.length) {
        window.setTimeout(tick, 55)
      } else {
        setSpinning(false)
      }
    }
    window.setTimeout(tick, 120)
  }, [kwList, vibe, kind, maxLen])

  const runAi = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setAi('thinking')
    setAiErr('')
    setAiPicks([])
    try {
      // lazy-load the AI package only when the user asks for it
      const { complete } = await import('@chirag127/oz-ai')
      const brief = kwList.length ? kwList.join(', ') : '(none given)'
      const prompt = `Invent 5 original ${kind} names.
Vibe: ${vibe}. Keywords: ${brief}. Max ${maxLen} chars, easy to say, brandable.
Return ONLY minified JSON array, no prose:
[{"name":"","tagline":"(<=6 words)","why":"(<=14 words)"}]`
      const raw = await complete(prompt, {
        system:
          'You are a world-class brand naming expert. Output strict JSON only. No markdown fences.',
        signal: ctrl.signal,
        temperature: 0.9,
      })
      const json = raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)
      const parsed = JSON.parse(json) as AiPick[]
      const clean = parsed
        .filter((p) => p && p.name)
        .slice(0, 6)
        .map((p) => ({
          name: String(p.name).slice(0, 24),
          tagline: String(p.tagline ?? ''),
          why: String(p.why ?? ''),
        }))
      if (!clean.length) throw new Error('empty')
      setAiPicks(clean)
      setAi('done')
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setAiErr('AI providers are all busy — the generator above still works.')
      setAi('error')
    }
  }, [kwList, vibe, kind, maxLen])

  const avail = selected ? estimateAvailability(selected.name) : null

  return (
    <section className="gen">
      <div className="marquee-frame gen__controls">
        <div className="gen__row">
          <label className="gen__label">
            Keywords <span className="gen__hint">optional — comma or space</span>
            <input
              className="field"
              placeholder="e.g. spark, flow, orbit"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && spin()}
              aria-label="Keywords"
            />
          </label>
        </div>

        <div className="gen__row gen__row--wrap">
          <fieldset className="chips" aria-label="Vibe">
            <legend className="gen__legend">Vibe</legend>
            {VIBES.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip ${vibe === v ? 'chip--on' : ''}`}
                aria-pressed={vibe === v}
                onClick={() => setVibe(v)}
              >
                {VIBE_LABEL[v]}
              </button>
            ))}
          </fieldset>
        </div>

        <div className="gen__row gen__row--wrap">
          <fieldset className="chips" aria-label="Kind">
            <legend className="gen__legend">For a</legend>
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                className={`chip ${kind === k ? 'chip--on' : ''}`}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </fieldset>

          <label className="gen__len">
            Max length: <b>{maxLen}</b>
            <input
              type="range"
              min={5}
              max={20}
              value={maxLen}
              onChange={(e) => setMaxLen(Number(e.target.value))}
              aria-label="Maximum name length"
            />
          </label>
        </div>

        <div className="gen__actions">
          <button className="btn btn--primary" onClick={spin} disabled={spinning}>
            {spinning ? 'Lighting up…' : results.length ? 'Spin again' : 'Generate names'}
          </button>
          <button className="btn btn--ghost" onClick={runAi} disabled={ai === 'thinking'}>
            {ai === 'thinking' ? 'AI thinking…' : '✦ AI names + taglines'}
          </button>
        </div>
      </div>

      {ai !== 'idle' && (
        <div className="ai" aria-live="polite">
          {ai === 'thinking' && (
            <p className="ai__status neon neon--violet neon--flicker">summoning the muse…</p>
          )}
          {ai === 'error' && <p className="ai__err">{aiErr}</p>}
          {ai === 'done' && (
            <div className="ai__grid">
              {aiPicks.map((p, i) => {
                const a = estimateAvailability(p.name)
                return (
                  <article key={i} className="ai__card">
                    <h3 className="neon neon--amber ai__name">{p.name}</h3>
                    {p.tagline && <p className="ai__tag">“{p.tagline}”</p>}
                    {p.why && <p className="ai__why">{p.why}</p>}
                    <span className={`pill pill--${bucket(a.likelihood)}`}>{a.label}</span>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="slot" role="list" aria-label="Generated names">
          {results.map((r, i) => (
            <button
              key={r.name}
              role="listitem"
              className={`slot-cell ${selected?.name === r.name ? 'slot-cell--on' : ''}`}
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => setSelected(r)}
              title="Click for availability + how it was made"
            >
              <span className="neon slot-cell__name">{r.name}</span>
              <span className="slot-cell__meta">
                <span className="slot-cell__handle">{r.handle}</span>
                <span className={`pill pill--${bucket(r.score)}`}>{r.score}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && avail && (
        <div className="detail marquee-frame" aria-live="polite">
          <button className="detail__close" onClick={() => setSelected(null)} aria-label="Close">
            ×
          </button>
          <h2 className="neon neon--cyan detail__name">{selected.name}</h2>
          <p className="detail__handle">
            {selected.handle}
            <button
              className="btn btn--ghost detail__copy"
              onClick={() => navigator.clipboard?.writeText(selected.name)}
            >
              Copy
            </button>
          </p>

          <div className="detail__grid">
            <div>
              <h4 className="detail__h">Availability heuristic</h4>
              <div className="meter" aria-label={`Likely free: ${avail.likelihood}%`}>
                <div className="meter__fill" style={{ width: `${avail.likelihood}%` }} />
              </div>
              <p className={`pill pill--${bucket(avail.likelihood)} detail__label`}>
                {avail.label} · {avail.likelihood}% likely free
              </p>
              <ul className="detail__reasons">
                {avail.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <p className="detail__note">Heuristic only — no live WHOIS. Verify:</p>
              <div className="detail__links">
                {avail.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="detail__h">How this name was made</h4>
              <p className="detail__tech">{selected.technique}</p>
              <p className="detail__score">
                Brandability score <b>{selected.score}</b>/100 — from length, vowel balance,
                pronounceability + spelling.
              </p>
            </div>
          </div>
        </div>
      )}

      {results.length === 0 && ai === 'idle' && (
        <p className="empty">
          Pick a vibe, drop a keyword or two, and hit <b>Generate</b>. The sign lights up with
          fresh names — click any bulb for availability + the trick behind it.
        </p>
      )}
    </section>
  )
}

function bucket(v: number): 'lo' | 'mid' | 'hi' {
  if (v < 40) return 'lo'
  if (v < 70) return 'mid'
  return 'hi'
}
