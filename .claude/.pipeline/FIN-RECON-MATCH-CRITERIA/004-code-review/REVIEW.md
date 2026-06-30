# Code Review — FIN-RECON-MATCH-CRITERIA (#140) — Round 1

**Veredito:** APPROVED · **Data:** 2026-06-19

**Escopo:** domínio `match-score` (+criteriaBreakdown), borda HTTP (schema/dto) + testes.

## Princípio IX

Enriquecimento de read-model (CQRS) — o breakdown serve a UI renderizar a explicação do score sem heurística própria (Vernon, *Implementing DDD*, p. 712). A função vive no domínio porque **conhece os pesos** (regra de domínio do score, FR-011) — não é responsabilidade de apresentação. **R1 preservado:** o score/breakdown é insumo de decisão humana, NUNCA dispara conciliação.

## Issues

- 🔴 nenhuma. Função pura (array literal, sem throw/class/let/push/sort), `readonly`, return type explícito. Mantém o domínio puro (regra domain.md).
- 🟡 nenhuma.
- 🔵 Decisões: (a) **aditivo** — `criteriaBreakdown` adicionado ao lado do objeto `criteria` de flags (não quebra consumidores de #121). (b) `supplierOpen`: 1→ok, >1→parcial (ambíguo, vários candidatos), 0→falha — único critério com `detail` (contagem); os demais usam `detail: ''` (front mapeia o label a partir de `criterion`+`result`). (c) Labels humanos ("Favorecido idêntico", "valor difere") são i18n do front — o contrato expõe identificador EN + peso + resultado (respeita idioma EN-no-código).

## O que está bom

- Pesos centralizados no domínio (fonte única); breakdown reusa a mesma constante de `compute`.
- Fail-first (domínio RED→GREEN) + HTTP happy path estendido (CA6) validando o schema.
- Sem schema/infra novos; sem regressão (3002 pass / 0 fail).

**APPROVED** → W3.
