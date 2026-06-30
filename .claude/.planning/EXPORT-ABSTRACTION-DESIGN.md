# Decisão de arquitetura — abstração de export/serialização

> **Status:** aguardando decisão do dono · **Data:** 2026-06-01 · **Gatilho:** ticket `PARTNERS-SUPPLIER-CSV`
> **Método:** sessão multi-agente read-only (4 lentes) — DDD tático, Clean Code/YAGNI, modular monolith/ports, tipagem TS.

## A proposta do dono (verbatim)

> "Poderíamos criar um Domain Service como porta ou uma porta de domain Event cuja ideia seria
> `exportDomain` (generalista). Aí caberia a um Adapter converter para N formato: a porta seria
> `contractsTo`, o adapter `contractsToCsv`, podendo ter `contractsToXML`, `contractsToHTML`..."

A intuição central — **separar a projeção (agregado → forma plana) da serialização de formato** — é
correta e é exatamente como o código já está organizado informalmente. Os erros estão na **camada**
(não é domínio) e no **timing** (não há 2º formato que justifique o framework).

## Fatos do código (levantados antes da sessão)

- Único serializador de formato no projeto: `contractsToCsv` em
  `src/modules/contracts/adapters/http/contracts-csv.ts`. **Formato único: CSV.**
- `PARTNERS-SUPPLIER-CSV` seria o **2º consumidor de CSV**.
- **Zero** demanda de XML/HTML/PDF/XLSX em qualquer módulo. O legado exportava só `/suppliers/csv`.
- A projeção "generalista" já existe como padrão: `contractToListItem` (`contract-dto.ts:25`) achata
  o agregado discriminado por `status` em forma plana.
- A mecânica de escape (anti-fórmula CSV-injection + RFC 4180 + BOM) é **private** em
  `contracts-csv.ts:38-49,92` — não exportada, não compartilhável.

## Convergência dos 4 pareceres

| Pergunta | Veredito unânime |
| --- | --- |
| "Export" é domínio? | **Não.** Teste hexagonal: trocar CSV→JSON→XML não muda nenhuma regra de negócio. É borda. |
| Domain Service para export? | **Misuse.** Domain Service = lógica de negócio cross-agregado (ex: `calcularLimiteAprovacao`). Serialização não tem regra de negócio. Colocaria conhecimento de CSV/XML dentro de `domain/` — proibido (`ts-domain-modeler` §3.A.5). |
| Porta de Domain Event para export? | **Poluição.** Domain Events são fatos de negócio passados (`ContractCreated`). "ExportRequested" é comando de apresentação, não fato de domínio. Não interessa ao outbox/Financeiro. |
| Abstração N-formatos agora? | **YAGNI / generalização especulativa.** Só CSV existe; Strategy só compensa com ≥2 variantes reais. Rule of Three (Fowler): CSV está no caso 1→2; outros formatos no caso 0. |
| `partners` pode importar de `contracts/adapters/`? | **Não** (ADR-0006 — cross-module só via `public-api/`, que é só tipos). Logo "reusar via import" entre módulos é impossível. |
| "Porta" hexagonal compartilhada? | **Não.** Port modela dependência externa **inversível** (DB, email, storage — com adapter real + InMemory). Serialização CSV é transformação **pura determinística**. É **função util**, não port. |
| Onde mora o escape CSV? | `src/shared/utils/csv.ts`. Não `kernel/` (isso é domínio/VO), não `ports/` (não é dependência inversível). Critério: `utils/` já hospeda funções técnicas puras (`string.ts`, `date.ts`, `id.ts`). |
| Projeção (agregado → linhas)? | **Concreta por agregado, em cada `modules/*/adapters/`.** Conhece o discriminated union do status (switch exaustivo — `cellsFor`/`contractToListItem`). Genérico perderia a exaustividade que o compilador trava. |
| Tipo intermediário se algum dia houver framework? | `Table = { headers: readonly string[]; rows: readonly (readonly string[])[] }`. Nada de `Record<string,string>[]` (perde ordem + sofre com `noUncheckedIndexedAccess`). Sem branded, sem `Exporter<T>` genérico. |

## Recomendação consolidada

**Fazer AGORA (resolve o problema real — duplicação de um security MUST):**

1. Extrair só a mecânica pura de CSV para `src/shared/utils/csv.ts`:
   - `escapeCsvCell(raw: string): string` (anti-fórmula + RFC 4180)
   - `toCsvLine(cells: readonly string[]): string`
   - constantes `BOM` / `SEPARATOR` / `LINE_TERMINATOR`
   - opcional: `toCsv(headers, rows): string` (monta BOM + header + linhas)
   - **Agnóstico de domínio.** Sem `Contract`, sem `Supplier`.
2. Migrar `contracts-csv.ts` para consumir o util (refactor com a suite verde existente como rede).
3. `PARTNERS-SUPPLIER-CSV` passa a só achatar `Supplier` (sua projeção concreta, com seu switch por
   `status`) + consumir o util compartilhado.

**Deixar a porta DESTRANCADA, mas NÃO construída:**

- A assinatura `xToCsv(items: readonly T[]): string` (função pura) já deixa o caminho aberto.
- Se/quando um **2º formato real** (XML/PDF…) for demandado por stakeholder, aí Rule of Three fecha:
  as funções concretas existentes viram os 2 primeiros adapters, e introduz-se `Table` +
  `FormatSerializer` como refactor barato — **em `application/` (port) + `adapters/` (impls)**,
  jamais em `domain/`.

## Impacto no ticket aberto

`PARTNERS-SUPPLIER-CSV` (size S, open) deve ser **precedido** por um ticket de extração
(`CORE-CSV-SHARED-UTIL` ou similar, size XS/S) e ter seu `000-request.md` reescrito para "achatar
`Supplier` + consumir `shared/utils/csv.ts`" em vez de "reusar a mecânica de contracts-csv.ts" (que
o ADR-0006 torna impossível por import direto).

## Citações-chave (para auditoria)

- Domain Service / Event: `.claude/skills/ports-and-adapters/references/ddd-tactical-patterns.md:95,106,140,153-154,215`
- Zod/serialização na borda: `.claude/skills/ts-domain-modeler/SKILL.md:400-422`
- Port no application, não domain: `.claude/skills/ports-and-adapters/SKILL.md:301`
- Cross-module proibido: `handbook/architecture/adr/0006-modular-monolith-core-api.md:80-81,103`; `.claude/skills/modular-monolith/SKILL.md:108-117`
- `shared/` admission + anti-padrão helper: `.claude/skills/modular-monolith/SKILL.md:230,263`
- YAGNI estrito (W1): `.claude/output-styles/erp-contracts.md:53`
- Mecânica atual: `src/modules/contracts/adapters/http/contracts-csv.ts:18-20,38-49,56-90,92,94`
- Critério de `shared/utils/`: `src/shared/utils/{string,date,id}.ts`
