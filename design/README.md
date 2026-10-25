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
| 3 List detail | `Lista.dc.html` (balance card has the "Despesas recorrentes" row) | `ListaVazia` (`variant="vazia"`), `ListaArquivada` (`variant="arquivada"`), `ListaEscuro` (`dark`), `ListaLoading` (`loading`) |
| 4 Add / edit expense (sheet) | `Despesa.dc.html` | `DespesaTeclado` (on open, keypad + quick details card), `DespesaIgual`, `DespesaPercentagem`, `DespesaExatoErro` (validation error), `DespesaPartes`, `DespesaEditar` (`variant="editar"`), `DespesaRecorrente` (`variant="recorrente"`), `DespesaEscuro` (`dark`) |
| 5 Settle up (sheet) | `Acerto.dc.html` | `AcertarTudo` (`variant="tudo"`), `AcertoSucesso` (`variant="sucesso"`) |
| 6 Create / edit list (sheet) | `NovaLista.dc.html` | `EditarLista` (`edit`) |
| 7 Recurring expenses | `Recorrentes.dc.html` | `RecorrentesVazio` (`empty`); the editor is `DespesaRecorrente` |
| 8 Estatísticas | `EstatisticasCalendario.dc.html` (full scrolled page, interactive; prop `day`, `full`) | `Estatisticas` (top of the page, no day selected), `EstatisticasPrevista` (15 Oct selected: future recurring expense), `EstatisticasLoading` (`loading`) |
| 9 Atividade | `Atividade.dc.html` (now a pushed screen, opened from the bell on Início) | — |
| 10 Definições | `Definicoes.dc.html` | — (includes the profile photo upload) |
| 11 System states | `Notificacoes`, `Instalar`, `ConfirmarApagar` (iOS action sheet), `Toast`, `Novidades` (what's new after an update) | offline and loading: see Início |
| 12 Year in review | `ResumoAno.dc.html` (story player, interactive; prop `slide` 0–8, prop `festive`) | `ResumoAnoTotal` (1), `ResumoAnoCategoria` (2), `ResumoAnoPagamentos` (3), `ResumoAnoMes` (4), `ResumoAnoMomentos` (5), `ResumoAnoReacoes` (6), `ResumoAnoAcertos` (7), `ResumoAnoFim` (8) |
| Shared | `TabBar.dc.html` (tab bar + raised "+"), `Componentes.dc.html` (component sheet), `Icone.dc.html` (app icon) | |
| Mascot | `Guru.dc.html` (the mascot component, prop `pose` = `normal` / `ola` / `vazio` / `compras` / `sucesso` / `dormir`, prop `crop` for a head-only avatar; every pose is a 3D image from `assets/guru/`; `crop` is still vector), `Mascote.dc.html` (mascot sheet) | |
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
- On open, the sheet shows amount, description, a **quick details card** (see "Add expense — quick details card" below) and the keypad, so the user can save after amount, description and one tap. Closing the keypad shows the full form.
- The split row is collapsed by default ("60 / 40 · 24,00 € / 16,00 €"). Tapping it expands the editor with three modes: Igual, Percentagem, Valor exato. The "Partes" mode was removed from the app; ignore `DespesaPartes` and the "Partes" segment in the mockups.

### Sample data correction
- With the brief's Casa expenses and a 60 / 40 split, Mara owes 439,55 €. The mockups add a settlement "A Mara pagou-te 354,65 €" on 06/10/2026, so the Casa balance is 84,90 € as the brief says.

### Statistics
- The six-month trend is a small bar chart inside the "Total do mês" card. The category breakdown is a stacked bar and a ranked list. Category colours are fixed (`--ks-cat-1…6` in `tokens.css`) and must not change when a filter changes.

## Mascot — Guru

Guru is a kangaroo with a pouch full of coins. The name comes from "canGURU". The pouch and coins match the app icon.

- Guru is a **3D character** (cute, Pixar-style, caramel fur, cream belly, a pouch of gold coins and a **violet bandana `#6847F0`** round the neck). All six poses are transparent WebP images in `assets/guru/` (`normal`, `ola`, `vazio`, `compras`, `sucesso`, `dormir`, square, 640 px). `compras` is Guru behind an empty shopping cart; the wire basket is semi-transparent in places, so it looks best on the normal backgrounds. In the web app they live in `web/public/guru/`. All of them are the same character, so keep them looking the same: if a pose is added, generate it from one of these as a reference.
- Build it as one React component, `<Guru pose="..." size={...} crop? />`, from `screens/Guru.dc.html`. `size` is the width in pixels and, for the 3D poses, also the height (the images are square).
- The 3D poses are drawn with `<img>` plus a small SVG on top that adds the extras the image does not contain: the `zzz` for `dormir` and the floating coins and sparkles for `sucesso`, in `#6847F0` and `#FFC94A`. Each `<sc-if>` in that file shows or hides one part. `renderVals()` lists the poses and which ones are 3D (`photo`).
- The head-only `crop` avatar is **not drawn in 3D yet**. It keeps the older flat vector drawing in the same file, with the same colours (fur `#E3A465`, darker fur `#C98448`, belly `#F7DEC2`, coins `#FFC94A`, bandana `#6847F0`). It is used only for the small offline avatar in the Início mockup (`Main.dc.html`); the web app shows the full `dormir` image there. `normal` is not used on any screen.
- The bandana is always `#6847F0`. It does not follow the signed-in person's colour. The images are the same in light and dark mode (transparent background).
- Give the image a pt-PT `alt` (the labels are in `renderVals()`), or an empty `alt` with `aria-hidden="true"` when it is only decoration next to text.
- Use Guru only in these places. Never use it on work screens (lists, forms, statistics):

| Pose | Where | Screen file |
|---|---|---|
| `compras` | Empty shopping list (Compras tab) | `Compras.dc.html` (`variant="vazia"`), `ComprasVazia.dc.html` |
| `vazio` | Empty list, empty recurring expenses | `Lista.dc.html` (`variant="vazia"`), `Recorrentes.dc.html` (`empty`) |
| `sucesso` | "Contas acertadas!" after a settlement | `Acerto.dc.html` (`variant="sucesso"`) |
| `ola` | Login, "Ativar notificações" prompt | `Login.dc.html`, `Notificacoes.dc.html` |
| `dormir` (`crop`, vector head) | Offline banner | `Main.dc.html` (`offline`) |
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
Guru (`compras`, behind an empty cart), "A lista está vazia.", "Escreve acima ou toca num artigo habitual.", plus the "Habituais" chips.

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

## Add expense — quick details card

Replaces the old quick chips on `DespesaTeclado` (keypad open). The chips confused users, and the payer chip changed width ("Pago por ti" → "Pago pela Mara") and wrapped to a new line.

Order of the sheet when the keypad is open: amount card → quick details card → flexible space → keypad.

The quick details card is one white card (20px radius). It uses **the same rows, in the same order and with the same look as the full form**, so the two views feel like one form:

1. **Categoria** row (48px): label left (17px), value in a grey pill (`fill`, 15px, padding 5px 10px), chevron (14px, secondary colour). Opens the category picker.
2. **Lista** row (48px): same style, for example "🏠 Casa". Opens the list picker.
3. **Data** row (48px): same style, default "Hoje". Opens the date picker.
4. **Pago por** row (56px): the same segmented control as the full form, with avatar (28px) and first name ("Miguel" / "Mara") in each segment. Both names are always visible, so a tap only moves the white selection and the layout never moves. Default: the viewer.
5. **Mais detalhes · divisão, nota** button (46px): full width, background `#F8F6FF` (dark `#211B36`), accent text, ⊕ icon. Closes the keypad and shows the full form.

**Category colour:** the Categoria pill (quick card and full form) uses the category's own colour (`categories.color`; the mockup uses the chart colours in `--ks-cat-*`): background = colour at 14% opacity (dark: 24%), inset 1.5px ring = colour at 55% (dark: 70%), text stays the normal text colour for contrast. The Lista and Data pills stay grey (`fill`).

**Divisão is not in the quick card.** Most expenses use the list's default split, so the split is only on the full form ("Mais detalhes"). An expense saved from the quick view uses the default split of the selected list. If the user changes the list, the split follows that list's default.

Keypad keys are **50px** high (were 56px) so everything fits on a 390×844 screen.

## Lista — recurring expenses entry

The balance card on `Lista` has a **"Despesas recorrentes"** row below the default split line: icon tile, label, count of recurring expenses in this list, and a chevron. It opens `Recorrentes`, filtered to this list. "Despesas recorrentes" is no longer in the ⋯ menu.

## Scrolling screens

`Main` and `Lista` scroll vertically under the tab bar. Cards in a scrolling column must not shrink (`flex: none` / `flex-shrink: 0`). If they can shrink, `overflow: hidden` cards collapse (the Saldo total card collapsed when the Casa card got taller).

## To implement — design changes of 17 Oct 2026

Do these in order. Each item points to its spec section in this file and to the mockup.

1. **Quick details card on the new-expense sheet** (`web/src/sheets/ExpenseSheet.tsx`, keypad mode).
   Mockup: `DespesaTeclado` (light) and `Despesa` with `keypad` + `dark`. Spec: "Add expense — quick details card".
   - Remove the row of chips (category, list, payer, split, "Mais"). Remove the split chip (`splitChip`) from keypad mode.
   - Add one card with the rows Categoria, Lista, Data and Pago por. Use the same row component as the full form, so both views look the same.
   - Add the "Mais detalhes · divisão, nota" button at the bottom of the card. It does `setKeypad(false)`.
   - Make the keypad keys 50px high.
   - When the list changes, set the split to that list's default split. Saving from keypad mode uses that split.
2. **Category colour on the Categoria pill** (quick card and full form). Spec: "Category colour".
   Use `categories.color`: background 14% alpha (24% dark), inset 1.5px ring 55% alpha (70% dark), normal text colour.
3. **"Despesas recorrentes" row on the list balance card** (`web/src/screens/ListDetail.tsx`). Mockup: `Lista`. Spec: "Lista — recurring expenses entry".
   - Show the row below the default split line, with the count of recurring expenses in this list (active and paused).
   - It opens `recorrentes` filtered to this list. Add a list filter to `Recurring` (for example `recorrentes?lista=<id>`). Show the list name in the title or as a removable filter chip, so the user can see all lists again.
   - Remove "Despesas recorrentes" from the list's ⋯ menu.
4. **Scrolling and no collapsing cards** on Início and Lista. Spec: "Scrolling screens". Cards in a scrolling column use `shrink-0`. Check Início with 3 recent expenses on a 390×844 screen: the "Saldo total" card must keep its full height.
5. **Check Estatísticas against the mockup.** `Estatisticas` and `EstatisticasCalendario` were out of date in this folder until now. The order is: Total do mês → Por categoria → Calendário. Spec: "Statistics — calendar".
6. Add a changelog entry (see `CLAUDE.md`).

Screenshots in `design/screenshots/` are not yet updated for these changes. The `.dc.html` files are the source of truth.

## What's new sheet — Novidades

Mockup: `Novidades.dc.html` (shown over Início). It tells the user about the new features after an update.

**Layout** (same sheet style as `Notificacoes`: white, 32px radius, 8px from the screen edges, 38% black scrim):

- **Close button** at the top right: 44×44 touch area, 30px grey circle (`fill`) with a × icon (secondary text colour). There is no "Continuar" button.
- **Guru** (`sucesso` pose, 3D, 96px square) with a **version badge** at its top right ("1.4.0", accent background, white text, 3px white border).
- **Title:** "O que há de novo" (22px, bold, centred).
- **Up to 3 rows:** a 40px icon tile (12px radius, soft colour + matching icon colour), a title (16px semibold) and one line of text (14px, secondary colour).
- **"Ver todas as novidades"** text button (accent, 15px semibold, 44px high). It opens the Novidades screen (the `novidades` route, the existing `Changelog` screen) and closes the sheet.

**Close:** the ×, a tap on the scrim and a swipe down all close the sheet.

**When to show it:**

- Show it one time only, on the first app open after the version changes. Store the last seen version on the device (for example in `localStorage` as `ks.lastSeenVersion`). Show the sheet when the newest changelog version is greater than the stored value, and then store the new version.
- Do not show it on the first use: when there is no stored version, store the current version and show nothing.
- Show it only when the newest entry has `highlights` (see below). Small fixes have no highlights, so no sheet shows.
- Show it on Início only, after login. Do not show it over another sheet or over the notifications prompt. If both are pending, show Novidades first.
- If the user skips several versions, look at all entries newer than the stored version and show the highlights of the newest one that has highlights.
- The release that adds this sheet has no stored version yet on any phone, so the first-use rule applies and no sheet shows. The first sheet appears with the next release that has `highlights`.

**Data:** add an optional `highlights` field to `ChangelogEntry` in `web/src/data/changelog.ts`:

```ts
highlights?: { title: string; text: string; icon: string; tone: 'accent' | 'teal' | 'orange' }[]  // max 3
```

`tone` picks the tile colours: accent `#EFEAFE` / `#5B3FD9`, teal `#E3F6F3` / `#0F6E63`, orange `#FFF1E6` / `#A3520F`. In dark mode, use the same hue at about 24% alpha on the dark surface. The copy is pt-PT and addresses the viewer as "tu". Keep `changes` as the full list for the Novidades screen.

Mockup copy for 1.4.0 (you can use it as the first `highlights`):

1. "Detalhes rápidos ao adicionar" — "Categoria, lista, data e quem pagou ficam logo por cima do teclado." (accent, plus icon)
2. "Categorias com cor" — "Cada categoria aparece com a sua cor, como nas estatísticas." (teal, tag icon)
3. "Recorrentes de cada lista" — "Vê as despesas recorrentes no cartão de saldo de cada lista." (orange, repeat icon)

### To implement — what's new sheet

1. Add `highlights` to `ChangelogEntry`. Add the 1.4.0 highlights below to the 1.4.0 entry, so the Novidades screen and future tests have real data.
2. Make a `WhatsNewSheet` component that follows the mockup and the rules above.
3. Show it from Início with the "last seen version" logic. Add tests for the version compare and for the first-use case.
4. Add a changelog entry for this feature (see `CLAUDE.md`). That entry has no `highlights`, so the sheet does not show for it.

## Amounts — no lighter decimals

Show every amount in one colour. Do not show the decimals ("…,40 €") in a lighter colour or a lighter weight. This applies to the "Saldo total" card on Início, the "Total do mês" card in Estatísticas, the amount field in Acertar contas and the amount on the new-expense sheet.

### Status

The immersive Início header was tried and dropped (17 Oct 2026). Início keeps the "Saldo total" card. Only the single-colour amounts stay. The app already has both changes (1.5.1), so there is nothing to implement here. `InicioScroll.dc.html` belongs to the dropped design: ignore it, or delete it.

## Loading states — Lista and Estatísticas

Mockups: `ListaLoading` (`Lista` with `loading`) and `EstatisticasLoading` (`EstatisticasCalendario` with `loading`). They follow the skeleton style of `InicioLoading`.

**Common rules**

- Skeleton colour: `skel` = `#ECECF1` (dark `#2C2C2E`), on the normal white / dark cards. The cards, their radii, their padding and the gaps stay the same as in the loaded screen, so nothing moves when the data arrives.
- Keep everything that is already known as real UI: the navigation, the screen title, the list name and icon (they come from Início), the search and filter row, the "Todas as listas" picker, the month selector, the section titles ("Por categoria", "Calendário") and the weekday letters.
- Animation: a slow pulse, opacity 1 → 0.45 → 1 over 1.4 s, ease-in-out, on every skeleton block. When `prefers-reduced-motion` is on, use no animation.
- Show the skeleton only for the first load, when there is no data yet. When the data is cached (for example after you go back to the screen), show the cached data at once and refresh it in the background without a skeleton. Do not show the skeleton for less than about 300 ms, so the screen does not flash.
- Accessibility: put `aria-busy="true"` on each loading section and give it a label ("A carregar o saldo", "A carregar as categorias", "A carregar o calendário"). The skeleton blocks themselves are `aria-hidden`.
- If loading fails, show the existing error toast ("Algo correu mal. Tenta outra vez.") and keep the skeleton until the user pulls to refresh, or until the app is online again.

**Lista**

- Balance card: 2 bars for the label (110×14) and the amount (150×30), a 128×44 block in place of "Acertar contas", the split bar (48×6) with a 190×12 text bar, and the "Despesas recorrentes" row as a 28px square plus a 160×14 bar.
- Expenses: 2 month groups. Each group has a header with 2 bars (month name and total) and a card with skeleton rows (4 rows, then 2 rows). Each row: a 42px rounded square, 2 text lines on the left (14px and 11px high, different widths) and 2 short lines on the right. Row height and separators are the same as the real rows.
- Do not show the empty state (Guru "vazio") while the list loads.

**Estatísticas**

- Total do mês: bars for the label, the amount (168×34) and the comparison line, 6 grey bars in place of the 6-month chart, the full-width split bar, and 2 person rows (28px circle + 2 lines).
- Por categoria: real title, a grey count bar, a grey stacked bar and 4 skeleton rows (colour square, icon square, name bar, % bar, amount bar).
- Calendário: real title and weekday letters, a grey "N despesas" bar, and the 31 day cells in `#F4F4F7` with the day number in `#B4B4BC`. There are no amounts or dots, the cells cannot be selected and no day panel shows.

### To implement — loading states

1. Add a shared `Skeleton` block component (the colour, the radius and the pulse above) if there is not one yet.
2. Lista (`ListDetail.tsx`): skeleton balance card and expense groups for the first load.
3. Estatísticas (`Stats.tsx`): skeleton Total do mês, Por categoria and calendar cells for the first load and when the month changes with no cached data.
4. Add a changelog entry (see `CLAUDE.md`).

## Year in review — "O vosso 2026"

Mockups: `ResumoAno.dc.html` (interactive story player; open it in Play mode and tap) and the 8 static wrappers in the screen map. It is a full-screen summary of the couple's year, in the style of Spotify Wrapped. **Only this feature is in scope now.** The Christmas theme (snow, garland, Guru with a hat, "Boas festas" sheet) is a separate exploration on the canvas and is **not** part of this spec. The `festive` prop (snow) stays `false`.

### Entry points

- **Início card**, from 24 December to 31 January: a card under "Saldo total", in the style of the existing cards (white surface, 20px radius). It shows Guru `sucesso` (64px), the title "O vosso {ano}" and a subtitle "{N} despesas e {M} acertos · Ver o resumo do ano", with a chevron. A tap opens the story player. The card can be closed with a small ×, which hides it until the next year.
- **Estatísticas**: in the same period, a row at the top, "Resumo de {ano}" ›, that opens the player. After 31 January the row moves to the year selector, so older summaries stay available (only for years with enough data).
- There is no automatic pop-up.
- Show the entry points only when the year has at least **20 expenses**.

### Story player

- Full screen, over everything (status bar light/dark to match each story). It has 9 stories, each with its own background gradient (the colours are in `ResumoAno.dc.html`, `T`).
- Top: 9 progress segments (3px, 4px gap, 12px side margin), then the Mi/Ma avatars, "O vosso {ano}" and a close button (44×44).
- **Navigation:** tap the right 65% to go forward and the left 35% to go back. Swipe down or tap × to close. Optional: the story advances by itself after about 6 s (the current segment fills); a long press pauses it. With VoiceOver, show "Seguinte" / "Anterior" buttons and do not auto-advance.
- **Motion:** a short entrance per story (text rises 18px and fades in over 0.6 s with small delays, bars grow from 0). With `prefers-reduced-motion`, there is no animation and no auto-advance.
- Typography: big numbers 72–96px, weight 900, tabular. Body 17–26px bold. All pt-PT; address the couple ("vocês" form: "dividiram", "trocaram").

### The 9 stories and their data

Year = calendar year of the summary, all lists (archived ones included). Ignore soft-deleted rows. Expenses do not include settlements.

| # | Story | Data |
|---|---|---|
| 0 | Intro "Miguel & Mara · O vosso {ano}" + Guru `sucesso` | names of the 2 members |
| 1 | "Este ano dividiram {total} em {N} despesas" + tiles "{total ÷ days} por dia" and "{L} listas" (first 3 names) | sum of `expenses.amount`; days = days elapsed in the year (365/366 after 31 Dec); lists with at least 1 expense in the year |
| 2 | Category of the year (emoji, name, total, number of expenses, a friendly frequency line) + top-5 bars, relative to #1 | group by category |
| 3 | Who paid what: 2 blocks in the person colours, % of the total, amount and count. A line that compares the count and the average ("pagou mais vezes" / "pagou as maiores"). | group by payer |
| 4 | Most expensive month + 12-month bar chart (the top month in gold `#FFC94A`). The line names the list with most spend in that month, when it is not the main list ("as férias nos Açores"). | group by month |
| 5 | Moments: biggest expense, smallest expense (> 0), favourite restaurant (most frequent description in the Restaurantes category, with count and total) | — |
| 6 | Reactions: total reactions, total comments, top 4 emojis (size scales with count), most commented expense | `expense_reactions`, `expense_comments` |
| 7 | Settle-ups: count, a fun line, and a white card: "Entram em {ano+1} quites" when the net balance across lists is 0, otherwise "Faltam {x} para ficarem quites". Last settlement date and amount. | `settlements`, `list_balances` |
| 8 | Thank you + Guru `ola` + "Partilhar o vosso ano" + "Ver outra vez" | — |

- **Skip a story** when it has no data (for example no reactions, no restaurants, or no settlements). The progress bar then has fewer segments.
- **Share:** render a 1080×1920 image of a summary card (total, top category, months, quites) and use the Web Share API with a file. If the API cannot share files, download the PNG.
- Compute everything on the client from data the app already loads, or with one Supabase RPC (`year_summary(year int)`) if that is simpler. Cache the result for the session.

### To implement — year in review

1. Add the year summary data (client helper or `year_summary` RPC) with unit tests for each number above, including leap years and archived lists.
2. Build the story player component (progress, tap zones, close, motion, reduced motion, accessibility) and the 9 stories, following `ResumoAno.dc.html`.
3. Add the Início card and the Estatísticas entry with the date rules and the 20-expense minimum.
4. Add sharing (image + Web Share API, PNG fallback).
5. Add a changelog entry (see `CLAUDE.md`).

## Not shown in the mockups

- Category editor sub-screen (add / edit / archive a category). Follow the `NovaLista` sheet pattern.
- Filter sheet for list detail (category, who paid, date range).
- Pull-to-refresh, and the conflict when both people edit the same expense.
