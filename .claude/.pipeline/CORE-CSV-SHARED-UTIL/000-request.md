# CORE-CSV-SHARED-UTIL — Extrai a mecânica CSV para `src/shared/utils/`

> **Size:** S · **Decisão:** [`.claude/.planning/EXPORT-ABSTRACTION-DESIGN.md`](../../.planning/EXPORT-ABSTRACTION-DESIGN.md)
> **Bloqueia:** `PARTNERS-SUPPLIER-CSV` (2º consumidor de CSV depende deste util).

## Contexto

A mecânica de serialização CSV — anti-fórmula (CSV-injection), RFC 4180 quoting, BOM UTF-8 — vive
hoje **private** em `src/modules/contracts/adapters/http/contracts-csv.ts:18-49,92`. Não é
exportada e não pode ser reusada por outro módulo: ADR-0006 proíbe import cross-módulo de
`contracts/adapters/` (cross-module só via `public-api/`, que é só tipos).

Como `PARTNERS-SUPPLIER-CSV` precisa da **mesma** defesa de segurança (anti-fórmula é um MUST), a
regra não pode ser duplicada (risco de uma cópia divergir e ficar vulnerável). A sessão multi-agente
(4 lentes) concluiu: extrair **só o primitivo técnico puro** para `src/shared/utils/csv.ts` — função
util agnóstica de domínio, **não** Port (não é dependência inversível), **não** `kernel/` (não é VO
de domínio). Sem framework N-formatos (YAGNI: só CSV existe, zero demanda de XML/HTML/PDF).

## Escopo

### Novo: `src/shared/utils/csv.ts`

Mover de `contracts-csv.ts`, sem alterar comportamento:

1. Constantes `BOM`, `SEPARATOR` (`,`), `LINE_TERMINATOR` (`\r\n`).
2. `escapeCsvCell(raw: string): string` — anti-fórmula (`= + - @ \t \r` → prefixo `'`) + RFC 4180
   (célula com `, " \n \r` envolta em aspas, `"` interno duplicado). É a fusão de
   `neutralizeFormula` + `escapeCell` atuais.
3. `toCsvLine(cells: readonly string[]): string` — `cells.map(escapeCsvCell).join(SEPARATOR)`.
4. `toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string` — monta
   `BOM + [header, ...rows].map(toCsvLine).join(LINE_TERMINATOR) + LINE_TERMINATOR`.
   Mantém a assinatura "achatamento concreto fica fora" — o util só recebe linhas já planas.

### Refactor: `src/modules/contracts/adapters/http/contracts-csv.ts`

- Remove `neutralizeFormula`, `escapeCell`, `toLine`, `BOM/SEPARATOR/LINE_TERMINATOR` locais.
- `contractsToCsv` passa a `toCsv(HEADER, contracts.map((c) => cellsFor(contractToListItem(c))))`.
- `HEADER`, `cellsFor`, `periodEnd` (achatamento que conhece o agregado/`status`) **permanecem** no
  módulo — não sobem para `shared/` (conhecem domínio de contratos).

## Fora de escopo

- `Table`/`FormatSerializer`/`Exporter<T>`/Strategy de formato — porta destrancada, não construída.
- Qualquer mudança em `partners` (é o próximo ticket).
- XML/HTML/PDF/qualquer 2º formato.

## Critérios de aceite

- [ ] `escapeCsvCell` cobre: anti-fórmula (`=`/`+`/`-`/`@`/`\t`/`\r` → `'` prefix); RFC 4180 (vírgula,
      aspas duplicadas, `\n`, `\r` → quoting).
- [ ] `toCsv([], [])` → só `BOM` + `\r\n`? **Não**: `toCsv(headers, [])` → `BOM + headerLine + \r\n`.
- [ ] `contracts-export-csv.routes.test.ts` continua **verde sem alteração** (rede de segurança —
      comportamento idêntico byte-a-byte).
- [ ] Suite nova unitária de `shared/utils/csv.ts` em `tests/shared/utils/csv.test.ts`.
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de `src/`. Funções puras, determinísticas (sem Clock/IO). Sem `Result` (entrada já é
  `string`). Código EN. Sem JSON nativo.
- Refactor de código fechado-green: a suite de rota existente é a rede; não mudar o output.
- `escapeCsvCell` é security MUST (CSV-injection) — testar os 6 triggers de fórmula explicitamente.
