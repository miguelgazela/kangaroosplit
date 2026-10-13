// Emails every member a summary of the month that just ended: spending, the
// split between them, categories, biggest expenses and where the balance
// stands. Called on the 1st of each month by pg_cron (see migration 0005).
//
// Secrets (Edge Functions -> Secrets):
//   KANGAROOSPLIT_WEBHOOK_SECRET   same one as the push function; sent as x-webhook-secret
//   KANGAROOSPLIT_RESEND_API_KEY   Resend API key
//   KANGAROOSPLIT_REPORT_FROM      e.g. KangarooSplit <kangaroosplit@miguelgazela.com>
// Deploy with JWT verification off: the shared secret authenticates the caller.
//
// Manual run / preview (body is optional JSON):
//   { "month": "2026-09", "dryRun": true }   returns the HTML, sends nothing
//   { "month": "2026-09", "to": "me@x.com" } sends only to that address

import { createClient } from 'npm:@supabase/supabase-js@2'

type Member = { user_id: string; display_name: string; gender: 'm' | 'f'; color: string }
type Category = { id: string; name: string; icon: string; color: string }
type List = { id: string; name: string; icon: string; archived_at: string | null }
type Expense = {
  id: string
  list_id: string
  description: string
  amount_cents: number
  spent_on: string
  paid_by: string
  category_id: string
  receipt_path: string | null
  recurring_id: string | null
  expense_shares: { user_id: string; share_cents: number }[]
}

const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing secret ${name}`)
  return value
}

const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  db: { schema: 'kangaroosplit' },
})

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

// 123456 -> "1.234,56 €"
function money(cents: number): string {
  const [whole, decimals] = (Math.abs(cents) / 100).toFixed(2).split('.')
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals} €`
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

// '2026-09' -> 'setembro de 2026'
function monthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number)
  return `${MONTHS[number - 1]} de ${year}`
}

function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split('-').map(Number)
  const index = year * 12 + (number - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

// The month before "now" in Lisbon, which is when the report is about.
function previousMonthInLisbon(): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
  return shiftMonth(today.slice(0, 7), -1)
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

const COLORS = {
  bg: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#111114',
  text2: '#6B6B76',
  separator: '#E6E6EC',
  accent: '#6847F0',
  accentSoft: '#EFEAFE',
  pos: '#0B7A5C',
  neg: '#B93D0B',
}

type Report = {
  month: string
  expenses: Expense[]
  previousTotal: number
  settlements: { from_user: string; to_user: string; amount_cents: number }[]
  members: Member[]
  categories: Category[]
  lists: List[]
  balances: { list_id: string; user_id: string; balance_cents: number }[]
  allTime: { expenses: number; spentCents: number }
}

function section(title: string, body: string): string {
  return `
    <tr><td style="padding:0 16px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="background:${COLORS.surface};border-radius:16px">
        <tr><td style="padding:16px 18px">
          <div style="font-size:13px;font-weight:600;color:${COLORS.text2};text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">${title}</div>
          ${body}
        </td></tr>
      </table>
    </td></tr>`
}

function bar(fraction: number, color: string): string {
  const width = Math.max(2, Math.round(fraction * 100))
  return `<div style="background:${COLORS.separator};border-radius:4px;height:6px"><div style="background:${color};border-radius:4px;height:6px;width:${width}%"></div></div>`
}

function render(report: Report, recipient: Member): string {
  const { month, expenses, members, categories, lists } = report
  const total = sum(expenses.map((e) => e.amount_cents))
  const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((i) => [i.id, i]))
  const categoryById = byId(categories)
  const listById = byId(lists)
  const memberById = new Map(members.map((m) => [m.user_id, m]))
  const other = members.find((m) => m.user_id !== recipient.user_id)
  // "A Mara" / "O Miguel", "à Mara" / "ao Miguel".
  const subject = other ? `${other.gender === 'f' ? 'A' : 'O'} ${other.display_name}` : 'O outro membro'
  const to = other ? `${other.gender === 'f' ? 'à' : 'ao'} ${other.display_name}` : 'ao outro membro'

  // Headline
  let comparison = ''
  if (report.previousTotal > 0) {
    const pct = Math.round(((total - report.previousTotal) / report.previousTotal) * 100)
    comparison = pct === 0 ? ' · igual ao mês anterior' : ` · ${pct > 0 ? '+' : ''}${pct}% face ao mês anterior`
  }
  const headline = `
    <tr><td style="padding:0 16px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="background:${COLORS.accent};border-radius:16px">
        <tr><td style="padding:22px 20px;color:#fff">
          <div style="font-size:14px;opacity:.85">Gastaram juntos em ${monthLabel(month)}</div>
          <div style="font-size:34px;font-weight:700;margin-top:4px">${money(total)}</div>
          <div style="font-size:14px;opacity:.85;margin-top:4px">${expenses.length} ${expenses.length === 1 ? 'despesa' : 'despesas'}${comparison}</div>
        </td></tr>
      </table>
    </td></tr>`

  if (expenses.length === 0) {
    return shell(
      month,
      recipient,
      `${headline}${section('Sem despesas', `<div style="font-size:15px">Não houve despesas registadas em ${monthLabel(month)}.</div>`)}`,
    )
  }

  // Who paid / whose share
  const paid = new Map<string, number>()
  const owed = new Map<string, number>()
  for (const expense of expenses) {
    paid.set(expense.paid_by, (paid.get(expense.paid_by) ?? 0) + expense.amount_cents)
    for (const share of expense.expense_shares) {
      owed.set(share.user_id, (owed.get(share.user_id) ?? 0) + share.share_cents)
    }
  }
  const people = members
    .map((m) => {
      const name = m.user_id === recipient.user_id ? 'Tu' : m.display_name
      return `
        <tr>
          <td style="padding:6px 0;font-size:15px;font-weight:600">${escapeHtml(name)}</td>
          <td style="padding:6px 0;font-size:14px;color:${COLORS.text2};text-align:right">pagou ${money(paid.get(m.user_id) ?? 0)}</td>
          <td style="padding:6px 0 6px 12px;font-size:14px;color:${COLORS.text2};text-align:right">parte ${money(owed.get(m.user_id) ?? 0)}</td>
        </tr>`
    })
    .join('')

  // Categories
  const categoryTotals = new Map<string, number>()
  for (const expense of expenses) {
    categoryTotals.set(expense.category_id, (categoryTotals.get(expense.category_id) ?? 0) + expense.amount_cents)
  }
  const categoryRows = [...categoryTotals]
    .sort((a, b) => b[1] - a[1])
    .map(([id, cents]) => {
      const category = categoryById.get(id)
      return `
        <tr><td style="padding:7px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:15px">${escapeHtml(category?.icon ?? '📦')} ${escapeHtml(category?.name ?? 'Outros')}</td>
            <td style="font-size:15px;font-weight:600;text-align:right">${money(cents)}</td>
          </tr></table>
          <div style="margin-top:5px">${bar(cents / total, category?.color ?? COLORS.accent)}</div>
          <div style="font-size:12px;color:${COLORS.text2};margin-top:3px">${Math.round((cents / total) * 100)}%</div>
        </td></tr>`
    })
    .join('')

  // Lists (only worth showing when there is more than one)
  const listTotals = new Map<string, number>()
  for (const expense of expenses) {
    listTotals.set(expense.list_id, (listTotals.get(expense.list_id) ?? 0) + expense.amount_cents)
  }
  const listSection =
    listTotals.size > 1
      ? section(
          'Por lista',
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${[...listTotals]
            .sort((a, b) => b[1] - a[1])
            .map(([id, cents]) => {
              const list = listById.get(id)
              return `<tr><td style="padding:5px 0;font-size:15px">${escapeHtml(list?.icon ?? '🧾')} ${escapeHtml(list?.name ?? 'Lista')}</td><td style="padding:5px 0;font-size:15px;font-weight:600;text-align:right">${money(cents)}</td></tr>`
            })
            .join('')}</table>`,
        )
      : ''

  // Biggest expenses
  const biggest = [...expenses]
    .sort((a, b) => b.amount_cents - a.amount_cents)
    .slice(0, 5)
    .map((expense) => {
      const payer = memberById.get(expense.paid_by)
      const day = expense.spent_on.slice(8, 10)
      return `
        <tr>
          <td style="padding:6px 0;font-size:15px">${escapeHtml(expense.description)}
            <div style="font-size:12px;color:${COLORS.text2}">${day} · pago ${escapeHtml(
              payer?.user_id === recipient.user_id ? 'por ti' : `${payer?.gender === 'f' ? 'pela' : 'pelo'} ${payer?.display_name ?? ''}`,
            )}</div></td>
          <td style="padding:6px 0;font-size:15px;font-weight:600;text-align:right;vertical-align:top">${money(expense.amount_cents)}</td>
        </tr>`
    })
    .join('')

  // Settlements this month
  const settled = sum(report.settlements.map((s) => s.amount_cents))
  const settlementText =
    report.settlements.length === 0
      ? 'Não houve acertos de contas este mês.'
      : `${report.settlements.length} ${report.settlements.length === 1 ? 'acerto' : 'acertos'} · ${money(settled)} no total.`

  // Balance right now across active lists
  const active = new Set(lists.filter((l) => !l.archived_at).map((l) => l.id))
  const mine = sum(
    report.balances
      .filter((b) => b.user_id === recipient.user_id && active.has(b.list_id))
      .map((b) => b.balance_cents),
  )
  let balanceText = 'Estão quites. Nada a acertar.'
  let balanceColor = COLORS.text
  if (mine > 0) {
    balanceText = `${escapeHtml(subject)} deve-te <strong>${money(mine)}</strong>.`
    balanceColor = COLORS.pos
  } else if (mine < 0) {
    balanceText = `Deves <strong>${money(mine)}</strong> ${escapeHtml(to)}.`
    balanceColor = COLORS.neg
  }

  // Overall usage
  const monthReceipts = expenses.filter((e) => e.receipt_path).length
  const monthRecurring = expenses.filter((e) => e.recurring_id).length
  const usage = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">
      <tr><td style="padding:4px 0">Despesas no mês</td><td style="text-align:right;font-weight:600">${expenses.length}</td></tr>
      <tr><td style="padding:4px 0">Média por despesa</td><td style="text-align:right;font-weight:600">${money(Math.round(total / expenses.length))}</td></tr>
      <tr><td style="padding:4px 0">Recorrentes</td><td style="text-align:right;font-weight:600">${monthRecurring}</td></tr>
      <tr><td style="padding:4px 0">Com foto do recibo</td><td style="text-align:right;font-weight:600">${monthReceipts}</td></tr>
      <tr><td style="padding:4px 0;color:${COLORS.text2}">Desde o início</td><td style="text-align:right;color:${COLORS.text2}">${report.allTime.expenses} despesas · ${money(report.allTime.spentCents)}</td></tr>
    </table>`

  const body =
    headline +
    section(
      'Quem pagou',
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${people}</table>`,
    ) +
    section('Categorias', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${categoryRows}</table>`) +
    listSection +
    section('Maiores despesas', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${biggest}</table>`) +
    section(
      'Acertos',
      `<div style="font-size:15px;margin-bottom:8px">${settlementText}</div><div style="font-size:16px;color:${balanceColor}">${balanceText}</div>`,
    ) +
    section('Utilização', usage)

  return shell(month, recipient, body)
}

function shell(month: string, recipient: Member, body: string): string {
  const name = escapeHtml(recipient.display_name)
  return `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Resumo de ${monthLabel(month)}</title></head>
<body style="margin:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.text}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg}">
    <tr><td align="center" style="padding:24px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="padding:0 20px 16px">
          <div style="font-size:22px;font-weight:700">🦘 O resumo de ${monthLabel(month)}</div>
          <div style="font-size:15px;color:${COLORS.text2};margin-top:4px">Olá, ${name}. Isto foi o que se passou no KangarooSplit.</div>
        </td></tr>
        ${body}
        <tr><td style="padding:8px 20px 0;font-size:12px;color:${COLORS.text2};text-align:center">
          KangarooSplit · enviado no 1.º dia de cada mês
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

async function loadReport(month: string): Promise<Report> {
  const from = `${month}-01`
  const to = `${shiftMonth(month, 1)}-01`
  const previousFrom = `${shiftMonth(month, -1)}-01`

  const [expenses, previous, settlements, members, categories, lists, balances, allTime] = await Promise.all([
    db
      .from('expenses')
      .select(
        'id, list_id, description, amount_cents, spent_on, paid_by, category_id, receipt_path, recurring_id, expense_shares(user_id, share_cents)',
      )
      .is('deleted_at', null)
      .gte('spent_on', from)
      .lt('spent_on', to)
      .order('spent_on'),
    db
      .from('expenses')
      .select('amount_cents')
      .is('deleted_at', null)
      .gte('spent_on', previousFrom)
      .lt('spent_on', from),
    db
      .from('settlements')
      .select('from_user, to_user, amount_cents')
      .is('deleted_at', null)
      .gte('settled_on', from)
      .lt('settled_on', to),
    db.from('members').select('user_id, display_name, gender, color'),
    db.from('categories').select('id, name, icon, color'),
    db.from('lists').select('id, name, icon, archived_at'),
    db.from('list_balances').select('list_id, user_id, balance_cents'),
    db.from('expenses').select('amount_cents').is('deleted_at', null),
  ])

  for (const result of [expenses, previous, settlements, members, categories, lists, balances, allTime]) {
    if (result.error) throw result.error
  }

  return {
    month,
    expenses: expenses.data as Expense[],
    previousTotal: sum((previous.data ?? []).map((e) => e.amount_cents)),
    settlements: settlements.data ?? [],
    members: members.data as Member[],
    categories: categories.data as Category[],
    lists: lists.data as List[],
    balances: balances.data ?? [],
    allTime: {
      expenses: allTime.data?.length ?? 0,
      spentCents: sum((allTime.data ?? []).map((e) => e.amount_cents)),
    },
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('KANGAROOSPLIT_RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env('KANGAROOSPLIT_REPORT_FROM'), to, subject, html }),
  })
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`)
}

Deno.serve(async (request) => {
  if (request.headers.get('x-webhook-secret') !== env('KANGAROOSPLIT_WEBHOOK_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }

  const options = (await request.json().catch(() => ({}))) as {
    month?: string
    to?: string
    dryRun?: boolean
  }
  const month = options.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(options.month) ? options.month : previousMonthInLisbon()

  const report = await loadReport(month)

  const { data: users, error } = await db.auth.admin.listUsers({ perPage: 200 })
  if (error) throw error
  const emailById = new Map(users.users.map((user) => [user.id, user.email]))

  const sent: string[] = []
  const failed: string[] = []
  const previews: Record<string, string> = {}

  for (const member of report.members) {
    const email = emailById.get(member.user_id)
    if (!email || (options.to && email !== options.to)) continue
    const html = render(report, member)
    if (options.dryRun) {
      previews[email] = html
      continue
    }
    try {
      await sendEmail(email, `🦘 O resumo de ${monthLabel(month)}`, html)
      sent.push(email)
    } catch (err) {
      console.error('Report email failed', member.user_id, err)
      failed.push(member.user_id)
    }
  }

  return Response.json(options.dryRun ? { month, previews } : { month, sent: sent.length, failed: failed.length })
})
