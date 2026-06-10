# 004 — W2 (code-review) — CTR-CONTRACT-SEQUENTIAL-NUMBER

Audit read-only por dois especialistas (como no distrato): `drizzle-orm-expert` (corretude
SQL/transacional) + `typescript-language-expert` (soundness de tipos). Round 1.

## Veredito: **APPROVED**

Zero BLOCKER, zero MAJOR. Achados restantes são MINOR/NIT, não-bloqueantes.

## drizzle-orm-expert — APPROVED

Confirmou que o padrão CHILD_CODES (`INSERT … ON DUPLICATE KEY UPDATE` → `SELECT last_seq … FOR UPDATE`
→ `UPDATE last_seq+1`) fecha a janela de corrida (CA-2). ODKU é dirigível à PK com segurança porque
`year` é a única UNIQUE de `ctr_contract_seq`. Gaps por rollback são intencionais/documentados; unicidade
final garantida por `UNIQUE(sequential_number)`. Migration 0010 com hardening correto. In-memory
semanticamente equivalente.

Achados:
- **MINOR 1.1** (`drizzle.ts` ODKU `{ set: { year } }`): no-op correto, porém `{ set: { lastSeq } }` seria
  mais legível. NÃO aplicado — o caminho atual está provado verde (integração 28/28); evitar churn em
  código transacional validado por cosmético.
- **MINOR 1.3**: alternativa `LAST_INSERT_ID(last_seq+1)` faria 1 round-trip vs 3, mas exige `sql\`\``
  cru (fora do query builder). Trade-off aceito no request; criação de contrato não é hot path.
- **NIT 1.4**: `rows[0]?.lastSeq ?? 0` defensivo (exigido por `noUncheckedIndexedAccess`); path `?? 0`
  inalcançável após o INSERT-ODKU garantir a linha. Sem risco.
- **NIT 2.4**: `ctrContractSeq` não exporta `$inferSelect/$inferInsert`. NÃO aplicado — não há mapper/teste
  consumindo esses tipos (YAGNI); a tabela é acessada só pelo adapter Drizzle.
- Edge cases informativos (sem ação): concorrência real serializa via FOR UPDATE; `year > 65535` e
  `last_seq` overflow são impossíveis na prática para um ERP.

## typescript-language-expert — APPROVED

Tipos sound. `BuildContractInput = Omit<…,'sequentialNumber'> & { sequentialNumber: string }` é a forma
idiomática de promover opcional→obrigatório. **Refutou empiricamente** (tsc 6.0.3 do projeto, sob
`exactOptionalPropertyTypes`) o risco de `undefined` vazar via `{ ...cmd, sequentialNumber }` — o
compilador barra estruturalmente. Narrowing de `let sequentialNumber` correto. `verbatimModuleSyntax`
respeitado em `import-contracts.ts` (`import type` para `BuildContractInput`/`BuildContractError`).
Remoção de `sequentialNumber` do `contractWriteShape` sem referências órfãs (verificado via grep — todas
as ocorrências restantes são leitura de agregado/DTO/row, não entrada). Zero `as`/`any`/`throw` novos.

Achados:
- **NIT**: duplicação do bloco de geração entre `create-contract.ts` e `create-pending-contract.ts`
  (~6 linhas). Poderia virar `resolveSequentialNumber(deps, cmd.sequentialNumber)`. NÃO aplicado —
  extração adiciona módulo compartilhado para 6 linhas; YAGNI estrito. Registrado para refactor futuro.
- **MINOR (precisão potencial)**: port aceita `year: number` cru (não branded `Year`). Over-engineering
  aqui; o domínio nunca expõe ao cliente.

## Decisão de promoção

APPROVED em round 1. NITs/MINORs documentados, nenhum aplicado (justificativa: regressão zero favorece
não churnar caminho transacional provado verde; demais são YAGNI). Promove para W3.
