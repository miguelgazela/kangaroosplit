import { describe, expect, it } from 'vitest'
import type { Category, ExpenseWithShares, List, Member, Settlement } from './database.types'
import { buildCsv } from './export'

const members = [
  { user_id: 'a', display_name: 'Miguel' },
  { user_id: 'b', display_name: 'Mara' },
] as Member[]
const lists = [{ id: 'home', name: 'Casa' }] as List[]
const categories = [{ id: 'food', name: 'Supermercado' }] as Category[]

const expenses = [
  {
    id: '2',
    list_id: 'home',
    description: 'Jantar; "especial"',
    amount_cents: 123456,
    spent_on: '2026-10-08',
    created_at: '2026-10-08T20:00:00Z',
    paid_by: 'b',
    category_id: 'food',
    note: null,
    expense_shares: [
      { user_id: 'a', share_cents: 83950 },
      { user_id: 'b', share_cents: 39506 },
    ],
  },
  {
    id: '1',
    list_id: 'home',
    description: 'Continente',
    amount_cents: 1000,
    spent_on: '2026-10-01',
    created_at: '2026-10-01T10:00:00Z',
    paid_by: 'a',
    category_id: 'food',
    note: 'semana 1',
    expense_shares: [
      { user_id: 'a', share_cents: 680 },
      { user_id: 'b', share_cents: 320 },
    ],
  },
] as ExpenseWithShares[]

const settlements = [
  {
    id: 's',
    list_id: 'home',
    from_user: 'b',
    to_user: 'a',
    amount_cents: 320,
    settled_on: '2026-10-05',
    created_at: '2026-10-05T09:00:00Z',
    note: null,
  },
] as Settlement[]

describe('buildCsv', () => {
  const lines = buildCsv({ members, lists, categories, expenses, settlements }).split('\r\n')

  it('has a header with a share column per member', () => {
    expect(lines[0]).toBe(
      'Data;Lista;Tipo;Descrição;Categoria;Valor;Pago por;Parte Miguel;Parte Mara;Recebido por;Nota',
    )
  })

  it('lists expenses and payments together, oldest first', () => {
    expect(lines.slice(1)).toEqual([
      '2026-10-01;Casa;Despesa;Continente;Supermercado;10,00;Miguel;6,80;3,20;;semana 1',
      '2026-10-05;Casa;Pagamento;;;3,20;Mara;;;Miguel;',
      '2026-10-08;Casa;Despesa;"Jantar; ""especial""";Supermercado;1234,56;Mara;839,50;395,06;;',
    ])
  })
})
