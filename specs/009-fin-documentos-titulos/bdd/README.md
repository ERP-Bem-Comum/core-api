# BDD: Financeiro — Fatia 1 (cobertura)

**Feature**: `specs/009-fin-documentos-titulos/` · Consultores: `requirements-engineer` + `tdd-strategist`.

> Cenários Given-When-Then (Gherkin PT-BR) derivados dos acceptance scenarios da [spec.md](../spec.md) e das regras do
> [domain.md](../domain.md). Cada cenário vira teste na **Fase 7 (TDD/RED)**. Idioma: PT no negócio, identificadores EN no código.

## Princípio (Fase 7 — teste primeiro)

> "Quando você deveria escrever seus testes? Antes de escrever o código que vai ser testado. Você não testará depois. Sua
> meta como programador é executar a funcionalidade. Contudo, você precisa de uma maneira de pensar sobre o projeto; você
> precisa de um método para o controle de escopo."
> — _(tdd--kent-beck.md:3981 — Teste Primeiro; Kent Beck, *TDD by Example*)_ (fallback local — MCP `acdg-skills` off)

## Cobertura

| História (US)                  | Cenários                               | Prioridade | Arquivo                       |
| ------------------------------ | -------------------------------------- | ---------- | ----------------------------- |
| US-001 (não-fiscal → pai)      | CT-001, CT-002, CT-007                 | P1         | `geracao-de-titulos.feature`  |
| US-002 (fiscal → pai+filhos)   | CT-003..CT-006, CT-008, CT-009, CT-010 | P1         | `geracao-de-titulos.feature`  |
| US-003 (aprovação + separação) | CT-011..CT-015                         | P1         | `aprovacao.feature`           |
| US-004 (ajuste em Aberto)      | CT-016, CT-017                         | P2         | `ajuste-e-reabertura.feature` |
| US-005 (desfazer aprovação)    | CT-018..CT-021                         | P2         | `ajuste-e-reabertura.feature` |
| US-006 (cancelamento)          | CT-022, CT-023                         | P3         | `cancelamento.feature`        |
| US-007 (rascunho)              | CT-024..CT-026                         | P3         | `rascunho.feature`            |

**26 cenários** (incl. edge cases: líquido não-positivo, imposto incompatível, transição inválida, edição de filho, submissão incompleta).

## Mapeamento BDD → testes (a confirmar na Fase 7)

| Grupo de cenários                                                                              | Nível de teste                   | Local (espelho de `src/`)                                                                       |
| ---------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Cálculo do líquido, geração de filhos, máquina de estados, herança, imutabilidade, hard delete | **domínio** (puro)               | `tests/modules/financial/domain/document/document.test.ts`                                      |
| Orquestração + outbox + trilha por-campo                                                       | **integração** (use case + repo) | `tests/modules/financial/application/use-cases/*.test.ts`                                       |
| Autorização (separação de funções), status codes, schemas                                      | **borda HTTP**                   | `tests/modules/financial/adapters/http/*.test.ts` (`fastify.inject`) + coleção Bruno (ADR-0034) |

> Pirâmide: maioria dos CTs no nível de **domínio** (rápidos, puros); poucos de integração (outbox/timeline) e de borda (autorização/HTTP).
