Aqui está a lista completa dos documentos que a pipeline core-api-sdd (v2.0.0) pede — todos vivem em
  specs/<NNN-feature>/ e cada um tem template em core-api/.specify/templates/:

  Documentos por fase (a sequência da pipeline)

  #: 0
  Fase: Descoberta
  Documento: discovery.md
  Template: discovery-template.md
  Consultor (MCP): requirements-engineer
  Citação obrigatória?: —
  ────────────────────────────────────────
  #: 1
  Fase: SPEC
  Documento: spec.md
  Template: spec-template.md
  Consultor (MCP): requirements-engineer
  Citação obrigatória?: —
  ────────────────────────────────────────
  #: 2
  Fase: Domínio/BCs
  Documento: domain.md
  Template: domain-template.md
  Consultor (MCP): ddd-architect
  Citação obrigatória?: ✅ Evans/Vernon
  ────────────────────────────────────────
  #: 3
  Fase: ADRs
  Documento: adr/NNNN-*.md (1+)
  Template: adr-template.md
  Consultor (MCP): software-architect
  Citação obrigatória?: ✅
  ────────────────────────────────────────
  #: 4
  Fase: Métricas/NFRs
  Documento: metrics.md
  Template: metrics-template.md
  Consultor (MCP): software-architect + requirements-engineer
  Citação obrigatória?: ✅
  ────────────────────────────────────────
  #: 5
  Fase: Plano
  Documento: plan.md (+ research.md, data-model.md, quickstart.md, contracts/)
  Template: plan-template.md
  Consultor (MCP): software-architect + database-engineer
  Citação obrigatória?: ✅ nas decisões
  ────────────────────────────────────────
  #: 6
  Fase: BDD
  Documento: bdd/*.feature
  Template: bdd-template.md
  Consultor (MCP): requirements-engineer + tdd-strategist
  Citação obrigatória?: —
  ────────────────────────────────────────
  #: 6b
  Fase: Tasks
  Documento: tasks.md
  Template: tasks-template.md
  Consultor (MCP): —
  Citação obrigatória?: —
  ────────────────────────────────────────
  #: 7
  Fase: TDD (🔴 RED)
  Documento: plano de testes + tests/**/*.test.ts
  Template: tdd-template.md
  Consultor (MCP): tdd-strategist
  Citação obrigatória?: ✅ Kent Beck
  ────────────────────────────────────────
  #: —
  Fase: QA / Plano de testes
  Documento: qa-test-plan.md
  Template: qa-test-plan-template.md
  Consultor (MCP): tdd-strategist + requirements-engineer
  Citação obrigatória?: ✅ Agile Testing
  ────────────────────────────────────────
  #: 9
  Fase: Review (W2)
  Documento: review.md
  Template: review-template.md
  Consultor (MCP): clean-code-reviewer + security-reviewer
  Citação obrigatória?: ✅ Uncle Bob/OWASP
  ────────────────────────────────────────
  #: (opc)
  Fase: Checklist
  Documento: checklist.md
  Template: checklist-template.md
  Consultor (MCP): —
  Citação obrigatória?: —

  Não são "documento" (mas fazem parte das fases)

  - Fase 8 — Implementação (🟡 YELLOW): código em src/.
  - Fase 11 — Gate W3 (🟢 GREEN): /speckit-verify (typecheck+lint+test), sem doc.

  Artefatos do pipeline W0→W3 (a fase TDD/impl engata neles)

  Em .claude/.pipeline/<TICKET>/: 000-request.md, STATE.json/STATE.md, 002-tests/REPORT.md,
  003-impl/REPORT.md, 004-code-review/REVIEW.md, 005-quality/REPORT.md.

  Documento de governança (não é por-feature)
... (12 linhas)

Recolher (112 linhas)
