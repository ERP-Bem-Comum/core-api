# Specification Quality Checklist: Consolidação do harness nas primitivas nativas do Claude Code

**Purpose**: Validar completude e qualidade da especificação antes de avançar para o planejamento
**Created**: 2026-07-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — os 3 foram resolvidos por decisão do responsável em 2026-07-30 (FR-015, FR-016, FR-017)
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

**Sobre "no implementation details":** esta feature tem como objeto o próprio ferramental, então
nomes de ferramenta (`.specify/`, skills, dynamic workflows) aparecem por serem **o assunto**, não
por vazamento de implementação. Os critérios de sucesso (SC-001 a SC-009) permanecem agnósticos:
medem reprodutibilidade, ausência de contradição, unicidade de fonte e recuperabilidade — nenhum
depende da ferramenta escolhida.

**Sobre os 3 marcadores, agora resolvidos:** eram decisões de escopo sem default razoável, porque
determinavam **o que a feature é**. Decididos em 2026-07-30: remover `.specify/` por inteiro com
reimplementação prévia do que sobrevive (FR-015); absorver os princípios em `AGENTS.md` +
`.claude/rules/` (FR-016); reimplementar o fluxo como skills encadeadas com gate humano (FR-017).

**Correção registrada:** a análise inicial apresentou dynamic workflows como substituto direto do
`core-api-sdd`. A doc oficial os desqualifica para esse papel — _"No mid-run user input… For sign-off
between stages, run each stage as its own workflow"_ — e o fluxo SDD depende de gate humano entre
fases. Workflows substituem a orquestração de fan-out, não o protocolo de gate. FR-017 registra a
proibição para que a análise errada não seja refeita adiante.

**Escopo acrescido pelo responsável (US5, FR-018 a FR-024):** destilar os 55 ADRs em regras
path-scoped. Aceito com três travas anti-drift, porque a versão ingênua da ideia — um ADR, uma regra
— produziria 427 KB de doutrina duplicada e recriaria exatamente a falha que esta spec remove.

**Sobre a premissa única — errada e corrigida (2026-07-30):** a spec nasceu assumindo "Claude Code é
o único consumidor de agente", com a consequência declarada de que, se falsa, a decisão se inverteria.
**A premissa era falsa:** o ADR-0054 (aceito) declara Claude Code **e Kimi Code**, e o repo versiona o
symlink `.agents/skills`. Descoberto ao investigar uma pergunta do responsável sobre `.agents/`.

A decisão **não** se inverteu, e a análise ficou mais forte: o repo é multi-agente, mas a portabilidade
real nunca veio do spec-kit — vem do `AGENTS.md` e do symlink. O spec-kit tem uma única integração
instalada. Registrado como FR-025/FR-026 para que a entrega não regrida a portabilidade que de fato
existe.

**Lição de método:** a premissa foi escrita a partir do enunciado do responsável e não foi verificada
contra os ADRs aceitos antes de virar fundamento da spec. A hierarquia de fontes do `AGENTS.md` existe
justamente para isso — ADR aceito vence suposição, inclusive a do autor da spec.

**Sobre o viés de confirmação:** a spec foi escrita a partir de uma hipótese do responsável (remover
o spec-kit). Para não virar profecia autorrealizável, FR-003 exige avaliar a opção de **não remover**,
e a seção "Honestidade de escala" desqualifica antecipadamente o argumento de volume, que seria o
caminho fácil e errado para justificar a remoção.
