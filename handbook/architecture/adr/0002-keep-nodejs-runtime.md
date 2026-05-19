[← Voltar para ADRs](./README.md)

# ADR-0002: Manter Node.js como Runtime Nesta Fase

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** Arquiteto

---

## Contexto

O legado é Node.js (NestJS). Existe interesse pessoal/cultural em runtimes alternativos (Deno, Bun) com modelos de segurança e padrões web mais modernos.

A primeira fase de migração ataca o **BC de Integração Bancária (Bradesco)**, que depende fortemente de bibliotecas de:
- Geração de CNAB 240 (segmentos P, Q, J).
- Leitura de retorno CNAB.
- Parsing de OFX (extrato bancário).
- Possíveis APIs Bradesco V2 (PIX, etc.).

Essas libs têm ecossistema dominante em Node/NPM.

---

## Decisão

**Manter Node.js (20 LTS) como runtime único** para `bff-gateway` e `core-api`.

A decisão vale até o **fim da fase de migração** ou primeira re-avaliação por ADR novo.

---

## Consequências

### Positivas

- Continuidade de ecossistema com o legado.
- Compatibilidade total com libs CNAB/OFX existentes.
- Time de infra opera **um** runtime, não dois.
- Onboarding facilitado.
- Reduz vetores de risco simultâneos (paradigma novo + arquitetura nova já bastam).

### Negativas

- Não exercita curiosidade técnica do time em runtimes mais modernos.
- Padrões Web (`fetch` nativo, Web Crypto) já estão em Node 20+, mas a comunidade Node ainda mistura padrões antigos e novos — exige disciplina interna.

### Neutras

- O estilo de código adotado no `core-api` (`Result<T,E>`, ports/adapters, Web Standards onde possível) é **portável** para Deno/Bun no futuro com baixo custo. Capabilities específicas do runtime ficam isoladas em adapters.

---

## Alternativas Consideradas

### A. Migrar core-api para Deno

**Rejeitada porque:**
- Risco operacional duplicado (dois runtimes em produção).
- Possível gap em libs bancárias justamente no primeiro BC (Bradesco).
- Mudança de paradigma de domínio JÁ é grande — somar runtime novo multiplica risco.

### B. Migrar para Bun

**Rejeitada por motivos similares ao Deno**, com peso adicional de Bun ainda ser percebido como menos maduro em produção crítica financeira.

### C. Heterogeneidade — Deno no BFF, Node no core

**Rejeitada porque:**
- Heterogeneidade não traz ganho operacional concreto.
- BFF é o componente menos demandante — não há ganho que justifique a operação dupla.

---

## Quando Re-avaliar

A decisão deve ser revisitada (gerando ADR novo) se:

1. Bradesco/OFX/CNAB tiverem suporte equivalente em Deno/Bun.
2. Time tiver experiência operacional consolidada com runtime alternativo.
3. Surgir requisito específico que Node não atenda bem (ex: edge compute).
4. Comunidade Node introduzir incompatibilidade significativa.

A re-avaliação **gera ADR novo** que `supersedes` o ADR-0002 se aprovado. ADR-0002 não é editado.

---

## Referências

- [ADR-0001](./0001-strangler-fig-over-rewrite.md) — contexto da decisão de migração.
- [`../05-runtime-decisions.md`](../05-runtime-decisions.md) — detalhamento e estilo agnóstico.
