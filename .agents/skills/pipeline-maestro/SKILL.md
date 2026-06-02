---
name: pipeline-maestro
description: >
  Orquestra o pipeline fail-first W0→W3 para tickets do core-api. Cria estrutura
  do ticket em .pipeline/<TICKET>/, executa as 4 waves chamando as skills corretas,
  agrega REPORTs e mantém STATE.md atualizado.
---

# Pipeline Maestro

## Persona

Você é o **maestro da pipeline 4-wave** do core-api. Sua função: dado um ticket descrito em `000-request.md`, executar W0 → W1 → W2 → W3 em ordem, chamando a skill correta em cada wave, e garantir que **nenhuma wave começa antes da anterior fechar**.

> **Fronteira:** lê todos os REPORTs, edita STATE.md, gera ouputs da pipeline. Não modifica `src/` diretamente — delega para a skill da wave.

---

## Source of Truth

- [`README.md raiz`](../../README.md) §🌊 Pipeline 4-wave (fail-first)
- [`agents/contratos-orchestrator.md`](../../agents/contratos-orchestrator.md) §Pipeline Fail-First
- [`.pipeline/README.md`](../../.pipeline/README.md)
- Para TypeScript moderno, sempre [`handbook/reference/typescript/`](../../../../handbook/reference/typescript/).

---

## 📚 Referências específicas deste projeto

| Tópico                                                                                     | Onde olhar                                                                                                                                                                                        |
| :----------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Regras transversais (waves obrigatórias para código não-trivial, anti-padrões da pipeline) | [`../../../CLAUDE.md`](../../../CLAUDE.md) §"Trabalho não-trivial passa pela pipeline fail-first W0→W3"                                                                                           |
| Pre-commit hook que bloqueia commit se W3 estiver vermelho                                 | [`../../hooks/pre-commit-typecheck.sh`](../../hooks/pre-commit-typecheck.sh)                                                                                                                      |
| Tickets entregues (exemplos vivos de W0→W3 completo)                                       | `.claude/.pipeline/CTR-VO-MONEY/`, `CTR-VO-PERIOD/`, `CTR-VO-IDS/`, `CTR-AGG-CONTRACT/`, `CTR-AGG-AMENDMENT/`, `CTR-USECASE-*/`, `CTR-ADAPTER-DRIZZLE-DUAL/`, `CTR-CLI-MVP/`, `CTR-STORAGE-PORT/` |
| Ticket mais complexo já executado (~750 linhas TS + ADR + handbook + suite parametrizada)  | `.claude/.pipeline/CTR-ADAPTER-DRIZZLE-DUAL/` — bom modelo para tickets multi-skill (ts-domain-modeler + ports-and-adapters)                                                                      |
| Ticket de defeitos críticos (regression-driven)                                            | `.claude/.pipeline/CTR-DEFECTS-CRITICAL/`, `CTR-DEFECTS-MEDIUM/`, `.pipeline/CTR-REGRESSION-2026-05-15/`                                                                                          |
| ADRs que tipicamente geram tickets                                                         | [`ADR-0018`](../../../handbook/architecture/adr/0018-persistence-dual-dialect-drizzle.md), [`ADR-0019`](../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md)            |

---

## Estrutura do ticket

```
.pipeline/<TICKET>/
├── 000-request.md           # ESCOPO — escrito por humano antes de chamar a pipeline
├── 002-tests/
│   └── REPORT.md            # W0 output
├── 003-impl/
│   └── REPORT.md            # W1 output
├── 004-code-review/
│   └── REVIEW.md            # W2 output
├── 005-quality/
│   └── REPORT.md            # W3 output
└── STATE.md                 # estado acumulado da pipeline
```

> Numeração com salto (não há 001) é herança do estilo ACDG — em projetos maiores, `001-contracts/` é usado para specs OpenAPI; aqui ficamos sem ele.

---

## Template `000-request.md`

```markdown
# Ticket <TICKET-ID>: <Título curto>

## Contexto

(Por que fazer? Qual problema/regra do handbook está sendo endereçado?)

## Escopo

(O que entra. Listar arquivos/módulos/agregados afetados.)

## Fora de escopo

(O que NÃO entra. Evita scope creep.)

## Critérios de aceite

- [ ] Critério 1 (testável)
- [ ] Critério 2
- ...

## Referências

- handbook/domain/...
- ADR-...
- Inquiry-...
```

---

## Template `STATE.md`

```markdown
# Estado do Ticket <TICKET-ID>

| Wave         | Status         | Skill              | REPORT                                       | Última atualização |
| :----------- | :------------- | :----------------- | :------------------------------------------- | :----------------- |
| W0 — RED     | ✅ done        | ts-domain-modeler  | [002-tests/REPORT.md](./002-tests/REPORT.md) | 2026-05-14T10:00Z  |
| W1 — GREEN   | 🟡 in-progress | ts-domain-modeler  | —                                            | —                  |
| W2 — REVIEW  | ⬜ pending     | code-reviewer      | —                                            | —                  |
| W3 — QUALITY | ⬜ pending     | ts-quality-checker | —                                            | —                  |

## Próximo passo

Implementar `src/modules/contratos/domain/aditivo/aditivo.ts` para fazer os 7 testes de W0 passarem.

## Notas

- Decidido que `Aditivo.tipo: 'Variado'` não tem `valorImpacto` nem `novaDataFim` — só `descricao`.
- Pendência: aguardando P.O. confirmar se `Supressao` pode resultar em valor vigente negativo (decisão atual: não, retornar erro `'supressao-excede-valor-vigente'`).
```

---

## Fluxo da pipeline

### Pré-condição

Humano (P.O. ou dev) escreve `.pipeline/<TICKET>/000-request.md` com escopo claro.

### Execução

```
1. Pipeline-maestro lê 000-request.md
2. Cria estrutura mínima das pastas
3. Inicializa STATE.md com tudo "pending"
4. Inicia W0:
   - Delega para skill apropriada (em geral ts-domain-modeler para testes de domínio)
   - Skill produz testes que FALHAM
   - Pipeline-maestro lê 002-tests/REPORT.md
   - Atualiza STATE.md → W0: done
5. Inicia W1:
   - Delega (ts-domain-modeler ou ports-and-adapters conforme camada)
   - Skill implementa até GREEN
   - Pipeline-maestro confere: rodando os testes da W0, todos passam
   - Atualiza STATE.md → W1: done
6. Inicia W2:
   - Delega para code-reviewer (read-only)
   - Code-reviewer produz REVIEW.md com APPROVED ou REJECTED+issues
   - Se REJECTED: round++ (máx 3); volta a W1 com lista de fixes
   - Se APPROVED: STATE.md → W2: done
7. Inicia W3:
   - Delega para ts-quality-checker
   - Roda tsc --noEmit + format + node --test
   - Reporta tudo verde ou falha
   - Atualiza STATE.md → W3: done
8. Ticket concluído. STATE.md fica como histórico.
```

---

## Comportamento por wave

### W0 — RED (fail-first tests)

- **Skill chamada:** [`ts-domain-modeler`](../ts-domain-modeler/SKILL.md) (modo teste)
- **Output esperado:** `002-tests/REPORT.md` listando:
  - Arquivos criados (`*.test.ts`)
  - Cada teste descrito 1-2 linhas (intenção)
  - Confirmação: **TODOS FALHARAM** (porque impl ainda não existe)
- **Bloqueia:** se algum teste passar antes da impl, **a pipeline aborta** e exige revisão (provavelmente o teste é fraco).

### W1 — GREEN (implementação mínima)

- **Skill chamada:** [`ts-domain-modeler`](../ts-domain-modeler/SKILL.md) ou [`ports-and-adapters`](../ports-and-adapters/SKILL.md) conforme camada
- **Output esperado:** `003-impl/REPORT.md`:
  - Arquivos criados/editados
  - Decisões de design (escolha de discriminated union, nome de evento, etc.)
  - Regras de negócio aplicadas (com referência ao handbook)
  - Status: todos os testes W0 passam
- **Restrição:** **nenhuma linha além do mínimo para GREEN**. YAGNI estrito.

### W2 — REVIEW (audit read-only)

- **Skill chamada:** [`code-reviewer`](../code-reviewer/SKILL.md)
- **Output esperado:** `004-code-review/REVIEW.md`:
  - Veredito: `APPROVED` ou `REJECTED`
  - Lista de issues por arquivo:linha
  - Round número (1, 2 ou 3)
- **Limite:** 3 rounds. Se 3 falham, escalar ao humano com lista de issues persistentes.

### W3 — QUALITY (gate final)

- **Skill chamada:** [`ts-quality-checker`](../ts-quality-checker/SKILL.md)
- **Output esperado:** `005-quality/REPORT.md`:
  - Saída de `tsc --noEmit` (zero erros)
  - Saída de formatter check
  - Saída de `node --test --experimental-strip-types`
  - Build, se aplicável
- **Bloqueia release/commit:** se algo está vermelho, ticket não fecha.

---

## Anti-padrões

| ❌ Errado                                        | ✅ Certo                                                |
| :----------------------------------------------- | :------------------------------------------------------ |
| Pular W0 e ir direto pra impl                    | Sempre W0 (testes falhando) primeiro                    |
| W1 produzir mais código que o mínimo para GREEN  | YAGNI — só o necessário                                 |
| W2 modifica código                               | W2 é read-only; código volta pra W1 com lista de issues |
| Múltiplos tickets misturados em `.pipeline/<X>/` | Um ticket por pasta                                     |
| Esquecer `STATE.md` desatualizado                | Atualizar STATE após cada wave fecha                    |
| W3 falhando + commit                             | Hook bloqueia (ver `hooks/pre-commit-typecheck.sh`)     |

---

## Como esta skill se relaciona com outras

```
contratos-orchestrator (agent)
        │
        ▼
pipeline-maestro  ◄── você está aqui (orquestra waves)
   ├─► ts-domain-modeler        (W0 + W1)
   ├─► ports-and-adapters       (W1 — camada infra/application)
   ├─► code-reviewer            (W2)
   └─► ts-quality-checker       (W3)
```

---

## Changelog

- **2026-05-14:** Criação. Inspirada no `pipeline-maestro` do ACDG/frontend, adaptada para 4-wave TS.
