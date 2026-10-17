import type { IconName } from '../components/Icon'

// What was added to the app, newest first. The first entry is the version the
// Definições screen shows, so add an entry here with every push.
// Add `highlights` to an entry whose changes users should hear about: they
// make up the "what's new" sheet shown once after an update.
export type Highlight = {
  title: string
  text: string
  icon: IconName
  tone: 'accent' | 'teal' | 'orange'
}

export type ChangelogEntry = {
  version: string
  date: string
  changes: string[]
  // Up to three things worth showing in the "what's new" sheet after an update.
  // Small fixes leave this out, so they show no sheet.
  highlights?: Highlight[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.6.0',
    date: '2026-10-17',
    changes: [
      'Início com um cabeçalho grande com o saldo, que se move suavemente ao deslizar',
      'Os valores aparecem sempre numa só cor, sem os cêntimos mais claros',
    ],
    highlights: [
      {
        title: 'Início renovado',
        text: 'O saldo ocupa o topo do ecrã e acompanha o deslizar, com um efeito suave.',
        icon: 'home',
        tone: 'accent',
      },
      {
        title: 'Valores mais claros',
        text: 'Os montantes aparecem sempre numa só cor, com os cêntimos incluídos.',
        icon: 'check',
        tone: 'teal',
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-10-17',
    changes: [
      'Depois de uma atualização, uma folha mostra as novidades da versão',
      'A cor escolhida por ti já aparece logo ao abrir a app',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-17',
    changes: [
      'Nova despesa: cartão com categoria, lista, data e quem pagou, tudo à vista com o teclado aberto',
      'A categoria aparece com a sua cor',
      'Despesas recorrentes de cada lista a partir do cartão da lista, com filtro por lista',
    ],
    highlights: [
      {
        title: 'Detalhes rápidos ao adicionar',
        text: 'Categoria, lista, data e quem pagou ficam logo por cima do teclado.',
        icon: 'plus',
        tone: 'accent',
      },
      {
        title: 'Categorias com cor',
        text: 'Cada categoria aparece com a sua cor, como nas estatísticas.',
        icon: 'tag',
        tone: 'teal',
      },
      {
        title: 'Recorrentes de cada lista',
        text: 'Vê as despesas recorrentes no cartão de saldo de cada lista.',
        icon: 'repeat',
        tone: 'orange',
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-17',
    changes: ['Início mostra as últimas despesas da lista principal, com acesso direto ao detalhe'],
  },
  {
    version: '1.2.0',
    date: '2026-10-16',
    changes: ['Ecrã de novidades nas Definições, com o que mudou em cada versão'],
  },
  {
    version: '1.1.0',
    date: '2026-10-16',
    changes: [
      'Calendário nas Estatísticas, com o total de cada dia e o detalhe das despesas',
      'Despesas com data futura aparecem como previstas',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-16',
    changes: [
      'Despesas partilhadas, listas, acertos de contas e despesas recorrentes',
      'Estatísticas por mês, por ano e por categoria',
      'Lista de compras partilhada',
      'Comentários e reações nas despesas',
      'Fotos de recibos, exportação em CSV e relatório mensal por email',
      'Notificações e uso sem rede',
    ],
  },
]

export const VERSION = CHANGELOG[0].version
