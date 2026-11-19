import { DICTIONARY, nameKey } from './shopping'

// Emojis for shopping items, searchable in European Portuguese. Each entry has
// the words a person might type for it (no accents needed).
export type EmojiEntry = { emoji: string; words: string }
export type EmojiGroup = { id: string; label: string; entries: EmojiEntry[] }

const e = (emoji: string, words: string): EmojiEntry => ({ emoji, words })

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    id: 'frutas',
    label: 'Frutas e legumes',
    entries: [
      e('🍎', 'maca fruta vermelha'), e('🍏', 'maca verde'), e('🍐', 'pera'), e('🍊', 'laranja tangerina clementina citrinos'),
      e('🍋', 'limao citrinos'), e('🍌', 'banana'), e('🍉', 'melancia'), e('🍇', 'uvas'), e('🍓', 'morango morangos'),
      e('🫐', 'mirtilos arandos frutos silvestres'), e('🍈', 'melao'), e('🍒', 'cerejas'), e('🍑', 'pessego nectarina'),
      e('🥭', 'manga'), e('🍍', 'ananas'), e('🥥', 'coco'), e('🥝', 'kiwi'), e('🍅', 'tomate'), e('🍆', 'beringela'),
      e('🥑', 'abacate'), e('🥦', 'brocolos couve-flor'), e('🥬', 'alface espinafres couve folhas salada'),
      e('🥒', 'pepino courgette curgete'), e('🌶️', 'piri-piri malagueta picante'), e('🫑', 'pimento pimentos'),
      e('🌽', 'milho'), e('🥕', 'cenoura cenouras'), e('🧄', 'alho'), e('🧅', 'cebola cebolas'), e('🥔', 'batata batatas'),
      e('🍠', 'batata doce'), e('🍄', 'cogumelos'), e('🌿', 'salsa coentros ervas aromaticas hortela'), e('🫛', 'ervilhas favas'),
    ],
  },
  {
    id: 'padaria',
    label: 'Padaria e laticínios',
    entries: [
      e('🍞', 'pao pao de forma tostas'), e('🥐', 'croissant croissants'), e('🥖', 'baguete pao carcaca'), e('🥨', 'pretzel salgados'),
      e('🥯', 'bagel'), e('🥞', 'panquecas'), e('🧇', 'waffles'), e('🍰', 'bolo'), e('🎂', 'bolo de aniversario'),
      e('🧁', 'cupcake queque'), e('🥧', 'tarte'), e('🍩', 'donut bolinhas'), e('🍪', 'bolachas'), e('🥛', 'leite natas'),
      e('🧀', 'queijo'), e('🧈', 'manteiga'), e('🥚', 'ovos ovo'), e('🍳', 'ovo estrelado'), e('🥣', 'iogurte iogurtes cereais'),
    ],
  },
  {
    id: 'carne',
    label: 'Carne e peixe',
    entries: [
      e('🍗', 'frango perna'), e('🍖', 'carne osso'), e('🥩', 'bife carne picada porco vaca'), e('🥓', 'bacon fiambre presunto'),
      e('🌭', 'salsichas cachorro'), e('🍔', 'hamburguer hamburgueres'), e('🐟', 'peixe salmao bacalhau atum pescada'),
      e('🍤', 'camarao gambas'), e('🦐', 'camarao gambas'), e('🦑', 'lulas polvo choco'), e('🦞', 'lagosta marisco'),
      e('🦀', 'caranguejo marisco'), e('🍣', 'sushi'),
    ],
  },
  {
    id: 'mercearia',
    label: 'Mercearia',
    entries: [
      e('🍚', 'arroz'), e('🍝', 'massa esparguete'), e('🍜', 'noodles sopa instantanea'), e('🍲', 'sopa guisado'),
      e('🫘', 'feijao grao leguminosas'), e('🥫', 'conservas lata atum molho tomate'), e('🫒', 'azeite azeitonas'),
      e('🧂', 'sal'), e('🍬', 'acucar doces rebucados'), e('🍫', 'chocolate'), e('🍯', 'mel'), e('🥜', 'amendoim frutos secos'),
      e('🌰', 'castanhas'), e('🌾', 'farinha cereais'), e('🍿', 'pipocas'), e('🍕', 'pizza'), e('🥪', 'sandes'),
      e('🌮', 'tacos'), e('🌯', 'wrap'), e('🥗', 'salada'), e('🍦', 'gelado'), e('🍨', 'gelado'), e('🍡', 'doces'),
      e('🥫', 'molho'), e('🧊', 'gelo congelados'),
    ],
  },
  {
    id: 'bebidas',
    label: 'Bebidas',
    entries: [
      e('💧', 'agua'), e('🧃', 'sumo'), e('🥤', 'refrigerante cola'), e('☕', 'cafe'), e('🍵', 'cha'), e('🫖', 'cha infusao'),
      e('🍺', 'cerveja'), e('🍻', 'cervejas'), e('🍷', 'vinho tinto branco'), e('🥂', 'espumante champanhe'),
      e('🍸', 'cocktail'), e('🍹', 'bebida tropical'), e('🥃', 'whisky licor'), e('🍾', 'garrafa espumante'),
      e('🧋', 'cha gelado bubble tea'), e('🥛', 'leite'),
    ],
  },
  {
    id: 'casa',
    label: 'Casa e limpeza',
    entries: [
      e('🧽', 'esponja esfregao detergente loica'), e('🧺', 'roupa detergente cesto amaciador'), e('🧴', 'detergente lixivia frasco'),
      e('🧹', 'vassoura limpeza'), e('🪣', 'balde'), e('🧻', 'papel higienico cozinha'), e('🗑️', 'lixo sacos do lixo'),
      e('🔋', 'pilhas bateria'), e('💡', 'lampada'), e('🕯️', 'velas'), e('🔌', 'tomada carregador'), e('🪴', 'planta vaso'),
      e('🛏️', 'cama lencois'), e('🚿', 'duche'), e('🪒', 'lamina'), e('🔧', 'ferramenta'), e('🔦', 'lanterna'),
      e('📦', 'caixa encomenda'), e('🧯', 'extintor'), e('🧷', 'alfinete'),
    ],
  },
  {
    id: 'higiene',
    label: 'Higiene e saúde',
    entries: [
      e('🪥', 'dentes escova pasta de dentes'), e('🧼', 'sabonete sabao'), e('🧴', 'champo gel de banho creme desodorizante'),
      e('🪮', 'pente escova cabelo'), e('💊', 'comprimidos medicamentos farmacia'), e('🩹', 'pensos'), e('🌡️', 'termometro'),
      e('🧖', 'spa'), e('💄', 'maquilhagem batom'), e('🪞', 'espelho'), e('😷', 'mascaras'), e('🧻', 'papel'),
    ],
  },
  {
    id: 'outros',
    label: 'Animais, bebé e festa',
    entries: [
      e('🐶', 'cao cachorro racao'), e('🐱', 'gato racao areia'), e('🐾', 'animais'), e('🐦', 'passaros'), e('🐠', 'peixes aquario'),
      e('🍼', 'bebe biberao leite'), e('👶', 'bebe fraldas'), e('🧸', 'brinquedo peluche'), e('🎁', 'presente prenda'),
      e('🎈', 'balao festa'), e('🎉', 'festa'), e('🕯️', 'velas aniversario'), e('💐', 'flores ramo'), e('🌹', 'rosa flores'),
      e('✏️', 'lapis escola'), e('📓', 'caderno'), e('📎', 'clips escritorio'), e('🖊️', 'caneta'), e('🛒', 'compras carrinho'),
      e('⭐', 'estrela'), e('❤️', 'coracao'),
    ],
  },
]

const ALL: EmojiEntry[] = EMOJI_GROUPS.flatMap((group) => group.entries)

// A text field that takes whatever the keyboard offers, emoji included.
const SEGMENTER = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter() : null
const PICTOGRAPH = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u

// The first emoji in the text, or null. ("café ☕" gives "☕".)
export function firstEmoji(text: string): string | null {
  if (!PICTOGRAPH.test(text)) return null
  if (!SEGMENTER) return text.match(/\p{Extended_Pictographic}️?/u)?.[0] ?? null
  for (const { segment } of SEGMENTER.segment(text)) {
    if (PICTOGRAPH.test(segment)) return segment
  }
  return null
}

// Entries whose words start a word of the search, e.g. "queij" finds queijo.
export function searchEmoji(query: string): EmojiEntry[] {
  const words = nameKey(query).split(' ').filter(Boolean)
  if (words.length === 0) return []
  const seen = new Set<string>()
  return ALL.filter((entry) => {
    const haystack = entry.words.split(' ')
    const hit = words.every((word) => haystack.some((candidate) => candidate.startsWith(word)))
    if (!hit || seen.has(entry.emoji)) return false
    seen.add(entry.emoji)
    return true
  })
}

// What to offer first for an item name: its dictionary emoji, then anything
// that matches a word of the name ("Queijo da Serra" gives 🧀).
export function suggestEmoji(name: string, limit = 6): string[] {
  const key = nameKey(name)
  if (key === '') return []
  const found: string[] = []
  const add = (emoji: string) => {
    if (!found.includes(emoji)) found.push(emoji)
  }
  const exact = DICTIONARY.find((entry) => nameKey(entry.name) === key)
  if (exact) add(exact.emoji)
  for (const entry of DICTIONARY) {
    const entryKey = nameKey(entry.name)
    if (key.includes(entryKey) || entryKey.includes(key)) add(entry.emoji)
  }
  for (const word of key.split(' ').filter((part) => part.length > 2)) {
    for (const entry of searchEmoji(word)) add(entry.emoji)
  }
  return found.slice(0, limit)
}
