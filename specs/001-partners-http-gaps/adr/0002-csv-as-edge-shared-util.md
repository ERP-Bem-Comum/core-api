# ADR-0002 (feature): Serialização/parsing CSV é borda (util compartilhado), não porta genérica

**Feature**: `specs/001-partners-http-gaps/` · **Status**: Proposto
**Data**: 2026-06-06 · **Consultor**: `/acdg-skills:software-architect` + `/acdg-skills:clean-code-reviewer`
**Relacionado**: ADR-0006 (Modular Monolith, cross-module só via `public-api`), `EXPORT-ABSTRACTION-DESIGN.md` (sessão multi-agente 2026-06-01)

## Contexto

Duas frentes do épico tocam CSV: **export de fornecedores** (US-003, serializa) e **import de
colaboradores** (US-001, parseia). Surgiu a pergunta de design: a conversão de formato deveria ser uma
**porta genérica** (`exportDomain` / `FormatSerializer`) com um **adapter por formato** (CSV, XLSX, XML)?

O RECON revelou o estado real:

- `src/shared/utils/csv.ts` **já existe** com a mecânica de **serialização** (`escapeCsvCell`, `toCsvLine`,
  `toCsv`, `BOM`/`SEPARATOR`/`LINE_TERMINATOR`); `contracts-csv.ts` e `supplier-csv.ts` **já o consomem**.
- Falta o **lado parsing**: há `parseCsv`/`tokenizeCsv` **privado** em `contracts/cli/import-parser.ts`
  (não importável de `partners` — ADR-0006).
- **Zero** demanda real de XLSX/XML/PDF em qualquer módulo (só CSV existe).

A decisão consolidada da sessão `EXPORT-ABSTRACTION-DESIGN.md` (4 lentes: DDD, Clean Code/YAGNI, ports,
tipagem) foi: **export/serialização é borda, não domínio; não construir framework N-formatos agora**.

## Decisão

1. **Serialização e parsing CSV são funções util puras** em `src/shared/utils/csv.ts` (Shared Kernel
   técnico), **não** ports hexagonais nem Domain Services. Port modela dependência externa **inversível**
   (DB, email, storage — com adapter real + InMemory); CSV é **transformação pura determinística**.
2. **Não se constrói** porta genérica N-formatos / `Exporter<T>` / Strategy agora — é **generalização
   especulativa** (só CSV existe). A assinatura `xToCsv(items): string` / `parseCsv(content): Result<Table,E>`
   deixa o caminho **destrancado**; quando um 2º formato real for demandado, a abstração entra como refactor
   barato em `application/` (port) + `adapters/` (impls), **jamais** em `domain/`.
3. A **projeção** (agregado → `Table = { headers, rows }`) é concreta por agregado, no `adapters/` de cada
   módulo (preserva o `switch` exaustivo que o compilador trava — ex.: `supplierToCells` por `status`).
4. Ticket-precedente reescopado para **`CORE-CSV-PARSE-UTIL`**: promover `tokenizeCsv` + `parseCsv` ao
   `shared/utils/csv.ts` (genérico, `string → Table`), consumido pelo import. O mapeamento record→comando de
   domínio (Zod) fica na **borda** do módulo `partners`.

**Fundamentação canônica** (Rule of Three — esperar a 3ª ocorrência antes de abstrair):

> The Rule of Three
> Here's a guideline Don Roberts gave me: The first time you do something, you just do it. The second time you do something similar, you wince at the duplication, but you do the duplicate thing anyway. The third time you do something similar, you refactor.
> Or for those who like baseball: Three strikes, then you refactor.
> — *(Linha 2140, p. 61, Martin Fowler, *Refactoring*)*

A serialização CSV está no caso **1→2** (contracts + suppliers); o parsing genérico será o **2º** consumidor
do lado leitura (após o de contracts, ao ser promovido). Outros formatos estão no **caso 0** — não há terceira
ocorrência que justifique o framework. Abstrair agora violaria a Rule of Three (custo de generalização sem
demanda).

## Consequências

- **Positivas**: ataca a duplicação real (o security MUST do escape anti-CSV-injection vive num único lugar);
  zero dependência nova (parsing nativo); import e export compartilham o mesmo util; sem framework morto.
- **Negativas / custo**: cada agregado mantém sua projeção concreta (aceito — preserva exaustividade do
  compilador); promover `parseCsv` exige extrair de `contracts/cli` sem regressão (rede: suíte verde).
- **Reversibilidade**: se XLSX surgir, `Table` + `FormatSerializer`/`FormatParser` entram como refactor
  isolado — as funções concretas viram os 2 primeiros adapters.

## Alternativas consideradas

| Alternativa                                             | Por que rejeitada                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Porta genérica `exportDomain` + adapter por formato** | YAGNI / generalização especulativa; só CSV existe (Rule of Three não fechou).                          |
| **Domain Service / Domain Event para export**           | Serialização não tem regra de negócio; poluiria `domain/`/outbox (ver `EXPORT-ABSTRACTION-DESIGN.md`). |
| **`partners` importar o parser de `contracts/cli`**     | Proibido por ADR-0006 (cross-module só via `public-api`, que é só tipos).                              |
| **Duplicar o parser CSV dentro de `partners`**          | Duplicaria o escape/tokenize; o lugar é `shared/utils/csv.ts`.                                         |
