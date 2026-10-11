# KangarooSplit — Design brief

## What this is

KangarooSplit is a private expense-splitting app for exactly two people: a couple who share household costs and occasionally track separate pots of spending such as a holiday. Think Splitwise, cut down to what two people need.

It is a web app installed to the iPhone home screen (a PWA), not a native app. The goal is for it to be indistinguishable from a native iOS app at a glance.

## Design goals

- **Feels native on iPhone.** Follow iOS conventions: bottom tab bar, large titles, sheets that slide up from the bottom, grouped inset lists, system font (SF Pro via `-apple-system`), system-like spacing and corner radii.
- **Fast to add an expense.** This is the action performed most. It must be one tap away from every main screen, and finishable with amount, description and one confirmation.
- **The balance is the hero.** At any moment the user wants one answer: who owes whom, and how much.
- **Calm, friendly, a little playful.** It is used by two people who like each other. The name is KangarooSplit; a subtle kangaroo touch in the icon or empty states is welcome, but the UI should not be cartoonish.
- **Light and dark mode**, both designed, following the system setting.

## Hard constraints

- **Viewport:** iPhone only, portrait. Design at 390 × 844 (iPhone 14/15). Must also hold at 375 wide.
- **Safe areas:** runs fullscreen with no browser chrome. Respect the top notch / Dynamic Island inset and the bottom home-indicator inset. The tab bar sits above the home indicator.
- **Touch targets:** minimum 44 × 44 pt.
- **Text inputs:** font size 16 px or larger (smaller makes iOS Safari zoom the page on focus).
- **Web-buildable:** must be implementable with HTML, CSS and React. No native-only controls such as system pickers or haptics. Blur and translucency behind bars are fine.
- **Language:** all text in European Portuguese (pt-PT, not Brazilian). Use the copy provided below.
- **Formats:** money as `1.234,56 €` (dot for thousands, comma for decimals, euro sign after, with a space). Dates as `dd/MM/yyyy`, or short forms like `11 out`. Week starts on Monday.
- **Two users only.** No group members, no invitations, no "add friend". Use the sample names **Miguel** and **Mara**. Each has an avatar colour and initial.

## Core concepts

- **Lista (list):** a pot of expenses with its own balance. There is always one permanent list, **Casa** (household), which is the default. Others are created for specific topics, for example a trip, and can be archived when finished.
- **Despesa (expense):** amount, description, date, who paid, category, and how it is split between the two.
- **Divisão (split):** four modes: equal, by percentage, by exact amounts, by shares. Each list has a default ratio (for example 60/40) used to prefill new expenses.
- **Saldo (balance):** one net number per list, plus one overall number across all active lists.
- **Acerto (settlement):** recording that one person paid the other, in full or in part. Can be done for one list, or for everything at once.
- **Despesa recorrente (recurring expense):** rent, bills, subscriptions; created automatically weekly, monthly or yearly.

## Navigation

Bottom tab bar with four tabs and a prominent central add button:

| Position | Label | Purpose |
|---|---|---|
| 1 | Início | Overall balance and all lists |
| 2 | Atividade | Chronological feed of everything that happened |
| centre | + (no label) | Opens the add-expense sheet |
| 3 | Estatísticas | Spending charts |
| 4 | Definições | Profile, categories, recurring, notifications |

List detail, editors and settle-up are pushed screens or bottom sheets on top of these tabs.

## Screens

### 1. Login — *Iniciar sessão*

Shown once per device. App name and icon, email field, password field, one primary button. No sign-up link, no "forgot password" link, no social login.

- Error state: wrong credentials.

### 2. Home — *Início*

- **Overall balance card** at the top: the single net figure across all active lists, with clear direction, for example "A Mara deve-te 127,40 €" or "Deves 127,40 € à Mara". A neutral, settled state when the balance is zero.
- **Settle all** action near the balance, shown only when the balance is not zero.
- **Lists:** Casa always first and visually marked as the main one. Each row shows icon, name, optional date range, and that list's own balance with direction. Positive (you are owed) and negative (you owe) need distinct treatment that does not rely on colour alone.
- **New list** action.
- **Archived lists** entry at the bottom, collapsed.

### 3. List detail

- Header: list icon and name, with a menu for edit, archive, and recurring expenses for this list.
- Balance for this list, with a **settle up** button.
- Default split shown subtly, for example "Divisão predefinida: 60 / 40".
- Search field and filter control (category, who paid, date range).
- Expense feed grouped by month, newest first. Each row: category icon, description, date, who paid, total amount, and the viewer's own position on that expense (for example "emprestaste 20,00 €" or "deves 20,00 €").
- Settlements appear inline in the feed, styled differently from expenses.
- Recurring-generated expenses carry a small repeat marker.
- Empty state for a brand-new list.
- Archived variant: read-only, with a banner and an unarchive action.

### 4. Add / edit expense (bottom sheet)

The most important screen. Opens from the centre tab button.

- **Amount** first: large, focused on open, numeric keypad, comma as decimal separator.
- **Description.**
- **Category:** shows the current one as a chip; tapping opens a picker grid of icon + name.
- **List:** defaults to the last used list; changeable.
- **Paid by:** two-option segmented control with both avatars.
- **Date:** defaults to today.
- **Split:** a summary row showing the current split (for example "60 / 40 · 24,00 € / 16,00 €"), prefilled from the list's default. Tapping expands the split editor.
- **Note:** optional.
- **Save** button. In edit mode, also **delete**, plus a line showing who created and who last edited it and when.

Split editor: segmented control for the four modes, then two rows, one per person:

- **Igual:** no input, shows the two resulting amounts.
- **Percentagem:** one percentage field per person; must total 100 %.
- **Valor exato:** one amount field per person; must total the expense amount. Show the remaining amount live.
- **Partes:** a stepper per person (for example 2 and 1), with resulting amounts.

Show the validation state when the split does not add up.

### 5. Settle up (bottom sheet)

- **Per list:** who pays whom, amount prefilled with the full balance and editable for partial payment, date, optional note, confirm button.
- **Settle all:** one total to pay, with a breakdown of the lists it covers and the amount for each, and a single confirm button.
- Success state.

### 6. Create / edit list (bottom sheet)

Name, emoji icon picker, optional start and end dates, default split ratio for this list. In edit mode: archive, and delete with a confirmation dialog. Casa cannot be archived or deleted, so those actions are absent for it.

### 7. Recurring expenses

- List of rules: description, amount, frequency, next date, which list, paused state.
- Editor: the same fields as an expense, plus frequency (weekly / monthly / yearly), start date, optional end date. Actions: pause / resume, delete.
- Empty state.

### 8. Stats — *Estatísticas*

- Scope selector: all lists, or one list.
- Month selector with previous / next.
- Total spent this month, and each person's share of it.
- Breakdown by category: chart plus a ranked list with amount and percentage.
- Trend across the last six months.
- Empty state for a month with no expenses.

### 9. Activity — *Atividade*

Chronological feed across all lists, grouped by day. Each entry: actor avatar, sentence describing what happened, which list, time. Entry types: expense added, edited, deleted, restored; settlement recorded; list created; list archived. Deleted expenses offer a restore action.

### 10. Settings — *Definições*

Grouped inset list, iOS Settings style:

- Profile: name and avatar colour.
- Categories: list of categories with icon and colour; add, edit, archive.
- Recurring expenses: entry point to screen 7.
- Notifications: on/off toggle.
- Sign out.
- App version.

### 11. System states

- **Offline banner:** the app still shows data but is read-only. Banner at the top; add button and other write actions visibly disabled.
- **Enable notifications prompt:** a friendly in-app card or sheet explaining why, with accept and dismiss buttons. Shown before the system permission dialog.
- **Install hint:** shown when opened in Safari rather than from the home screen, explaining Share → Add to Home Screen.
- **Loading:** skeleton rows for lists and feeds.
- **Destructive confirmation:** iOS-style action sheet.
- **Toast** for brief confirmations and errors.

## Copy (pt-PT)

Use these strings. Informal second person singular ("tu").

**Tabs:** Início · Atividade · Estatísticas · Definições

**Login**
- Iniciar sessão
- Email
- Palavra-passe
- Entrar
- Email ou palavra-passe incorretos.

**Balance**
- A Mara deve-te 127,40 €
- Deves 127,40 € à Mara
- Estão quites
- Saldo total
- Acertar contas
- Acertar tudo

**Lists**
- Listas
- Casa
- Nova lista
- Listas arquivadas
- Divisão predefinida: 60 / 40
- Ainda não há despesas nesta lista.
- Adiciona a primeira despesa
- Esta lista está arquivada.
- Desarquivar

**Expense rows**
- Pago por Miguel
- Pago por ti
- emprestaste 20,00 €
- deves 20,00 €
- Recorrente

**Expense editor**
- Nova despesa
- Editar despesa
- Valor
- Descrição
- Categoria
- Lista
- Pago por
- Data
- Hoje
- Divisão
- Nota (opcional)
- Guardar
- Cancelar
- Apagar despesa
- Criada por Miguel a 11/10/2026
- Editada por Mara a 12/10/2026

**Split editor**
- Igual · Percentagem · Valor exato · Partes
- Faltam 5,00 €
- Sobram 5,00 €
- As percentagens têm de somar 100 %.
- Os valores têm de somar o total da despesa.

**Settle up**
- Acertar contas
- Miguel paga a Mara
- Valor
- Registar pagamento
- Acertar tudo: 127,40 €
- Inclui 3 listas
- Contas acertadas!

**List editor**
- Nova lista
- Editar lista
- Nome
- Ícone
- Data de início (opcional)
- Data de fim (opcional)
- Divisão predefinida
- Arquivar lista
- Apagar lista
- Apagar esta lista e todas as suas despesas? Esta ação não pode ser anulada.

**Recurring**
- Despesas recorrentes
- Nova despesa recorrente
- Frequência
- SemMaral · Mensal · Anual
- Começa a
- Termina a (opcional)
- Próxima: 01/11/2026
- Em pausa
- Pausar
- Retomar
- Ainda não tens despesas recorrentes.

**Stats**
- Estatísticas
- Todas as listas
- Total do mês
- Parte de Miguel
- Parte de Mara
- Por categoria
- Últimos 6 meses
- Sem despesas neste mês.

**Activity**
- Atividade
- Hoje · Ontem
- Miguel adicionou "Jantar" · 40,00 €
- Mara editou "Supermercado"
- Mara apagou "Táxi" · 12,50 €
- Miguel restaurou "Táxi"
- Miguel pagou 127,40 € a Mara
- Mara criou a lista "Férias Açores"
- Miguel arquivou a lista "Férias Açores"
- Restaurar

**Settings**
- Definições
- Perfil
- Nome
- Cor
- Categorias
- Nova categoria
- Notificações
- Terminar sessão
- Versão 1.0.0

**System states**
- Sem ligação. Só podes consultar.
- Ativar notificações
- Recebe um aviso quando a Mara adicionar ou alterar uma despesa.
- Ativar
- Agora não
- Instala a aplicação: toca em Partilhar e depois em "Adicionar ao ecrã principal".
- Anular
- Algo correu mal. Tenta outra vez.

**Categories (preset)**

| Name | Emoji |
|---|---|
| Supermercado | 🛒 |
| Renda | 🏠 |
| Contas | 💡 |
| Restaurantes | 🍽️ |
| Transportes | 🚗 |
| Viagens | ✈️ |
| Saúde | 💊 |
| Lazer | 🎉 |
| Outros | 📦 |

## Sample data for mocks

Viewer is Miguel.

**Lists**

| List | Icon | Dates | Balance |
|---|---|---|---|
| Casa | 🏠 | — | A Mara deve-te 84,90 € |
| Férias Açores | ✈️ | 02/08/2026 – 12/08/2026 | A Mara deve-te 62,50 € |
| Prenda da mãe | 🎁 | — | Deves 20,00 € à Mara |

Overall: A Mara deve-te 127,40 €.

**Expenses in Casa (60 / 40 default split)**

| Date | Description | Category | Paid by | Amount |
|---|---|---|---|---|
| 10/10/2026 | Continente | Supermercado | Miguel | 86,35 € |
| 08/10/2026 | Jantar no Ramiro | Restaurantes | Mara | 74,00 € |
| 05/10/2026 | Eletricidade | Contas | Miguel | 61,20 € |
| 03/10/2026 | Passe Navegante | Transportes | Mara | 40,00 € |
| 01/10/2026 | Renda (recorrente) | Renda | Miguel | 1.150,00 € |
| 28/09/2026 | Farmácia | Saúde | Mara | 18,45 € |

## Deliverables

1. All eleven screens above in light mode, with dark-mode versions of at least Home, List detail and Add expense.
2. The add-expense sheet in all four split modes, plus one validation-error state.
3. Empty, loading and offline states.
4. A small component sheet: colours, type scale, spacing, buttons, inputs, list rows, chips, avatars, tab bar, sheet, toast.
5. A proposed app icon.

## Out of scope

Do not design: sign-up or password reset, more than two people, multiple currencies, receipt photos, payment-provider integrations, data export, iPad or desktop layouts.
