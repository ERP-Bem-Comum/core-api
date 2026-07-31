# Specification Quality Checklist: Aposentadoria da pipeline W0→W3

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Sobre "no implementation details" nesta spec

Esta feature é atípica: o **produto afetado é o próprio ambiente de desenvolvimento**, não uma
funcionalidade de negócio. Por isso caminhos de arquivo e contagens aparecem no bloco
"Contexto do problema", nos Edge Cases e nas Assumptions — ali eles são **evidência medida**
que justifica a decisão e delimita o escopo, não prescrição de implementação.

O teste que importa foi aplicado onde conta: **FR-001 a FR-024** e **SC-001 a SC-009** estão
redigidos por comportamento observável ("deixar de anexar conteúdo derivado do acervo",
"a busca retorna zero ocorrências", "a contagem no destino é idêntica à da origem"), sem dizer
_como_ remover — se por exclusão, reescrita, movimentação ou reconfiguração. O plano decide o como.

Duas exceções deliberadas, ambas por serem **fronteiras de escopo**, não instruções:

- **FR-017 / SC-007** citam `src/` nominalmente. É a garantia central da feature — código de
  produção não é tocado — e perderia força se enunciada de forma vaga.
- **FR-022** exige ADR. É requisito de governança imposto pela hierarquia de regras do projeto
  (ADRs aceitos são imutáveis), não escolha técnica.

### Validação executada

Rodada única, sem iterações necessárias. Nenhum item falhou.

Fatos verificados no repositório antes da redação, e não assumidos:

- `scripts/pipeline/` não é importado por nenhum arquivo em `src/` — sustenta FR-017.
- Nenhum ADR aceito **institui** a pipeline; as 7 menções (`0018`, `0022`, `0023`, `0034`,
  `0040`, `0042`, `0050`, `0054`) são referenciais — sustenta a leitura de FR-022 e evita
  um supersede desnecessário.
- A constituição **institui** a pipeline no Princípio I, marcado NÃO-NEGOCIÁVEL — sustenta FR-011
  e a seção "Impacto Arquitetural".
- Nenhum workflow de CI invoca comandos de pipeline — sustenta a última Assumption.
- 11 worktrees ativos possuem checkout próprio do acervo — sustenta o Edge Case correspondente.
- `.gitignore` não tem entrada para o acervo hoje — sustenta FR-020.

### Pendências para o planejamento

Nenhuma bloqueia `/speckit-plan`. Registradas como Assumptions revisáveis via `/speckit-clarify`:

1. Caminho exato do destino do acervo (garantida a preservação; a organização final é do usuário).
2. Redação final da emenda ao Princípio I da constituição.
3. Política para os 11 worktrees (assumido: tratados na integração de cada branch).

### ⚠️ Bloqueio técnico para a implementação (não para o planejamento)

O repositório está com `core.bare = true` apesar de ter árvore de trabalho completa e branch
ativa (`fix/368-deadman-audit-false-fired`). Nesse estado, toda operação de índice falha com
`this operation must be run in a work tree` — o que **impede FR-019 (remover do versionamento),
FR-021 (recuperabilidade pelo histórico) e FR-023 (commits atômicos por camada)**.

Registrado como Edge Case na spec. Precisa ser resolvido no plano, **antes** da evacuação do
acervo. A correção é decisão do dono do repositório — provável resíduo do arranjo de worktrees —
e está fora do escopo desta feature, que apenas depende dela.
