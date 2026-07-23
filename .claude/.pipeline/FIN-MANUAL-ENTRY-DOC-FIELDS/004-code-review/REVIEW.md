# W2 — code review (self, read-only) — FIN-MANUAL-ENTRY-DOC-FIELDS (#370)

**Veredito: APPROVED.**

- **Domínio**: `ManualEntry` + 4 campos; `confirmManualEntry` aplica o default `documentValueCents ??
  valueCents` (regra P.O.). Segundo construtor (`reconciliation.ts` — diferença classificada → ManualEntry)
  também atualizado com nulls (sem documento próprio) — pego pelo typecheck, não escapou.
- **`valueCents` (valor conciliado) intacto** — documento é metadado; o realizado não muda. `documentValueCents`
  é coluna/campo separado.
- **Persistência**: 4 colunas nullable em `fin_manual_entries` + migration `0040_foamy_hydra` (ADD COLUMN,
  aditiva) + `manualEntryToRow`. `toDomain` segue com `manualEntry: null` (reidratação adiada — pré-existente).
- **Eco correto**: como o handler ecoa o body, o default do `documentValueCents` só apareceria errado; por
  isso `RecordManualEntryOutput` passou a carregar os 4 campos computados, e o handler ecoa do **resultado**
  (não do body) — o default surge certo (CA2/CA3).
- **Borda**: `documentType` reusa `documentTypeSchema` (enum) → 400 em valor inválido; `issueDate` `z.iso.date()`
  → 400 em formato errado (CA4). Todos opcionais (aplicabilidade por tipo é do front).
- **Tarifa/Juros**: nenhum campo de sub-classificação introduzido (alinhado ao pedido da P.O.).

## Escopo entregue vs #370
Entregue: **aceitar + persistir + retornar (na criação)** os 4 campos. **Pendente (follow-up):** eco no
**detalhe** da conciliação (#268) — exige reidratar `manualEntry` no `toDomain` (hoje `null` por design). E
`effectiveDate` (Transfer/Aplicação/Resgate) — fora do escopo desta fatia (a P.O. nomeou só os 4 de documento).

Sem Blocker/Major/Minor. 1 round.
