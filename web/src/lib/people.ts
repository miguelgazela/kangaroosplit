import type { ListDefaultShare, Member } from './database.types'

// "Mi", "Ma": two letters, since both names may share an initial.
export function initials(name: string): string {
  const trimmed = name.trim()
  return trimmed.slice(0, 1).toUpperCase() + trimmed.slice(1, 2).toLowerCase()
}

// A person's name with the article and preposition Portuguese requires.
export function nameForms(member: Member) {
  const name = member.display_name
  const feminine = member.gender === 'f'
  return {
    name,
    // "A Mara deve-te"
    subject: `${feminine ? 'A' : 'O'} ${name}`,
    // "Pago pela Mara"
    by: `${feminine ? 'pela' : 'pelo'} ${name}`,
    // "Deves à Mara"
    to: `${feminine ? 'à' : 'ao'} ${name}`,
    // "Parte da Mara"
    of: `${feminine ? 'da' : 'do'} ${name}`,
  }
}

// A list's default ratio in member order, e.g. [60, 40]. Shown as percentages
// when they come out whole (1 / 1 -> 50 / 50), otherwise as raw weights (2 / 1).
export function ratio(members: Member[], shares: ListDefaultShare[], listId: string): number[] {
  const weights = members.map(
    (member) =>
      shares.find((share) => share.list_id === listId && share.user_id === member.user_id)?.weight ?? 1,
  )
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (total === 0) return members.map(() => 50)
  const percents = weights.map((weight) => (weight * 100) / total)
  return percents.every(Number.isInteger) ? percents : weights
}
