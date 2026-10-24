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
    version: '1.8.0',
    date: '2026-10-24',
    changes: ['Novo ícone da app em 3D, com a moeda a cair na bolsa do canguru, a combinar com o Guru'],
    highlights: [
      {
        title: 'Ícone novo',
        text: 'A bolsa e a moeda ganharam volume, a combinar com o Guru. Se não o vires no ecrã principal, remove a app e volta a adicioná-la.',
        icon: 'grid',
        tone: 'accent',
      },
    ],
  },
  {
    version: '1.7.2',
    date: '2026-10-24',
    changes: [
      'A lista e as Estatísticas mostram blocos a carregar em vez de um ecrã vazio enquanto os dados chegam',
      'Se algo falhar ao carregar, aparece um aviso para tentares outra vez',
    ],
  },
  {
    version: '1.7.1',
    date: '2026-10-19',
    changes: [
      'A lista de compras vazia mostra o Guru com o carrinho vazio',
      'O Guru ficou mais limpo, sem a moeda solta ao saltar de alegria',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-18',
    changes: [
      'O Guru ganhou um novo visual em 3D, com o lenço roxo ao pescoço',
      'Aparece assim a acenar, a espreitar a bolsa vazia, a saltar de alegria e a dormir',
    ],
    highlights: [
      {
        title: 'O Guru está mais fofo',
        text: 'Agora é um canguru em 3D, com o lenço ao pescoço. Vais encontrá-lo nos ecrãs vazios, ao acertar contas e quando estás sem ligação.',
        icon: 'heart',
        tone: 'accent',
      },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-10-17',
    changes: [
      'Nova despesa sugere logo as três descrições mais usadas na categoria escolhida',
      'As sugestões mudam com a categoria e, se começares a escrever, passam a seguir o que escreves',
    ],
    highlights: [
      {
        title: 'Sugestões logo ao abrir',
        text: 'Ao adicionar uma despesa vês as três descrições que mais usas na categoria, e podes mudar de categoria para ver outras.',
        icon: 'plus',
        tone: 'accent',
      },
    ],
  },
  {
    version: '1.5.1',
    date: '2026-10-17',
    changes: ['Os valores aparecem sempre numa só cor, sem os cêntimos mais claros'],
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
