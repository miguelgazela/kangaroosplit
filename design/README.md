# KangarooSplit — design reference

This folder holds the approved UI mockups for the app in `web/`. Read this file before you build or change any screen.

- `tokens.css`: colours (light and dark), radii, type scale and layout constants as Tailwind v4 theme variables. Use these values. Do not invent new colours or sizes.
- `screens/*.dc.html`: one file per mockup screen (390 × 844, iPhone 14/15). These files are the visual source of truth.
- `../DESIGN_BRIEF.md`: the original brief. **The "Decisions" section below overrides it where they differ.**

## How to read the screen files

The files come from a design canvas, so they are not production code. **Rebuild each screen as React + Tailwind components. Do not copy the markup.**

- All styles are inline. Read them for exact sizes, spacing, radii, font weights and colours. Map each value to a token in `tokens.css`.
- `{{ name }}` is a value from the `<script>` block at the bottom of the file (`renderVals()`). That block also holds the light and dark palettes (`const c = dark ? {...} : {...}`) and the sample data.
- `<sc-if value="{{x}}">` means "render if x". `<sc-for list="{{xs}}" as="x">` means "repeat for each x".
- `<dc-import name="TabBar" ...>` embeds another screen file (`TabBar.dc.html`) with props. In the app, these are shared components.
- Ignore `support.js`, `<x-dc>`, `<helmet>`, `hint-*` attributes, `data-props` and `canvas.json`. They exist only for the canvas.
- The fixed 390 × 844 frame, the 54px top padding (status bar) and the 34px bottom padding (home indicator) are mockup values. In the app, use `env(safe-area-inset-top/bottom)` and a fluid width (it must also work at 375px).
- Sample data (names, amounts, dates) is for the mockups only. Real data comes from Supabase.

## Screen map

Several files are small wrappers that show a variant of a main file. The variant is set by the props on the `<dc-import>`.

| Screen (brief §) | Main file | Variants |
|---|---|---|
| 1 Login | `Login.dc.html` | `LoginErro` (prop `error`) |
| 2 Início | `Main.dc.html` | `InicioOffline` (`offline`), `InicioLoading` (`loading`), `InicioEscuro` (`dark`) |
| 3 List detail | `Lista.dc.html` | `ListaVazia` (`variant="vazia"`), `ListaArquivada` (`variant="arquivada"`), `ListaEscuro` (`dark`) |
| 4 Add / edit expense (sheet) | `Despesa.dc.html` | `DespesaTeclado` (on open, keypad), `DespesaIgual`, `DespesaPercentagem`, `DespesaExatoErro` (validation error), `DespesaPartes`, `DespesaEditar` (`variant="editar"`), `DespesaRecorrente` (`variant="recorrente"`), `DespesaEscuro` (`dark`) |
| 5 Settle up (sheet) | `Acerto.dc.html` | `AcertarTudo` (`variant="tudo"`), `AcertoSucesso` (`variant="sucesso"`) |
| 6 Create / edit list (sheet) | `NovaLista.dc.html` | `EditarLista` (`edit`) |
| 7 Recurring expenses | `Recorrentes.dc.html` | `RecorrentesVazio` (`empty`); the editor is `DespesaRecorrente` |
| 8 Estatísticas | `EstatisticasCalendario.dc.html` (full scrolled page, interactive; prop `day`, `full`) | `Estatisticas` (top of the page, no day selected), `EstatisticasPrevista` (15 Oct selected: future recurring expense) |
| 9 Atividade | `Atividade.dc.html` (now a pushed screen, opened from the bell on Início) | — |
| 10 Definições | `Definicoes.dc.html` | — (includes the profile photo upload) |
| 11 System states | `Notificacoes`, `Instalar`, `ConfirmarApagar` (iOS action sheet), `Toast` | offline and loading: see Início |
| Shared | `TabBar.dc.html` (tab bar + raised "+"), `Componentes.dc.html` (component sheet), `Icone.dc.html` (app icon) | |
| Mascot | `Guru.dc.html` (the mascot component, prop `pose` = `normal` / `ola` / `vazio` / `sucesso` / `dormir`, prop `crop` for a head-only avatar), `Mascote.dc.html` (mascot sheet) | |
| Comments and reactions | `DespesaDetalhe.dc.html` (expense detail sheet: summary, reactions, comment thread) | `DetalheVazio` (`variant="vazia"`), `DetalheAcoes` (long-press on own comment), `ReacaoRapida` (long-press on a list row), `DetalheEscuro` (`dark`). `Lista` and `Atividade` also changed. |
| Shopping list (Compras tab) | `Compras.dc.html` (interactive; prop `variant`) | `ComprasEscrever` (typing, suggestions), `ComprasArtigo` (edit item sheet), `ComprasVazia` (empty), `ComprasOffline` (no signal). `Navegacao` shows the chosen tab layout. |

## Decisions (these override DESIGN_BRIEF.md)

### Voice and copy
- The viewer is always "tu". The other person is always named. Examples: "Adicionaste “Continente”", "A Mara apagou “Táxi”", "A Mara paga-te", "Pagas 20,00 € à Mara", "Criada por ti a …", "Editada pela Mara a …", "A tua parte" / "Parte da Mara", "Pago por ti" / "Pago pela Mara".
- The brief's third-person strings for the viewer ("Miguel adicionou…", "Miguel paga a Ana", "Parte de Miguel") are replaced by the forms above.
- Default split ratios are always written in the order **Miguel / Mara** (for example "60 / 40" = Miguel 60 %, Mara 40 %).

### People and avatars
- Initials are two letters, "Mi" and "Ma", because both names start with M.
- Each person has a different avatar colour. The other person's colour cannot be selected (it is shown disabled in Definições).
- A user can upload a profile photo (Definições → avatar or "Escolher foto"; then "Alterar foto" / "Remover"). Use `<input type="file" accept="image/*">`. When there is a photo, show it everywhere the avatar appears. With no photo, show initials on the colour.

### Balance direction
- Never use colour alone. Every balance has a text label ("deve-te" / "deves", "emprestaste" / "deves") and an arrow (↙ you receive, ↗ you pay). Settled shows "Estão quites" with a check icon.

### Add-expense sheet
- iOS sheet header: "Cancelar" (left), title (centre), "Guardar" (right). There is no Save button at the bottom, because the keyboard would hide it. "Guardar" is disabled while the split is invalid.
- The amount field uses an **in-app numeric keypad** with a "," key (`DespesaTeclado`), not the system keyboard. The iOS decimal keypad shows "," or "." depending on the phone's region setting. Also accept both "," and "." when parsing.
- On open, the sheet shows amount, description, quick chips (category, list, payer, split) and the keypad, so the user can save after amount, description and one tap. Closing the keypad shows the full form.
- The split row is collapsed by default ("60 / 40 · 24,00 € / 16,00 €"). Tapping it expands the editor with three modes: Igual, Percentagem, Valor exato. The "Partes" mode was removed from the app; ignore `DespesaPartes` and the "Partes" segment in the mockups.

### Sample data correction
- With the brief's Casa expenses and a 60 / 40 split, Mara owes 439,55 €. The mockups add a settlement "A Mara pagou-te 354,65 €" on 06/10/2026, so the Casa balance is 84,90 € as the brief says.

### Statistics
- The six-month trend is a small bar chart inside the "Total do mês" card. The category breakdown is a stacked bar and a ranked list. Category colours are fixed (`--ks-cat-1…6` in `tokens.css`) and must not change when a filter changes.

## Mascot — Guru

Guru is a kangaroo with a pouch full of coins. The name comes from "canGURU". The pouch and coins match the app icon.

- Build it as one React component, `<Guru pose="..." size={...} crop? />`, from the inline SVG in `screens/Guru.dc.html`. Keep it as inline SVG (no image files), so it stays sharp at all sizes.
- Each `<sc-if>` in that file shows or hides one part of the drawing (arms, eyes, mouth, coins, "zzz"). `renderVals()` lists which parts each pose uses.
- The colours are fixed and the same in light and dark mode: fur `#E3A465`, darker fur `#C98448`, belly `#F7DEC2`, coins `#FFC94A`, bandana = accent `#6847F0`.
- Give the SVG a pt-PT `aria-label` (the labels are in `renderVals()`), or `aria-hidden="true"` when it is only decoration next to text.
- Use Guru only in these places. Never use it on work screens (lists, forms, statistics):

| Pose | Where | Screen file |
|---|---|---|
| `vazio` | Empty list, empty recurring expenses | `Lista.dc.html` (`variant="vazia"`), `Recorrentes.dc.html` (`empty`) |
| `sucesso` | "Contas acertadas!" after a settlement | `Acerto.dc.html` (`variant="sucesso"`) |
| `ola` | Login, "Ativar notificações" prompt | `Login.dc.html`, `Notificacoes.dc.html` |
| `dormir` (`crop`) | Offline banner | `Main.dc.html` (`offline`) |
| `dormir` | Month with no expenses in Estatísticas (not drawn) | — |

## Comments and reactions

Both people can react to an expense and talk about it in a short comment thread.

### Navigation change
- **Tap an expense row → expense detail sheet** (`DespesaDetalhe`), not the edit sheet. The detail sheet header has "Fechar" (left) and "Editar" (right). "Editar" opens the existing edit sheet.
- **Long-press an expense row → context menu** (`ReacaoRapida`): background blurs, the row lifts, a reaction bar shows above it, and a menu shows below it ("Comentar", "Editar", "Apagar despesa"). "Comentar" opens the detail sheet with the comment field focused.
- Settlement rows do not get reactions or comments.

### Detail sheet (`DespesaDetalhe`)
1. **Summary card:** category icon, description, amount, "date · list · payer", the viewer's position ("Deves 44,40 € · 60 / 40", with arrow and colour as in the list), a "Recibo" button when there is a receipt, and the note ("Nota: …") when there is one.
2. **Reaction bar:** always six emojis, in this order: ❤️ 👍 😂 😮 😬 🙏.
   - Each person has **at most one reaction** per expense. Tap an emoji to set it, tap it again to remove it, tap another emoji to change it.
   - The viewer's reaction has an accent ring and `accent-soft` background (`aria-pressed="true"`).
   - The other person's reaction has a small "Ma" avatar badge on that emoji.
   - A line under the bar says it in words: "A Mara reagiu com ❤️ · Reagiste com 😂". With no reactions: "Toca num emoji para reagir."
3. **Comment thread** ("Comentários · 3"), oldest at the top, newest at the bottom, scrolled to the bottom on open.
   - The viewer's comments: right side, accent background, white text.
   - The other person's comments: left side, `surface` background, "Ma" avatar on the last bubble of a run.
   - Under each bubble: time, and "editado" if edited. Day separators: "Hoje", "Ontem", then "Quarta, 08 out".
   - Empty: "Ainda não há comentários." / "Escreve à Mara sobre esta despesa."
4. **Composer** at the bottom, above the home indicator and the keyboard: input "Escreve um comentário…" (16 px font, max 500 characters) and a round send button. The button is disabled when the text is empty or the app is offline.

### Long-press on own comment (`DetalheAcoes`)
- Menu: "Copiar", "Editar comentário", "Apagar comentário" (destructive, no confirmation, show the toast with "Anular").
- Only the author can edit or delete a comment. The other person's comments only have "Copiar".

### Indicators in the list (`Lista`)
- Reactions: up to two small emoji bubbles on the bottom-right corner of the category icon.
- Comments: speech-bubble icon and count after "date · payer". **Unread** (the other person wrote after the viewer last opened the detail sheet): filled icon, accent colour, bold count.
- The row `aria-label` includes the count and "por ler".

### Activity (`Atividade`) and notifications
- New activity entries: "A Mara comentou “Jantar no Ramiro”: “Combinado 😄”" and "A Mara reagiu com ❤️ a “Jantar no Ramiro”". Tapping one opens the detail sheet.
- Push notifications (when enabled): title "Mara comentou “Jantar no Ramiro”", body = the comment text; "Mara reagiu com ❤️ a “Jantar no Ramiro”". Never notify a person about their own action. Removing a reaction does not create an activity entry or a notification.

### Offline
- Read-only: the reaction bar and the composer are disabled, as for other write actions.

### Suggested data (adapt to DATA_MODEL.md)
- `expense_reactions`: `expense_id`, `user_id`, `emoji`, `created_at`; primary key (`expense_id`, `user_id`) = one reaction per person.
- `expense_comments`: `id`, `expense_id`, `user_id`, `body` (1–500 chars), `created_at`, `edited_at` null, `deleted_at` null.
- `expense_reads`: `expense_id`, `user_id`, `last_read_at`, for the unread state.
- Deleting an expense deletes its reactions and comments. Restoring it restores them.

## Navigation change: Compras tab and activity bell

This overrides the tab table in DESIGN_BRIEF.md.

| Position | Tab |
|---|---|
| 1 | Início |
| 2 | Compras (new) |
| centre | + (new expense, unchanged) |
| 3 | Estatísticas |
| 4 | Definições |

- **Atividade is no longer a tab.** It opens from a **bell button** in the Início header (left of the avatars). The bell has a red count badge with the number of activity entries by the other person since the viewer last opened Atividade. Opening Atividade clears it. The Atividade screen is a pushed screen with a "‹ Início" back link, and the Início tab stays active.
- The **Compras tab** has a red count badge with the number of items not yet bought. No badge at zero.
- `TabBar.dc.html`: prop `layout="a"` is the chosen layout (default). `atual` and `b` are kept only for reference.

## Shopping list — Compras

One shared shopping list for both people. It does **not** create expenses.

### Adding (must be fast)
- The add field is always at the top: "Adicionar artigo…". Enter adds the item, clears the field and **keeps the keyboard open** for the next item (`enterkeyhint="done"` is fine; do not blur on submit).
- **Quantity from text:** a leading number sets the quantity: "2 leite" → Leite ×2 (also "2x leite").
- **Automatic emoji and section:** match the text against a small pt-PT dictionary (case- and accent-insensitive) to set the emoji and the section. No match → 🛒 and "Outros". The user can change both in the edit sheet. Store the user's corrections so the same name gets the same section next time.
- **Suggestions while typing** (max 3 + "Adicionar “…”"): from the dictionary and from previously bought items. If the item is already on the list, the suggestion shows "Já na lista (n)".
- **No duplicates:** adding an item that is already on the list (not ticked) increases its quantity and shows "Leite já estava na lista. Agora são 4."
- **"Habituais" chips** under the field when it is empty: the most often bought items that are not on the list. One tap adds the item.

### Sections
Fixed order (store route): Frutas e legumes · Padaria · Laticínios e ovos · Talho e peixe · Mercearia · Congelados · Bebidas · Limpeza · Higiene · Outros. Show only sections with items, with a count.

### Managing
- **Tick** (44 × 44 checkbox, green when ticked): the item moves to "No carrinho" at the bottom, struck through and faded. Tap again to untick.
- **Tap the item name:** edit sheet (`ComprasArtigo`) with emoji, name, quantity stepper, note, section chips, "Adicionado pela Mara · ontem, 19:02" and "Apagar artigo".
- Items added by the other person show a small avatar ("Ma") on the right.
- **Bottom bar** when the cart has items: "3 no carrinho" + **"Limpar carrinho"**. It removes the ticked items and shows the toast with "Anular".
- Menu (⋯) in the header: "Limpar carrinho", "Apagar tudo" (with destructive confirmation).
- Changes from the other person appear live.

### Empty
Guru (`vazio`), "A lista está vazia.", "Escreve acima ou toca num artigo habitual.", plus the "Habituais" chips.

### Offline — different from the rest of the app
Shops often have no signal, so **this tab stays fully usable offline**. Queue the changes locally and send them when the connection returns. Show the banner "Sem rede. Podes continuar. As alterações são enviadas quando voltares a ter ligação." and a small "a enviar" marker on changed items. If both people changed the same item, the last change wins.

### Suggested data (adapt to DATA_MODEL.md)
- `shopping_items`: `id`, `name`, `emoji`, `section`, `quantity` (≥ 1), `note` null, `added_by`, `created_at`, `checked_at` null, `checked_by` null. "Limpar carrinho" deletes the rows where `checked_at` is not null.
- `shopping_history`: `name` (normalized), `emoji`, `section`, `times_bought`, `last_bought_at`, for "Habituais" and for remembered sections.
- Activity: shopping list changes do **not** create activity entries or push notifications.

## Statistics — calendar

The calendar is part of the Estatísticas page. There is no picker or separate view.

### Page order
Title + list filter ("Todas as listas") · month selector · "Total do mês" overview card · "Por categoria" · **Calendário card** (last on the page).
- Show the calendar card **only when a single month is selected** (hide it for any year or longer period).
- It uses the same list filter and month as the rest of the page.

### Calendar card
- Header "Calendário" (17 px semibold) with the number of expenses in the month on the right ("6 despesas").
- Weekday row S T Q Q S S D (week starts on Monday). 7 columns, **6 px gap** (room for the selection border), day cells 52 px high, 10 px radius.
- Each day cell, top to bottom: day number (16 px), the day total in **whole euros with €** ("86 €", "1.150 €"; use a narrow no-break space U+202F before € here only, so the sign sits close to the number), then small who-paid dots (5 px): blue = viewer, pink = other person, green = a settlement that day. Exact amounts appear in the day details.
- **Background tint** by day total (one hue, 4 steps): < 50 € `#F1EDFE`, < 100 € `#DCD3FD`, < 500 € `#B9A8F8`, ≥ 500 € accent `#6847F0` with white text. No expenses = no tint. Settlements and planned expenses do not count for the tint.
- **Today:** 1.5 px inset violet outline and bold number.
- **Planned expense** (anything dated after today: an expense you entered with a future date, or the next occurrence of a recurring rule that is not created yet): 1.5 px dashed violet border, the amount at 75 % opacity. A day with only planned expenses has no tint.
- **Days with nothing** (no expense, settlement or planned expense) are disabled: they cannot be selected.
- No legend under the calendar.

### Selecting a day
- On open, **no day is selected** and the day details are hidden.
- Tap a day to select it: a **2.5 px amber border `#F59E0B` outside the cell** (`box-shadow: 0 0 0 2.5px #F59E0B`), plus bold number. The cell colour and size do not change, and the border does not touch the neighbouring days. On today, keep the inner violet outline as well. Tap the same day again to deselect.
- The selected day's expenses appear inside the calendar card, under the grid: "SEGUNDA, 5 OUT" + day total, then one row per expense (icon, description, "list · Pago por ti / Pago pela Mara", amount, viewer position). Settlements use the settlement row style. Planned expenses show "Prevista" ("Recorrente prevista" when recurring) and no position, and are left out of the day total and of the "despesas" count in the header.
- No "add expense" shortcut in the day details.
- Each day cell has a full `aria-label`, e.g. "Segunda, 5 de outubro, 101,20 €" (+ "(hoje)", "despesa recorrente prevista", "acerto de contas").

## Início — last expenses on the Casa card

- The Casa card on Início shows the **last 3 expenses** of the Casa list, newest first, under the label "Últimas despesas".
- Each row shows the category emoji, the description, "date · Pago por ti / pela Mara" and the amount. Settlements are not shown.
- Tap a row to open the expense detail (`DespesaDetalhe`).
- Tap the card header (name, split, balance) or "Ver todas" to open the Casa list (`Lista`). The header has no chevron.
- If the list has fewer than 3 expenses, show only the ones that exist. If it has none, hide the label and the "Ver todas" link.

## Not shown in the mockups

- Category editor sub-screen (add / edit / archive a category). Follow the `NovaLista` sheet pattern.
- Filter sheet for list detail (category, who paid, date range).
- Pull-to-refresh, and the conflict when both people edit the same expense.
