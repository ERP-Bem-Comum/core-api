# Request — INT-SAFETY-NET-BDD-TDD

> US1 da spec **007-integration-test-suite**. Rede de segurança que captura a cobertura de teste
> de borda HTTP **antes** de reescrever as coleções (decisão C1: reescrever com rede 1:1 primeiro).

## Título
Rede de segurança BDD/TDD 1:1 da cobertura de borda HTTP existente

## Size
L

## Contexto
A spec 007 vai **reescrever** as 3 coleções Bruno (auth/contracts/partners) numa coleção unificada.
Para reescrever com segurança (zero perda de cobertura), primeiro captura-se cada request `.bru`
existente como um par **BDD** (cenário Gherkin) + **TDD** (asserções literais), em correspondência
**1:1** auditável. Só então a reescrita parte dessa especificação de cobertura, não da memória dos arquivos.

## Escopo
- Inventariar os `.bru` das 3 coleções; critério canônico de "request real" = `.bru` com verbo HTTP
  (exclui `folder.bru`/`collection.bru`/`environments`; inclui `health-check`).
- Para cada request real: 1 cenário BDD (`safety-net/bdd/<modulo>/`) + 1 caso TDD
  (`safety-net/tdd/<modulo>/`) + linha no mapa de rastreabilidade.
- Gerado com os agentes especialistas obrigatórios (`requirements-engineer` para BDD/Gherkin;
  `tdd-strategist` para asserções) — FR-012 da spec.
- **Extensões da rede** (mesma disciplina 1:1): 17 casos de melhoria 🔴 (segurança/falhas/performance/
  consistência, fundamentados via MCP `acdg-skills`); 5 casos de regressão de fix (catálogo de
  permissões incompleto); 12 casos de feature pendente (tickets do front: distrato rico + conteúdo
  de documento).

## Critérios de Aceitação
1. Correspondência **1:1** auditável: `count(BDD) == count(TDD) == count(.bru reais)` por módulo.
2. Toda asserção do `.bru` original aparece no TDD correspondente (ou marcado `smoke-only`).
3. Mapa de rastreabilidade mestre soma os parciais (auth/contracts/partners) com total verificável.
4. Melhorias/regressões/pendências adicionadas com par BDD/TDD e fundamento canônico citado.

## Resultado (entregue)
- Baseline: **158** (auth 85, contracts 15, partners 58) — 1:1 verificado.
- Melhorias 🔴: **17**. Regressão de fix (catálogo): **5**. Feature pendente (front): **12**.
- **Total: 192 casos** na rede. Rastreabilidade: `traceability.md` + parciais + `improvements-`,
  `regression-`, `pending-backend-traceability.md`.

## Referências
- Spec/plano: `specs/007-integration-test-suite/{spec,plan,research}.md`.
- Rede: `specs/007-integration-test-suite/safety-net/`.
