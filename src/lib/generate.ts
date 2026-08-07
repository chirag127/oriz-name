/**
 * Pure name-generation engine. No I/O, no DOM — fully unit-testable.
 * Deterministic given a seeded RNG so results are reproducible + testable.
 */

export type Vibe =
  | 'techy'
  | 'playful'
  | 'luxe'
  | 'minimal'
  | 'retro'
  | 'organic'
  | 'edgy'
  | 'friendly'

export type NameKind = 'brand' | 'product' | 'startup' | 'username' | 'repo'

export interface GenOptions {
  keywords: string[]
  vibe: Vibe
  kind: NameKind
  count?: number
  maxLen?: number
  seed?: number
}

export interface NameResult {
  name: string
  /** display / handle form appropriate to the kind (e.g. @handle, kebab-repo) */
  handle: string
  /** heuristic 0-100 memorability/brandability score */
  score: number
  /** which technique produced it, for the "explain" panel */
  technique: string
}

/** Mulberry32 — tiny deterministic PRNG. Same seed → same stream. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** Vibe-scoped affix banks. Kept small + hand-picked so output stays on-brief. */
const PREFIX: Record<Vibe, readonly string[]> = {
  techy: ['neo', 'cy', 'quant', 'byte', 'hyper', 'nano', 'flux', 'core', 'vel'],
  playful: ['zoo', 'bub', 'pop', 'wig', 'doo', 'yum', 'boo', 'jib', 'kip'],
  luxe: ['au', 'noir', 'velv', 'lux', 'opul', 'reg', 'ivo', 'sable', 'lume'],
  minimal: ['ka', 'lo', 'so', 'mu', 'ai', 'ora', 'evo', 'una', 'ivo'],
  retro: ['neon', 'vox', 'astro', 'rocket', 'chrome', 'volt', 'nova', 'jet', 'atom'],
  organic: ['ever', 'terra', 'ver', 'flora', 'root', 'bloom', 'sol', 'mos', 'fern'],
  edgy: ['rax', 'vex', 'kro', 'zyn', 'grit', 'ryn', 'drax', 'nyx', 'skar'],
  friendly: ['happy', 'good', 'buddy', 'hey', 'warm', 'sunny', 'nest', 'kind', 'cozy'],
}

const SUFFIX: Record<Vibe, readonly string[]> = {
  techy: ['ify', 'ly', 'io', 'ex', 'labs', 'stack', 'grid', 'sync', 'ar'],
  playful: ['oo', 'zy', 'sy', 'kins', 'ito', 'aroo', 'ster', 'pop', 'y'],
  luxe: ['aire', 'elle', 'oir', 'esse', 'ova', 'ique', 'ari', 'eux', 'ora'],
  minimal: ['o', 'a', 'i', 'ly', 'io', 'ai', 'u', 'e', 'is'],
  retro: ['tron', 'wave', 'max', 'star', 'a-go', 'orama', 'ex', '77', 'burst'],
  organic: ['leaf', 'root', 'grove', 'field', 'seed', 'bloom', 'wild', 'nest', 'ora'],
  edgy: ['x', 'core', 'kill', 'rift', 'byte', 'z', 'volt', 'raze', 'on'],
  friendly: ['pal', 'bee', 'mate', 'nest', 'hub', 'ly', 'wave', 'spot', 'joy'],
}

/** Real dictionary words to blend with, scoped loosely by vibe for flavor. */
const SEEDWORDS: Record<Vibe, readonly string[]> = {
  techy: ['spark', 'pixel', 'logic', 'orbit', 'signal', 'vector', 'cloud', 'forge'],
  playful: ['jelly', 'giggle', 'pickle', 'noodle', 'wiggle', 'muffin', 'bounce'],
  luxe: ['velvet', 'marble', 'amber', 'silk', 'crystal', 'onyx', 'pearl', 'gold'],
  minimal: ['calm', 'clear', 'plain', 'north', 'still', 'zen', 'line', 'form'],
  retro: ['diner', 'cruiser', 'jukebox', 'chrome', 'sunset', 'cassette', 'arcade'],
  organic: ['meadow', 'harvest', 'willow', 'cedar', 'river', 'honey', 'clover'],
  edgy: ['razor', 'venom', 'shadow', 'ember', 'raven', 'storm', 'blade', 'ash'],
  friendly: ['cocoa', 'pillow', 'sunday', 'garden', 'porch', 'hearth', 'wave'],
}

const VOWELS = 'aeiou'

function titleCase(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

function cleanKeyword(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Portmanteau: front of A + back of B, spliced at a vowel boundary. */
function blend(a: string, b: string): string {
  if (!a || !b) return a + b
  const cut = Math.max(2, Math.ceil(a.length * 0.6))
  const head = a.slice(0, cut)
  let tail = b
  for (let i = 0; i < b.length; i++) {
    if (VOWELS.includes(b[i])) {
      tail = b.slice(i)
      break
    }
  }
  return head + tail
}

/** Drop a vowel to get a "tech startup" look, e.g. flickr, tumblr. */
function devowel(s: string): string {
  if (s.length < 5) return s
  const idx = s.slice(2).search(/[aeiou]/)
  if (idx === -1) return s
  const at = idx + 2
  if (at >= s.length - 1) return s
  return s.slice(0, at) + s.slice(at + 1)
}

/** Score a candidate for brandability. Heuristic, 0-100. */
export function scoreName(name: string): number {
  const n = name.toLowerCase()
  let s = 60
  const len = n.length
  if (len >= 4 && len <= 9) s += 15
  else if (len <= 3 || len > 13) s -= 20
  else s -= 5
  const vowelRatio = (n.match(/[aeiou]/g)?.length ?? 0) / Math.max(1, len)
  if (vowelRatio >= 0.3 && vowelRatio <= 0.55) s += 10
  else s -= 8
  // consonant-run penalty (hard to say)
  if (/[bcdfghjklmnpqrstvwxz]{4,}/.test(n)) s -= 15
  // pronounceable alternation bonus
  if (/^([bcdfghjklmnpqrstvwxz][aeiou])+/.test(n)) s += 8
  if (/(.)\1\1/.test(n)) s -= 10 // triple repeat
  if (/^[a-z]+$/.test(n)) s += 5 // no digits/hyphens
  return Math.max(1, Math.min(100, Math.round(s)))
}

function toHandle(name: string, kind: NameKind): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (kind === 'username') return '@' + base
  if (kind === 'repo') {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
  return base + '.com'
}

const TECHNIQUES = [
  'affix',
  'blend',
  'devowel',
  'compound',
  'coined',
] as const
type Technique = (typeof TECHNIQUES)[number]

function buildOne(
  opts: GenOptions,
  rng: () => number,
): { name: string; technique: Technique } {
  const kws = opts.keywords.map(cleanKeyword).filter(Boolean)
  const seed = kws.length ? pick(kws, rng) : pick(SEEDWORDS[opts.vibe], rng)
  const t = pick(TECHNIQUES, rng)
  const pre = pick(PREFIX[opts.vibe], rng)
  const suf = pick(SUFFIX[opts.vibe], rng)
  const flavor = pick(SEEDWORDS[opts.vibe], rng)

  let name: string
  switch (t) {
    case 'affix':
      name = rng() < 0.5 ? pre + seed : seed + suf
      break
    case 'blend':
      name = blend(seed, flavor)
      break
    case 'devowel':
      name = devowel(seed + suf)
      break
    case 'compound':
      name = seed + titleCase(flavor)
      break
    default: // coined
      name = pre + seed.slice(0, 3) + suf
  }

  name = name.replace(/[^a-zA-Z0-9]/g, '')
  if (opts.kind === 'repo') {
    name = name.toLowerCase()
  } else {
    name = titleCase(name)
  }
  const maxLen = opts.maxLen ?? 14
  if (name.length > maxLen) name = name.slice(0, maxLen)
  return { name, technique: t }
}

const TECHNIQUE_LABEL: Record<Technique, string> = {
  affix: 'affix — vibe prefix/suffix on your keyword',
  blend: 'portmanteau — two words fused at a vowel',
  devowel: 'de-voweled — dropped a vowel for a tech look',
  compound: 'compound — two whole words joined',
  coined: 'coined — invented word from vibe morphemes',
}

/**
 * Generate a batch of names. Deterministic for a given seed.
 * De-dupes; keeps generating until it hits `count` or runs out of tries.
 */
export function generateNames(opts: GenOptions): NameResult[] {
  const count = opts.count ?? 12
  const rng = makeRng(opts.seed ?? 0x9e3779b9)
  const seen = new Set<string>()
  const out: NameResult[] = []
  let tries = 0
  const maxTries = count * 40
  while (out.length < count && tries < maxTries) {
    tries++
    const { name, technique } = buildOne(opts, rng)
    if (name.length < 3) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      name,
      handle: toHandle(name, opts.kind),
      score: scoreName(name),
      technique: TECHNIQUE_LABEL[technique],
    })
  }
  return out.sort((a, b) => b.score - a.score)
}

export const VIBES: readonly Vibe[] = [
  'techy',
  'playful',
  'luxe',
  'minimal',
  'retro',
  'organic',
  'edgy',
  'friendly',
]

export const KINDS: readonly NameKind[] = [
  'brand',
  'product',
  'startup',
  'username',
  'repo',
]
