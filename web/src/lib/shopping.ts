import type { ShoppingHistory, ShoppingItem, ShoppingSection } from './database.types'
import { normalize } from './stats'

// Store route order, as in the mockups.
export const SECTIONS: { id: ShoppingSection; label: string }[] = [
  { id: 'frutas', label: 'Frutas e legumes' },
  { id: 'padaria', label: 'Padaria' },
  { id: 'laticinios', label: 'Laticínios e ovos' },
  { id: 'talho', label: 'Talho e peixe' },
  { id: 'mercearia', label: 'Mercearia' },
  { id: 'congelados', label: 'Congelados' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'limpeza', label: 'Limpeza' },
  { id: 'higiene', label: 'Higiene' },
  { id: 'outros', label: 'Outros' },
]

export const sectionLabel = (id: ShoppingSection): string =>
  SECTIONS.find((section) => section.id === id)?.label ?? 'Outros'

export const DEFAULT_EMOJI = '🛒'
export const MAX_QUANTITY = 99

export type Known = { name: string; emoji: string; section: ShoppingSection }

const k = (name: string, emoji: string, section: ShoppingSection): Known => ({ name, emoji, section })

// Small pt-PT dictionary: name -> emoji and section.
export const DICTIONARY: Known[] = [
  k('Bananas', '🍌', 'frutas'), k('Maçãs', '🍎', 'frutas'), k('Laranjas', '🍊', 'frutas'),
  k('Limões', '🍋', 'frutas'), k('Uvas', '🍇', 'frutas'), k('Morangos', '🍓', 'frutas'),
  k('Pêras', '🍐', 'frutas'), k('Melão', '🍈', 'frutas'), k('Melancia', '🍉', 'frutas'),
  k('Kiwis', '🥝', 'frutas'), k('Abacates', '🥑', 'frutas'), k('Ananás', '🍍', 'frutas'),
  k('Tomate', '🍅', 'frutas'), k('Tomate cherry', '🍅', 'frutas'), k('Batatas', '🥔', 'frutas'),
  k('Cebolas', '🧅', 'frutas'), k('Alho', '🧄', 'frutas'), k('Cenouras', '🥕', 'frutas'),
  k('Alface', '🥬', 'frutas'), k('Espinafres', '🥬', 'frutas'), k('Brócolos', '🥦', 'frutas'),
  k('Pepino', '🥒', 'frutas'), k('Pimentos', '🫑', 'frutas'), k('Courgette', '🥒', 'frutas'),
  k('Cogumelos', '🍄', 'frutas'), k('Salsa', '🌿', 'frutas'), k('Coentros', '🌿', 'frutas'),

  k('Pão', '🍞', 'padaria'), k('Pão de forma', '🍞', 'padaria'), k('Croissants', '🥐', 'padaria'),
  k('Bolo', '🍰', 'padaria'), k('Tostas', '🍞', 'padaria'),

  k('Leite', '🥛', 'laticinios'), k('Leite de aveia', '🥛', 'laticinios'), k('Iogurtes', '🥣', 'laticinios'),
  k('Queijo', '🧀', 'laticinios'), k('Queijo da Serra', '🧀', 'laticinios'), k('Manteiga', '🧈', 'laticinios'),
  k('Natas', '🥛', 'laticinios'), k('Ovos', '🥚', 'laticinios'),

  k('Frango', '🍗', 'talho'), k('Carne picada', '🥩', 'talho'), k('Bife', '🥩', 'talho'),
  k('Porco', '🥩', 'talho'), k('Fiambre', '🥓', 'talho'), k('Bacon', '🥓', 'talho'),
  k('Salmão', '🐟', 'talho'), k('Bacalhau', '🐟', 'talho'), k('Atum', '🐟', 'talho'),
  k('Camarão', '🦐', 'talho'), k('Peixe', '🐟', 'talho'),

  k('Arroz', '🍚', 'mercearia'), k('Massa', '🍝', 'mercearia'), k('Farinha', '🌾', 'mercearia'),
  k('Açúcar', '🍬', 'mercearia'), k('Sal', '🧂', 'mercearia'), k('Azeite', '🫒', 'mercearia'),
  k('Café', '☕', 'mercearia'), k('Chá', '🍵', 'mercearia'), k('Cereais', '🥣', 'mercearia'),
  k('Bolachas', '🍪', 'mercearia'), k('Chocolate', '🍫', 'mercearia'), k('Feijão', '🫘', 'mercearia'),
  k('Grão', '🫘', 'mercearia'), k('Atum em lata', '🥫', 'mercearia'), k('Molho de tomate', '🥫', 'mercearia'),
  k('Mel', '🍯', 'mercearia'), k('Manteiga de amendoim', '🥜', 'mercearia'), k('Frutos secos', '🥜', 'mercearia'),

  k('Gelado', '🍨', 'congelados'), k('Pizza', '🍕', 'congelados'), k('Ervilhas congeladas', '🫛', 'congelados'),
  k('Peixe congelado', '🐟', 'congelados'),

  k('Água', '💧', 'bebidas'), k('Água com gás', '💧', 'bebidas'), k('Sumo', '🧃', 'bebidas'),
  k('Cerveja', '🍺', 'bebidas'), k('Vinho tinto', '🍷', 'bebidas'), k('Vinho branco', '🍷', 'bebidas'),
  k('Refrigerante', '🥤', 'bebidas'),

  k('Detergente da loiça', '🧽', 'limpeza'), k('Detergente da roupa', '🧺', 'limpeza'),
  k('Amaciador', '🧺', 'limpeza'), k('Lixívia', '🧴', 'limpeza'), k('Esfregões', '🧽', 'limpeza'),
  k('Sacos do lixo', '🗑️', 'limpeza'), k('Papel de cozinha', '🧻', 'limpeza'), k('Pilhas', '🔋', 'limpeza'),

  k('Papel higiénico', '🧻', 'higiene'), k('Pasta de dentes', '🪥', 'higiene'), k('Champô', '🧴', 'higiene'),
  k('Gel de banho', '🧴', 'higiene'), k('Desodorizante', '🧴', 'higiene'), k('Sabonete', '🧼', 'higiene'),
  k('Cotonetes', '🧴', 'higiene'),
]

// The name as stored in `name_key`: no case, accents or extra spaces.
export function nameKey(name: string): string {
  return normalize(name).replace(/\s+/g, ' ').trim()
}

// "Leite", also for "leite" and "LEITE  ".
export function displayName(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

// "2 leite" and "2x leite" mean two of leite.
export function parseDraft(text: string): { quantity: number; term: string } {
  const match = text.trim().match(/^(\d{1,2})\s*x?\s+(.+)$/i)
  if (!match) return { quantity: 1, term: text.trim() }
  const quantity = Math.min(Math.max(parseInt(match[1], 10), 1), MAX_QUANTITY)
  return { quantity, term: match[2].trim() }
}

export type Suggestion = {
  key: string
  known: Known
  // Already on the (not ticked) list, with this quantity.
  onList: number | null
  // True for the last "Adicionar “…”" row, which is the literal text.
  literal: boolean
}

// Names the app knows: the dictionary, overridden by what was chosen or bought
// before (history wins, so a corrected section sticks).
export function knownNames(history: ShoppingHistory[]): Known[] {
  const byKey = new Map<string, Known>()
  for (const entry of DICTIONARY) byKey.set(nameKey(entry.name), entry)
  for (const entry of history) {
    byKey.set(entry.name_key, { name: entry.name, emoji: entry.emoji, section: entry.section })
  }
  return [...byKey.values()]
}

export function lookup(term: string, history: ShoppingHistory[]): Known | null {
  const key = nameKey(term)
  if (key === '') return null
  const all = knownNames(history)
  return (
    all.find((entry) => nameKey(entry.name) === key) ??
    // Typing "lei" and pressing Enter picks "Leite", as in the mockup.
    all.find((entry) => nameKey(entry.name).startsWith(key)) ??
    null
  )
}

// Up to three matches, then the literal text unless it is exactly one of them.
export function suggest(text: string, items: ShoppingItem[], history: ShoppingHistory[]): Suggestion[] {
  const { term } = parseDraft(text)
  const key = nameKey(term)
  if (key === '') return []

  const open = new Map(items.filter((item) => item.checked_at === null).map((item) => [item.name_key, item]))
  const bought = new Set(history.filter((entry) => entry.times_bought > 0).map((entry) => entry.name_key))

  const matches = knownNames(history)
    .filter((entry) => nameKey(entry.name).includes(key))
    .sort((a, b) => {
      const aKey = nameKey(a.name)
      const bKey = nameKey(b.name)
      const rank = (candidate: string) => (candidate.startsWith(key) ? 0 : 1)
      return (
        rank(aKey) - rank(bKey) ||
        Number(bought.has(bKey)) - Number(bought.has(aKey)) ||
        a.name.localeCompare(b.name, 'pt')
      )
    })
    .slice(0, 3)

  const suggestions: Suggestion[] = matches.map((known) => ({
    key: nameKey(known.name),
    known,
    onList: open.get(nameKey(known.name))?.quantity ?? null,
    literal: false,
  }))

  if (!matches.some((entry) => nameKey(entry.name) === key)) {
    const name = displayName(term)
    suggestions.push({
      key: `literal:${key}`,
      known: { name, emoji: DEFAULT_EMOJI, section: 'outros' },
      onList: open.get(key)?.quantity ?? null,
      literal: true,
    })
  }
  return suggestions
}

// Most often bought names that are not on the list, for the "Habituais" chips.
export function usual(items: ShoppingItem[], history: ShoppingHistory[], limit = 6): ShoppingHistory[] {
  const open = new Set(items.filter((item) => item.checked_at === null).map((item) => item.name_key))
  return history
    .filter((entry) => entry.times_bought > 0 && !open.has(entry.name_key))
    .sort(
      (a, b) =>
        b.times_bought - a.times_bought ||
        (b.last_bought_at ?? '').localeCompare(a.last_bought_at ?? ''),
    )
    .slice(0, limit)
}

export type SectionGroup = { section: ShoppingSection; label: string; items: ShoppingItem[] }

// Open items by store section (empty sections left out), oldest first.
export function groupOpen(items: ShoppingItem[]): SectionGroup[] {
  const open = items
    .filter((item) => item.checked_at === null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  return SECTIONS.map(({ id, label }) => ({
    section: id,
    label,
    items: open.filter((item) => item.section === id),
  })).filter((group) => group.items.length > 0)
}

// Ticked items, most recently ticked first.
export function cartItems(items: ShoppingItem[]): ShoppingItem[] {
  return items
    .filter((item) => item.checked_at !== null)
    .sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? ''))
}

export const openCount = (items: ShoppingItem[]): number =>
  items.filter((item) => item.checked_at === null).length
