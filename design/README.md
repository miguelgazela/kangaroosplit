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
| 8 Estatísticas | `Estatisticas.dc.html` | — |
| 9 Atividade | `Atividade.dc.html` | — |
| 10 Definições | `Definicoes.dc.html` | — (includes the profile photo upload) |
| 11 System states | `Notificacoes`, `Instalar`, `ConfirmarApagar` (iOS action sheet), `Toast` | offline and loading: see Início |
| Shared | `TabBar.dc.html` (tab bar + raised "+"), `Componentes.dc.html` (component sheet), `Icone.dc.html` (app icon) | |

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
- The split row is collapsed by default ("60 / 40 · 24,00 € / 16,00 €"). Tapping it expands the editor with the four modes.

### Sample data correction
- With the brief's Casa expenses and a 60 / 40 split, Mara owes 439,55 €. The mockups add a settlement "A Mara pagou-te 354,65 €" on 06/10/2026, so the Casa balance is 84,90 € as the brief says.

### Statistics
- The six-month trend is a small bar chart inside the "Total do mês" card. The category breakdown is a stacked bar and a ranked list. Category colours are fixed (`--ks-cat-1…6` in `tokens.css`) and must not change when a filter changes.

## Not shown in the mockups

- Category editor sub-screen (add / edit / archive a category). Follow the `NovaLista` sheet pattern.
- Filter sheet for list detail (category, who paid, date range).
- Pull-to-refresh, and the conflict when both people edit the same expense.
