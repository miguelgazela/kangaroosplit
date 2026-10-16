// What was added to the app, newest first. The first entry is the version the
// Definições screen shows, so add an entry here with every push.
export type ChangelogEntry = {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
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
