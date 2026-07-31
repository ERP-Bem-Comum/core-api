# Specification Quality Checklist: Alinhar as regras de agente à realidade do código

**Purpose**: Validar completude e qualidade da especificação antes de avançar para o planejamento
**Created**: 2026-07-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — zero abertos
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

## Notas de validação

**Por que zero `[NEEDS CLARIFICATION]`:** ao contrário da spec 039 — que precisava de três decisões de
escopo do responsável — esta feature tem escopo determinado pela evidência. O que fazer está definido
pelos fatos: onde a rule mente, corrige-se a rule; onde o código regride, abre-se issue. Não há
bifurcação que dependa de preferência.

A única decisão com alternativa razoável — **o que fazer com norma decidida mas não implementada**
(caso ADR-0026, read/write split) — foi resolvida por default documentado nas Assumptions: a rule
**omite**, porque rule governa o que fazer **agora**, no ponto de edição. Marcar como "alvo futuro"
dentro da rule reintroduziria exatamente o problema que a feature ataca: texto que descreve algo que
não existe. O registro fica no documento de destilação, não na rule.

**Sobre a auto-referência:** esta spec audita rules que **eu escrevi nesta mesma sessão**, algumas há
minutos. A `adapters.md` já provou que recém-escrita não significa correta — afirma um read/write
split que o código nunca implementou. A auditoria não tem tratamento especial para rule nova.

**Sobre "no implementation details":** a feature tem como objeto o próprio ferramental, então caminhos
(`src/`, `.claude/rules/`) aparecem por serem **o assunto**. Os critérios de sucesso permanecem
agnósticos — medem cobertura, ausência de afirmação falsa, e se uma violação deliberada é detectada.

**Sobre SC-008:** exige testar o mecanismo introduzindo uma violação de propósito, não presumir que
funciona. É a mesma disciplina que o ADR-0038 aplica a coleções Bruno: escrito e não executado é
cobertura ilusória.
