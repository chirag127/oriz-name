/**
 * Client-side availability HEURISTICS. No network, no WHOIS.
 * Estimates how likely a name is free + builds check-links out to registrars.
 */

import { scoreName } from './generate'

export interface Availability {
  /** rough 0-100 "probably-available" heuristic (higher = more likely free) */
  likelihood: number
  label: 'likely taken' | 'contested' | 'possibly free' | 'likely free'
  reasons: string[]
  links: { label: string; href: string }[]
}

const COMMON_TLD_WORDS = new Set([
  'app',
  'get',
  'go',
  'my',
  'the',
  'best',
  'top',
  'pro',
  'hub',
  'now',
  'cloud',
  'data',
  'shop',
  'store',
])

/**
 * Heuristic: short, all-dictionary, common-word names are almost certainly
 * registered; long, coined, de-voweled names are likelier free.
 */
export function estimateAvailability(name: string): Availability {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const reasons: string[] = []
  let like = 55

  if (n.length <= 4) {
    like -= 35
    reasons.push('very short — short domains are nearly all registered')
  } else if (n.length <= 6) {
    like -= 15
    reasons.push('short — competitive length')
  } else if (n.length >= 10) {
    like += 20
    reasons.push('longer names have far more free variants')
  }

  if (COMMON_TLD_WORDS.has(n)) {
    like -= 30
    reasons.push('common English word — premium/taken')
  }

  const isCoined = !/^[a-z]+$/.test(name) || /[bcdfghjklmnpqrstvwxz]{3}/.test(n)
  if (isCoined) {
    like += 15
    reasons.push('coined/invented spelling — fewer collisions')
  } else {
    like -= 10
    reasons.push('dictionary-word spelling — more likely claimed')
  }

  // brandable+short = desirable = probably taken
  const brand = scoreName(name)
  if (brand >= 80 && n.length <= 7) {
    like -= 12
    reasons.push('highly brandable + short — high demand')
  }

  like = Math.max(3, Math.min(97, Math.round(like)))

  let label: Availability['label']
  if (like < 25) label = 'likely taken'
  else if (like < 50) label = 'contested'
  else if (like < 72) label = 'possibly free'
  else label = 'likely free'

  const q = encodeURIComponent(n)
  const links = [
    { label: '.com (Namecheap)', href: `https://www.namecheap.com/domains/registration/results/?domain=${q}.com` },
    { label: 'WHOIS', href: `https://who.is/whois/${q}.com` },
    { label: 'GitHub org', href: `https://github.com/${q}` },
    { label: 'npm', href: `https://www.npmjs.com/package/${q}` },
    { label: 'X / handle', href: `https://x.com/${q}` },
  ]

  return { likelihood: like, label, reasons, links }
}
