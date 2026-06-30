# CTR-AMENDMENT-CHRONOLOGY-R4 — Cronologia do Aditivo (R4)

> **Size:** S · **Módulo:** contracts · **Aberto por:** orquestrador (sessão 2026-05-25)
> **Gap:** #4 do relatório de cobertura

## Contexto

Fonte canônica (citação literal):

- `handbook/domain/contratos/04-aditivos-context.md:86` — **R4 (Cronologia)**:
  > "Não se pode homologar aditivo com data retroativa ao início do Contrato Mãe."

Hoje `homologate-amendment.ts` valida documento assinado, mismatch de contrato e
estado Active — mas **não** valida a cronologia do aditivo contra o contrato. A regra
não é enforçada.

## Decisão de interpretação (registrada)

- **Âncora = `contract.signedAt`** (decisão do P.O. nesta sessão): "início do Contrato Mãe"
  = nascimento jurídico do contrato (data de assinatura). Mais permissivo e juridicamente
  sólido — permite aditivos num contrato assinado de vigência futura.
- **Data do aditivo comparada = `amendment.createdAt`** (única data própria do aditivo
  antes da homologação).
- **Regra:** rejeitar homologação se `amendment.createdAt < contract.signedAt`. Igualdade passa.

## Decisão de localização (registrada)

Guard de **fail-fast no use case** `homologateAmendment` (camada application), **não** no
domínio puro. Justificativa: é check **cross-agregado** (Amendment × Contract) — segue o
padrão já estabelecido no codebase para regras desta natureza:

- `homologate-amendment.ts` — `'amendment-contract-mismatch'`.
- `create-amendment.ts` (Defeito #11) — `'create-amendment-term-change-not-extending'`.

Erro como **string literal** de use case (consistente com os acima), com tradução PT no
dicionário `cli/formatters/error.ts`.

## Escopo

1. Em `homologate-amendment.ts`: após carregar amendment + contract e validar mismatch,
   adicionar guard R4 → novo erro `'amendment-retroactive-to-contract-start'`.
2. Adicionar o erro ao union `HomologateAmendmentError`.
3. Adicionar string PT-BR no dicionário `error.ts`.

## Fora de escopo

- Mover a regra para domínio puro (decisão de consistência com o codebase atual).
- Validação no momento da criação (`createAmendment`) — R4 é invariante de homologação.

## Critérios de aceite

- **CA-1:** homologar com `amendment.createdAt < contract.signedAt` →
  `err('amendment-retroactive-to-contract-start')`; amendment continua `Pending`; outbox vazio.
- **CA-2 (fronteira):** `amendment.createdAt === contract.signedAt` → homologa normalmente.
- **CA-3:** `amendment.createdAt > contract.signedAt` → homologa normalmente (caso comum).
- **CA-4:** mensagem PT-BR específica no `formatErrorCode`.

## Pipeline

| Wave | Skill/Agente | Gate |
| :--- | :--- | :--- |
| W0 RED | `tdd-strategist` | `pnpm test` (novos fails) |
| W1 GREEN | `ports-and-adapters` | `pnpm test` + `pnpm run typecheck` |
| W2 REVIEW | `code-reviewer` | `pnpm run lint` |
| W3 QUALITY | `ts-quality-checker` | typecheck + format:check + test + lint |
