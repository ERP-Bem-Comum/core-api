# FIN-MANUAL-ENTRY-DOC-FIELDS — escopo (#370, parcial)

> Size **M**. Na Conciliação → "Nova transação", o lançamento manual não carrega informações de
> documento — os campos **Número do documento, Tipo de doc, Emissão e Valor** estão desabilitados no
> front ("chegam com o backend"). Estender o contrato para **aceitar, persistir e retornar** os 4 campos.

## Pedido (P.O.)
Habilitar no lançamento manual (`POST /financial/statement-transactions/:id/manual-entry`):
- `documentNumber` (string) — nº do documento
- `documentType` (enum reusa `documentTypeSchema`: NFS-e/DANFE/RPA/Fatura/Boleto/Recibo/Imposto)
- `issueDate` (date-only YYYY-MM-DD) — emissão
- `documentValueCents` (string cents) — valor do documento. **Regra P.O.:** default = valor da transação
  conciliada (`valueCents`); editável; **pode divergir** (multa/juros/complemento).

Todos **opcionais** (aplicabilidade por tipo é do front — Pagamento/Recebimento). `valueCents` (valor
conciliado da transação) **não muda** — segue derivado da transação.

## Tarifa/Juros — SEM campo de classificação
O tipo `FeePenaltyInterest` (botão Tarifa/Juros) **já existe**. A P.O. pediu para **remover** o dropdown
"Classificação" desse modo (alinhar aos demais). Lado backend: **não** introduzir sub-classificação
(Interest/Penalty/Fee) no lançamento manual. A remoção do controle no front é do web-app (fora deste ticket).

## Escopo (in) — pontos de toque
1. Domínio: `ManualEntry` (types.ts) + `ConfirmManualEntryInput`/`confirmManualEntry` (manual-entry.ts) —
   4 campos; `documentValueCents` default = `valueCents` quando omitido.
2. Persistência: 4 colunas em `fin_manual_entries` + migration + `reconciliation.mapper.ts` (row↔domínio).
3. Application: `RecordManualEntryInput` + repasse no `record-manual-entry.ts`.
4. HTTP: `manualEntryBodySchema` (4 campos opcionais) + handler + `manualEntryResponseSchema` (eco) +
   detalhe da conciliação (#268) ecoa os 4.

## Fora de escopo
- `effectiveDate` (Transferência/Aplicação/Resgate) — #370 menciona, mas a P.O. nomeou só os 4 de documento.
  Follow-up.
- Remoção do dropdown "Classificação" no front (web-app).
- Valor conciliado/realizado: segue `valueCents` (documento é metadado; não altera o realizado).

## Critérios de aceite
- **CA1** `POST manual-entry { type:Payment, documentNumber, documentType, issueDate, documentValueCents }`
  (com valor divergente) → **201**, resposta ecoa os 4 (documentValueCents divergente preservado).
- **CA2** sem `documentValueCents` (mas com os outros) → default = valor da transação (`valueCents`).
- **CA3** sem nenhum campo de documento → `documentNumber/documentType/issueDate` = null; `documentValueCents`
  = valor da transação (default). Back-compat: fluxo atual intacto.
- **CA4** (borda) `documentType` fora do enum → 400; `issueDate` mal-formada → 400.
- **CA5** Regressão zero: `pnpm test` verde. (Persistência real é #500-gated; wiring provado por inject.)

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — inject: 4 campos aceitos/ecoados + default do documentValueCents + borda |
| W1 | `ts-domain-modeler` + `drizzle-schema-author` | domínio + coluna/migration/mapper + use-case + HTTP |
| W2 | `code-reviewer` | audit — default correto, valueCents intacto, sem classificação nova |
| W3 | `ts-quality-checker` | gate |
