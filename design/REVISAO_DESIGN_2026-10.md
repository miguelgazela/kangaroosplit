# KangarooSplit: design review changes (spec for implementation)

Date: 25 October 2026
Source of truth: the design canvas "KangarooSplit UI" (https://claude.ai/artifact/5PWVtjbYQQmTZugLfcN16X).
Look at the rows "Revisão de design: …" at the bottom of the canvas. Each revised screen is next to its original. Use the boards with "Revisto" or "Revista" in the name. Do not use the boards with "Antes" in the name, because they show the old design.

UI text stays in European Portuguese (pt-PT). Copy the UI strings in this spec exactly.

This spec is written in ASD-STE100 (Simplified Technical English).

---

## 1. Global changes

### 1.1 Accent colour = the user colour

Each person chooses a colour in Definições ("A tua cor"). The app uses this colour as the accent colour. It can be any colour from this list:

| Key | Name (UI) | Hex |
|---|---|---|
| violeta | Violeta | `#6847F0` |
| azul | Azul | `#2563EB` |
| verde | Verde | `#0B7A5C` |
| laranja | Laranja | `#B85A12` |
| petroleo | Petróleo | `#0E7490` |
| grafite | Grafite | `#4A4A55` |
| rosa | Rosa | `#C0367A` |

Two people cannot have the same colour. The colour of the other person is disabled in the picker.

Do not hard-code `#6847F0` (or any accent) in components. Derive all accent tokens from the user colour with this function:

```js
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// mix(colour, target, t): t = 0 gives colour, t = 1 gives target
const mix = (h, to, t) => {
  const a = rgb(h), b = rgb(to);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
```

| Token | Light mode | Dark mode |
|---|---|---|
| `accent` (fills: primary buttons, FAB, my chat bubbles, switch "on", checked boxes) | `hex` | `mix(hex, '#FFFFFF', 0.1)` |
| `link` (text links, nav-bar buttons, active tab, icons in buttons) | `hex` | `mix(hex, '#FFFFFF', 0.42)` |
| `accentSoft` (selected chips, "Principal" pill, Restaurar button bg) | `mix(hex, '#FFFFFF', 0.88)` | `mix(hex, '#1C1C1E', 0.72)` |
| `hero` (balance card on Início) | `hex` | `mix(hex, '#000000', 0.18)` |
| `heroBtnText` (text on the white button inside the hero card) | `hex` | `mix(hex, '#000000', 0.12)` |
| FAB shadow | `0 6px 18px rgba(hex, 0.32)` | `0 6px 18px rgba(hex, 0.45)` |

Before login, there is no user colour. The login screen uses violeta `#6847F0` (text links `#5B3FD9`).

**Rule:** use the accent only for actions, selection and the hero card. Do not use the accent for data (charts by category, money direction).

### 1.2 Semantic colours (do not change with the accent)

| Meaning | Light | Dark | Notes |
|---|---|---|---|
| "deve-te" / "emprestaste" (money comes to you) | `#0B7A5C` | `#3DD6A3` | With an arrow ↙ and the text. |
| "deves" (you owe) | text colour (`#111114`) for amounts, `#6B6B76` for small secondary text | `#F5F5F7` / `#A1A1AA` | **Changed:** it was orange `#B93D0B`. Now neutral. Keep the arrow ↗ and the text. |
| Error / destructive | `#C42B1C` | `#FF6B5E` | No change. |
| Settle-up (acerto) | coin `#FFC94A`, coin ring `#E0A21A`, icon on coin `#5A3D00`, row background `#FFF8E6` | coin same, row background `#2A2414` | **New.** Replaces the dashed violet circle. |
| Miguel / Mara person colours | their chosen colour | same | Avatars, split bars. |

Known issue (accepted for now): when the accent is verde, the accent and "deve-te" are the same green. The amounts are not tappable, so this is acceptable.

### 1.3 Typography

- Body text: no change (`-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif`).
- **New:** large titles and money amounts use the rounded system font:
  `font-family: ui-rounded, 'SF Pro Rounded', -apple-system, BlinkMacSystemFont, sans-serif;`
  Use it for:
  - Large screen titles (34 px): Início, Compras, Atividade, Estatísticas, Definições.
  - Section title "Listas" (22 px) on Início.
  - List title on Lista (30 px).
  - Money amounts that are a focus: hero balance (52/60 px, 700), list balance (32/38 px), month total in Estatísticas (36/42 px), amount in Nova despesa (48/56 px), amount in Acertar contas (48/56 px), amount in the expense detail (24 px), success title in Acertar contas (28/34 px), the "KangarooSplit" word on login (30 px).
  - Keypad digits in Nova despesa (26 px, 500).
- Keep `font-variant-numeric: tabular-nums` on all amounts.

### 1.4 Section headers and copy rules

- **No uppercase labels.** Remove `text-transform: uppercase` and letter-spacing from all section headers. Section headers are now sentence case, 15 px, weight 600, primary text colour. A count or total on the right of a header is 15 px, weight 500, secondary text colour.
  This applies to: "Últimas despesas" (here 13 px/600 secondary, inside the card), month headers in Lista ("Outubro 2026"), day headers in Atividade, aisle headers in Compras, "Perfil" in Definições, comment count in the expense detail, the selected-day title in Estatísticas.
- Do not use "·" to join items of different types. Use a comma, parentheses or a new line. Examples:
  - "A Mara apagou “Táxi” · 12,50 €" → "A Mara apagou “Táxi” (12,50 €)"
  - "Habituais · toca para adicionar" → "Habituais"
  - "Comentários · 3" → "3 comentários" (1 → "1 comentário")
  - "Hoje · Segunda, 5 out" → "Hoje, segunda-feira, 5 de outubro" / "Segunda-feira, 5 de outubro"
  - Keep "10 out · Pago por ti" in list rows (date and payer are compact metadata). Keep "Mais detalhes · divisão, nota, recibo".
- One action keeps the same name in the full flow (see 2.2).

### 1.5 Tab bar

Reference board: "Barra de separadores revista" (`TabBarRevisto`).
- Tabs: Início, Compras, (FAB +), Estatísticas, Definições. No change in order.
- Active tab colour = `link`. FAB background = `accent`, FAB shadow from 1.1.
- **Changed:** the badge on Compras is neutral, not red. Light: background `#6B6B76`, text `#FFFFFF`. Dark: background `#A1A1AA`, text `#000000`. The count is the number of items still to buy.
- Accessible name of the Compras tab: "Compras, 6 por comprar".
- The red badge stays only on the Atividade bell on Início (new activity).

### 1.6 Dark mode

All revised screens must support dark mode with the tokens in 1.1 and 1.2. Before, these screens had no dark mode: Compras, Estatísticas, Acertar contas, Atividade, Definições. Base dark tokens (no change): bg `#000000`, card `#1C1C1E`, fill `#2C2C2E`, text `#F5F5F7`, text2 `#A1A1AA`, separator `#38383A`.

Recommendation: move all colours into one shared token module (CSS custom properties or a theme object). Today each screen has its own copy of the colours.

---

## 2. Screen changes

### 2.1 Início
Board: "Início revisto, destaque violeta" (also verde, laranja and dark petróleo variants).

- Hero card ("Saldo total"):
  - Keep the original shape and decoration: radius 24 px, the two concentric circles top-right (white, opacity 0.14). Background = `hero` token.
  - **Remove** the pill "3 listas ativas".
  - Amount in the rounded font, 52/60 px.
  - "Acertar tudo" button: white background, text `heroBtnText`. It opens Acertar tudo (2.2).
- Header: **remove** the "Mi"/"Ma" avatar pair. Keep the Atividade bell with the red count badge.
- Casa card: **remove** the coloured outline ring around the card. Keep the "Principal" pill (`accentSoft` bg, `link` text).
- "Últimas despesas": sentence case (13 px, 600, secondary colour).
- Other lists (Férias Açores, Prenda da mãe): icon tile background is neutral `fill` (was a different tint for each list).
- "deves" amounts in text colour (1.2).

### 2.2 Acertar contas (settle-up) flow
Boards: "Acertar contas revisto (interativo)", "Acertar tudo revisto", "Contas acertadas revisto", "Pagamento parcial registado (novo)".

Layout:
- Merge the "who pays whom" card and the amount card into one card: avatars Ma → Mi, "A Mara paga-te", scope text ("Lista Casa" / "Todas as listas ativas"), a separator, then the label "Valor" and the amount (rounded font, 48/56 px) with "€" after it.
- Below the amount there is one status line (`role="status"`).
- The label "Acertar tudo: 127,40 €" is removed. The label is "Valor".

One list ("Acertar contas"), amount is editable:

| State | Status line | Button | Button state |
|---|---|---|---|
| Amount = balance | "Saldo da lista Casa. Para pagar só uma parte, escreve um valor mais baixo." | "Acertar 84,90 €" | enabled |
| 0 < amount < balance | "Pagamento parcial. Fica a faltar 34,90 €." | "Registar pagamento de 50,00 €" | enabled |
| amount > balance | "É mais do que o saldo da lista (84,90 €)." (error colour) | "Acertar" | disabled |
| amount empty or 0 | "Escreve um valor maior do que zero." (error colour) | "Acertar" | disabled |

All lists ("Acertar tudo"):
- The amount is **not editable** (decision: a partial payment across several lists has no clear rule).
- Status line: "Soma dos saldos das 3 listas. Para pagar só uma parte, acerta cada lista em separado."
- Breakdown card "Inclui 3 listas": each row has the list, the amount with arrow, and "deve-te" / "deves". "deves" is neutral (1.2).
- Button: "Acertar 127,40 €".
- No "Nota" field (no change).

Success screen:
- Full payment: Guru pose `sucesso`, green check + title "Contas acertadas", text "A Mara pagou-te 84,90 €.\nEstão quites na lista Casa." (all lists: "…127,40 €.\nEstão quites em todas as listas."). No "!" in the title.
- **New** partial payment: Guru pose `normal`, no check, title "Pagamento registado", text "A Mara pagou-te 50,00 €.\nAinda te deve 34,90 € na lista Casa."
- Button "Concluído" (accent).
- The Atividade entry for a settle-up uses the coin icon (2.7).

### 2.3 Lista (list detail)
Board: "Lista Casa revista".

- Title in the rounded font (30 px). Balance amount in the rounded font (32/38 px).
- Recurring row ("Despesas recorrentes"): icon tile neutral (`fill` bg, secondary icon colour).
- Search field background: light `#E5E5EA`, dark `#1C1C1E`.
- Month headers: sentence case, 15 px/600, total on the right (1.4).
- Expense rows: "deves X €" in secondary text colour (was orange). "emprestaste X €" stays green.
- "Recorrente" pill: neutral (`fill` bg, secondary text), not accent.
- Settle-up rows: gold coin icon (42 px circle `#FFC94A`, arrows icon `#5A3D00`), row background `#FFF8E6` (dark `#2A2414`), title and amount in text colour (not accent).

### 2.4 Nova despesa (new expense, keypad open)
Board: "Nova despesa ao abrir revista".

- Amount in the rounded font, 48/56 px. Cursor colour = `accent`. "€" in secondary colour.
- Description placeholder: "Descrição, por exemplo “Continente”".
- Rows Categoria / Lista / Data: no change (category pill keeps its category tint).
- Keep the "Mais detalhes" button (it also gives access to the receipt photo). **Only change the text:** "Mais detalhes · divisão, nota, recibo". Accessible name: "Mais detalhes: divisão, nota e recibo". Button background: light `mix(hex, '#FFFFFF', 0.95)`, dark `mix(hex, '#1C1C1E', 0.8)`. Text colour `link`.
- Keypad digits in the rounded font.

### 2.5 Despesa: comentários e reações (expense detail)
Board: "Despesa com comentários revista".

- Summary card:
  - Under the title, two plain lines in secondary text: "Pago pela Mara, 8 out" and "Lista Casa". No pill.
  - Amount in the rounded font, 24 px.
  - Position line: "Deves 44,40 €" in text colour with arrow ↗ (not orange), then "Divisão 60 / 40" in secondary text, then the "Recibo" button.
- Reaction summary is one sentence: "A Mara reagiu com ❤️ e tu com 😂." / "A Mara reagiu com ❤️."
- Comments header: "3 comentários", 15 px/600.
- Comment time stamps: "Mara, 21:14", "21:20, editado" (no "·").
- Input placeholder: "Escreve à Mara…" (use the other person's name).
- My bubbles use `accent`.

**New: reaction animation ("pop e faíscas")** (from the Animações exploration, card 2):
- On tap, the emoji scales: 1 → 0.8 (30 %) → 1.32 (60 %) → 1 (100 %). Duration 380 ms, easing `cubic-bezier(.2, 1.5, .4, 1)`.
- When the tap **adds** a reaction, 8 sparks (6 × 6 px dots) move out from the centre of the button, one every 45°. Each spark: from `rotate(r) translateY(0) scale(.4)`, opacity 1, to `rotate(r) translateY(-34px) scale(1)`, opacity 0. Duration 500 ms, easing `cubic-bezier(.1, .7, .3, 1)`.
- Spark colours, in order: accent, `#FFC94A`, `#C0367A`, `#2563EB`, then the same 4 again.
- When the tap **removes** a reaction: only the pop, no sparks.
- Light haptic feedback on add (if the platform supports it).
- With `prefers-reduced-motion: reduce`, do not animate.

### 2.6 Compras (shopping list)
Board: "Compras revista (interativo)".

- Title in the rounded font.
- Subtitle: "6 artigos por comprar" (remove "· partilhada com a Mara"; the "Ma" avatar on items already shows sharing).
- Add field placeholder: "Adicionar artigo, por exemplo “2 leite”". Remove the separate tip line "Dica: “2 leite” adiciona 2 unidades." from the suggestions box.
- "Habituais · toca para adicionar" → section header "Habituais" (15 px/600). Each chip has the accessible name "Adicionar {item}".
- Aisle headers: sentence case, 15 px/600, count on the right (1.4).
- Checked item: checkbox fill = `accent` (was green).
- Duplicate notice and "removed" notice: secondary text colour (was green).
- Floating cart bar: remove the cart icon. Button text "Limpar carrinho" → **"Remover comprados"**.
- **New:** after "Remover comprados", the cart bar changes to a prompt card:
  - Icon 🧾 in a neutral tile, title "Compras feitas?", text "Regista o talão para dividir com a Mara."
  - Button "Registar despesa" → opens Nova despesa.
  - Close button (X), accessible name "Agora não". It hides the prompt.
  - A notice line shows "3 artigos comprados removidos." (1 → "1 artigo comprado removido.").
- Tab bar badge: neutral (1.5).

### 2.7 Atividade
Board: "Atividade revista".

- Title in the rounded font.
- Day headers: sentence case, 15 px/600. Older days: "Terça-feira, 6 de outubro".
- Amounts in parentheses: "Adicionaste “Continente” (86,35 €)", "A Mara apagou “Táxi” (12,50 €)".
- Small badge on the avatar (type icon):
  - Neutral grey (`#6B6B76`, dark `#8E8E93`): edit, comment, new list, archive.
  - Green `#0B7A5C`: add, restore.
  - Red `#C42B1C`: delete.
  - Pink `#C0367A`: reaction.
  - Gold coin `#FFC94A` with icon `#5A3D00`: settle-up. The settle-up row background is `#FFF8E6` (dark `#2A2414`).
- "Restaurar" button: `accentSoft` background, `link` text.

### 2.8 Definições
Board: "Definições revista (interativo)".

- Title in the rounded font. "Perfil" header: sentence case, 15 px/600.
- The colour row label: "Cor" → **"A tua cor"**. Help text: "Aparece no teu avatar e nos botões da app. A rosa é da Mara." The colour of the other person is disabled (opacity 0.45, shows their initials), accessible name "Rosa (é a cor da Mara)".
- When the user picks a colour, the full app updates at once (accent, tab bar, switch).
- Camera badge on the avatar: text-colour background with card-colour icon (was accent).
- Row icon tiles (Categorias, Despesas recorrentes, Notificações): all neutral (`fill` bg, secondary icon colour). Remove the mini category emoji grid under "Categorias".
- Notifications switch "on" colour = `accent` (was green).

### 2.9 Iniciar sessão (login)
Board: "Iniciar sessão revisto".

- **Remove** the app icon next to the name. Show Guru (pose `ola`, 170 px) and under it "KangarooSplit" in the rounded font (30 px, 700).
- Form title "Iniciar sessão": 20 px/600.
- Error text: "O email ou a palavra-passe não estão certos. Confirma os dois e tenta outra vez."
- **New:** link under the "Entrar" button: "Esqueci-me da palavra-passe" (44 px tap height). It must open the password-recovery flow (this flow is not designed yet).

### 2.10 Estatísticas
Board: "Estatísticas revista".

- Title and month total in the rounded font. Change "+10,1 % do que em setembro" to "Mais 10,1 % do que em setembro".
- Bar chart (6 months): current month = `accent`, other months = `mix(hex, base, 0.75)` (base = card colour).
- Category colours: **fixed palette**, not the accent:
  Renda `#5B6474`, Supermercado `#E07020`, Restaurantes `#1A9E8F`, Contas `#2F80ED`, Transportes `#C99A06`, Outros `#D04E8A`.
- Calendar:
  - Heat levels (by day total: 0, < 50, < 100, < 500, ≥ 500 €): `transparent`, `mix(hex, base, 0.9)`, `mix(hex, base, 0.78)`, `mix(hex, base, 0.55)`, `accent` (white text on the last level).
  - **Remove** the payer dots (the split bar above already shows this).
  - Settle-up day: a small gold coin dot (7 px, `#FFC94A`, 1 px ring `#E0A21A`) at the top-right of the cell.
  - Amount in the cell: 11 px (was 10 px).
  - Selected day: 2.5 px ring in text colour (was amber `#F59E0B`).
  - Today: inset 1.5 px ring in `link`.
  - Planned recurring expense: dashed 1.5 px border in `link`.
- Selected-day panel: title in sentence case, 15 px/600 ("Segunda-feira, 5 de outubro"; today: "Hoje, …"). Sub-lines use commas: "🏠 Casa, pago por ti". "deves" in secondary colour. Settle-up row uses the gold coin tile (round) and `#FFF8E6` background.

---

## 3. Not changed

- Navigation structure, flows and features not listed above.
- Category tints on the category pill in Nova despesa.
- The Christmas theme exploration (out of scope for this review).

## 4. Open items

1. Password recovery flow ("Esqueci-me da palavra-passe") has no design yet.
2. Not reviewed yet: empty states, loading states, offline states, error toast ("Algo correu mal. Tenta outra vez." should say what failed and what to do), Recorrentes, Nova lista, Editar lista, Componentes board (update it with the tokens in section 1).
3. Assumption to confirm in code: the avatar colour and the app accent colour are the same setting.
