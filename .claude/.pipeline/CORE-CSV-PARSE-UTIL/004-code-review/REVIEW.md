# W2 — Code Review (read-only) · CORE-CSV-PARSE-UTIL

**Wave**: W2 · **Round**: 1 · **Veredito**: ✅ APPROVED · **Skill**: clean-code-reviewer

## Escopo revisado
- `src/shared/utils/csv.ts` (+ `tokenizeCsv`/`parseCsv`/`Table`/`CsvParseError`)
- `src/modules/contracts/cli/import-parser.ts` (refactor: consome o util)

## Achados

### ✅ A1 — Eliminação de duplicação (objetivo central do ticket, ADR-0002)
A mecânica de tokenização CSV existia **duplicada** (privada em `import-parser.ts`); agora há **uma única
fonte** em `shared/utils/csv.ts`. É exatamente o smell que a literatura aponta como o mais danoso:

> 9.5.1 Código Duplicado
> Duplicação de código é o principal code smell e aquele com o maior potencial para prejudicar a evolução de um sistema. Código duplicado aumenta o esforço de manutenção, pois alterações têm que ser replicadas em mais de uma parte do código. Consequentemente, corre-se o risco de alterar uma parte e esquecer de uma outra...
> — *(Linha 6161, p. 363, Marco Tulio Valente, *Engenharia de Software Moderna*)*

O escape anti-CSV-injection (security MUST) e a tokenização passam a ter um só ponto de manutenção.

### ✅ A2 — Fronteira correta (ADR-0002 / ADR-0006)
Parsing/serialização ficam em `shared/utils/` (função pura, não port, não domínio). `contracts` consome via
caminho relativo de `shared/` (permitido — não é cross-module entre `modules/*`). Aderente.

### ✅ A3 — Pureza e tipos
Funções puras determinísticas; `Result<Table, CsvParseError>` na borda externa (entrada não confiável);
`tokenizeCsv` mantém assinatura simples (`string → readonly (readonly string[])[]`). `Readonly`/`readonly`
em todo o contorno. Sem `any`, sem classe, sem `throw`.

### ✅ A4 — Sem regressão
Suíte de import de contracts (20 testes) verde após a troca — comportamento preservado.

### Observações (não-bloqueantes)
- `parseCsv` local de `contracts` (que mapeia `ImportContractRow`) foi mantido — correto: a validação de
  colunas é específica do domínio de contracts, não pertence ao util genérico (separação projeção↔mecânica).
- `tokenizeCsv` não valida aspas não fechadas (retorna parcial); a detecção vive em `parseCsv` via
  `unterminatedQuote`. Documentado. Aceitável: `tokenizeCsv` é mecânica crua; `parseCsv` é a porta segura.

## Veredito
**APPROVED** — sem issues bloqueantes. Pode seguir para W3.
