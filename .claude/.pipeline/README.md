# 🌊 `.pipeline/` — Trilha de execução de tickets

> **Propósito:** cada ticket de trabalho não-trivial vive numa pasta aqui. A pipeline 4-wave (W0 RED → W1 GREEN → W2 REVIEW → W3 QUALITY) deixa trilha auditável de cada decisão e cada output.

Inspirado em `.pipeline/phase-*/tickets/<TICKET>/` do projeto ACDG/frontend.

---

## Estrutura de um ticket

```
.pipeline/<TICKET-ID>/
├── 000-request.md           # ESCOPO escrito por humano antes de começar
├── 002-tests/
│   └── REPORT.md            # W0 — testes RED (falham)
├── 003-impl/
│   └── REPORT.md            # W1 — implementação até GREEN
├── 004-code-review/
│   └── REVIEW.md            # W2 — audit read-only
├── 005-quality/
│   └── REPORT.md            # W3 — tsc + format + tests + (build)
└── STATE.md                 # status acumulado
```

> Numeração com salto (sem 001) segue o estilo ACDG. No futuro `001-contracts/` pode ser usado se introduzirmos OpenAPI specs explícitas.

---

## Convenção de nomenclatura de ticket

`<MÓDULO>-<TIPO>-<DESCRICAO-CURTA>` em kebab-case. Exemplos:

- `CTR-VO-MOEDA` — implementar VO Moeda no módulo Contratos.
- `CTR-AGG-CONTRATO` — implementar agregado Contrato Mãe.
- `CTR-AGG-ADITIVO` — implementar agregado Aditivo.
- `CTR-USECASE-HOMOLOGAR-ADITIVO` — use case `homologarAditivo` com EventBus.
- `CTR-CLI-MVP` — CLI inicial para a P.O. validar regras.
- `FIN-VO-NUMERO-CONTABIL` — Fase 2, módulo Financeiro.

---

## Quando abrir um ticket

| Tarefa | Abre ticket? |
| :--- | :--- |
| Novo agregado / VO / use case | ✅ Sim |
| Mudança não-trivial em código de produção | ✅ Sim |
| Bug fix > 3 linhas ou que envolva regra de domínio | ✅ Sim |
| Bug fix trivial (typo, comment) | ❌ Não — commit direto |
| Mudança de docs em `handbook/` ou `.claude/` | ❌ Não — commit direto |
| Mudança de config (`tsconfig`, `package.json`) | ❌ Não — commit direto |
| Refactor sem mudança de comportamento | ⚠️ Depende — ticket se atravessa fronteira de módulo |

---

## Fluxo da pipeline (resumo executivo)

```
1. Humano escreve 000-request.md com escopo.
2. Orquestrador chama pipeline-maestro.
3. W0 — ts-domain-modeler escreve testes RED.
4. W1 — ts-domain-modeler (ou ports-and-adapters) implementa até GREEN.
5. W2 — code-reviewer faz audit; APPROVED ou REJECTED+issues.
6. W2 REJECTED ⇒ volta a W1 (max 3 rounds).
7. W3 — ts-quality-checker roda tsc + tests + format.
8. STATE.md final = ✅ done; ticket fica como histórico.
```

Detalhes em [`../skills/pipeline-maestro/SKILL.md`](../skills/pipeline-maestro/SKILL.md).

---

## Como navegar tickets passados

```bash
# Listar tickets
ls .pipeline/

# Ver status atual de um ticket
cat .pipeline/<TICKET>/STATE.md

# Ver issues do round 2 da review
cat .pipeline/<TICKET>/004-code-review/REVIEW.md

# Ver decisões de design de uma implementação
cat .pipeline/<TICKET>/003-impl/REPORT.md
```

---

## O que NÃO vai em `.pipeline/`

- Código de produção — vai em `src/`.
- Documentação de domínio — vai em `handbook/domain/`.
- ADRs — vão em `handbook/architecture/adr/`.
- Inquiries (decisões em curso, perguntas abertas) — vão em `handbook/inquiries/`.
- Notas pessoais — não ficam versionadas.

`.pipeline/` é **estritamente** sobre execução técnica de tickets.

---

## Limpeza

Tickets concluídos permanecem como histórico. **Não deletar** — eles documentam por que cada decisão foi tomada.

Se a pasta crescer muito (>100 tickets), considerar arquivar em `.pipeline/archive/<ano>/` mantendo a estrutura.

---

## Template inicial

Ao abrir um novo ticket, copiar:

```bash
TICKET=CTR-VO-MOEDA
mkdir -p .pipeline/$TICKET/{002-tests,003-impl,004-code-review,005-quality}
cat > .pipeline/$TICKET/000-request.md <<'EOF'
# Ticket CTR-VO-MOEDA: VO Moeda com precisão em centavos

## Contexto
A regra do handbook (handbook/architecture/03-data-architecture.md §9) exige
DECIMAL para valor monetário. Implementar VO Moeda usando `centavos: number`
(inteiro) para evitar erros de ponto flutuante.

## Escopo
- src/modules/contratos/domain/shared/moeda.ts
- src/modules/contratos/domain/shared/moeda.test.ts

## Fora de escopo
- Conversão de/para DECIMAL no adapter MySQL (próximo ticket).
- Localização (R$ em texto) — fica no `cli/format.ts`.

## Critérios de aceite
- [ ] `Moeda.fromCentavos(150)` retorna `Ok({ centavos: 150 })`
- [ ] `Moeda.fromCentavos(-1)` retorna `Err('moeda-valor-negativo')`
- [ ] `Moeda.fromCentavos(1.5)` retorna `Err('moeda-valor-nao-inteiro')`
- [ ] `Moeda.somar(a, b)` é puro e associativo
- [ ] `Moeda.subtrair(a, b)` quando `b > a` retorna erro
- [ ] Tipo é branded — `string as Moeda` falha em compile-time

## Referências
- handbook/domain/contratos/04-aditivos-context.md §4 (Moeda VO)
- handbook/architecture/03-data-architecture.md §9 (DECIMAL)
- .claude/skills/ts-domain-modeler/references/ts-branded-types.md
EOF
cat > .pipeline/$TICKET/STATE.md <<'EOF'
# Estado do Ticket CTR-VO-MOEDA

| Wave | Status | Skill | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED | ⬜ pending | ts-domain-modeler | — |
| W1 — GREEN | ⬜ pending | ts-domain-modeler | — |
| W2 — REVIEW | ⬜ pending | code-reviewer | — |
| W3 — QUALITY | ⬜ pending | ts-quality-checker | — |

## Próximo passo
Iniciar W0 — escrever testes do VO Moeda que falham.
EOF
```

---

## Referências

- [`../README.md`](../README.md) — Visão geral do `.claude/`.
- [`../agents/contratos-orchestrator.md`](../agents/contratos-orchestrator.md) — Orquestrador que invoca as waves.
- [`../skills/pipeline-maestro/SKILL.md`](../skills/pipeline-maestro/SKILL.md) — Detalhes de cada wave.
