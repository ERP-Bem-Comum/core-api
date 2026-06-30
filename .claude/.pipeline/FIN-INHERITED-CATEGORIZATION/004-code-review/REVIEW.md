# Code Review — FIN-INHERITED-CATEGORIZATION (#48 CA2) — Round 1

**Veredito:** APPROVED · **Data:** 2026-06-20

**Escopo:** herança da categorização do contrato no create + wiring cross-módulo + testes.

## Princípio IX / ADR

Cross-módulo via **public-api** (ADR-0006): o financial lê a categorização do contrato pelo `ContractCategorizationReadPort` (#178), nunca tocando `ctr_*` cru (ADR-0014). Sequência canônica do use-case mantida (`validar → fetch → domain → persist → publish`): a leitura do contrato é um *fetch* na application, antes do `Document.create`. A herança respeita "referência por identidade" (Vernon p.460) — copia os refs (programId/budgetPlanId), não o objeto.

## Issues

- 🔴 nenhuma. Erro de leitura propagado por Result (sem throw). `contractRef` ausente → herança é no-op. Ref do front prevalece (pré-fill, não override). `let` local na application (não em entidade) — permitido.
- 🟡 nenhuma.
- 🔵 Decisões: (a) **fatia CA2** apenas — `dataEmissao` já feito (#163); `competencia`/`contaDebitoId` deferidos (modelagem própria: tipo da competência? contaDebito = conta-cedente?). (b) só `programRef`/`budgetPlanRef` herdam (mapeiam limpo); `categorizacao`/`centroDeCusto` (rótulos do contrato) não têm campo-ref no documento. (c) mysql wira `buildContractsReadPort` na mesma conexão (2º pool read-only) + close no shutdown — padrão do partners-read-port.

## O que está bom

- Fecha a cadeia que montamos (#116 filtro → #178 read-port → #48 consumo). 1ª leitura financial→contracts, limpa via public-api.
- Pré-fill editável (CA do issue) coberto por teste. Sem schema novo.
- Sem regressão (3015 pass / 0 fail). 5 fixtures atualizados (reader vazio).

**APPROVED** → W3.
