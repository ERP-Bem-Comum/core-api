# Code Review — PAR-COLLAB-HISTORY-EXPORT (#126) — Round 1

**Veredito:** APPROVED · **Data:** 2026-06-19

**Escopo:** diff de domínio (territory/bank/pix), formatter CSV 9 colunas, 2 rotas de export, schema + testes (3 camadas).

## Princípio IX

Histórico = **audit trail por campo** (log de atualizações). O domínio permanece EN-puro (produz `fieldName` + valores texto); o label PT e o formato legado ficam no adapter (separação de concerns mantida). A identidade vem do **read-model** (CQRS read-side, Vernon p.712) — o export reflete o grid atual.

## Issues

- 🔴 nenhuma. `diffCollaborator` puro (sem throw/class/Date.now); array literal no formatter; rotas convertem erro→status. Sem schema/migration novos.
- 🟡 nenhuma.
- 🔵 Decisões registradas:
  1. **Identidade do read-model** (não denormalizada por-change): mostra a identidade ATUAL em todas as linhas do colaborador (igual ao legado), não a identidade-à-época. Correto p/ prod (reader=writer single-node); no teste memory o reader é seed-only → seedado + history via override.
  2. **Serialização dos VOs novos**: território `UF/Município`, banco `código/agência/conta`, PIX `chave`. Campos "adicionar mais" do issue (menos rígidos); as 9 colunas obrigatórias são exatas.
  3. **history-first no detalhe**: 503 (infra) tem precedência sobre 404 (inexistente) — preserva o CA3 e é defensável (falha de infra surge primeiro).

## O que está bom

- Fecha as 4 CAs (lista + detalhe 9 col + nenhuma coluna omitida + território/banco/PIX no diff).
- Formatter unificado (`groups`) serve lista E detalhe — sem duplicação.
- Fail-first nas 3 camadas; sem regressão (3007 pass / 0 fail).

**APPROVED** → W3.
