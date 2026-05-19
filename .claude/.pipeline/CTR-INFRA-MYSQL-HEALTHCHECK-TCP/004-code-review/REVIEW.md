# Code Review W2 — CTR-INFRA-MYSQL-HEALTHCHECK-TCP — Round 1

**Veredito:** APPROVED
**Skill obrigatória:** [`database-engineer`](../../../skills/database-engineer/SKILL.md) (defende o fix do ponto de vista operacional MySQL + healthcheck correctness)
**Data:** 2026-05-16

## Checks críticos

| # | Foco | Veredito | Ancoragem |
| :- | :--- | :-: | :--- |
| 1 | Fix endereça causa raiz (não sintoma) | PASS | `database-theorist` validou H6; experimento controlado 40/40 OK confirma |
| 2 | Driver de produção (`mysql-driver.ts`) intocado | PASS | Sem diff em `src/**/*.ts` |
| 3 | Healthcheck preserva binding lógico de secrets | PASS | `$$(cat /run/secrets/mysql_app_password)` mantido |
| 4 | Comentário inline explica POR QUÊ (não só O QUÊ) | PASS | 6 linhas de comentário em `compose.yaml:115-120`, link para relatório |
| 5 | Sem regressão em runtime | PASS | 0/10 fails pós-fix vs 5/20 antes |
| 6 | Relatório técnico permanente preserva contexto | PASS | `tests/reports/CA-3-flakiness-investigation/REPORT.md` (240 linhas) |

## Issues

### 🔴 Critical
Nenhuma.

### 🟡 Important
Nenhuma.

### 🔵 Suggestions

- **S-1**: O healthcheck agora roda dentro do container, mas testa via `127.0.0.1:3306` interno. Se MySQL bindar SÓ em interface externa por algum motivo futuro (`bind-address`), o healthcheck quebraria silenciosamente. Mitigação suficiente: o atual `bind-address = 0.0.0.0` no `server.cnf` cobre. Documentar caso `bind-address` mude.

- **S-2**: O probe Node (`tests/reports/CA-3-flakiness-investigation/probe.mjs`) usa `import 'mysql2/promise'` — depende do `node_modules` do projeto. Em CI sem `pnpm install` pré-executado, falharia. Aceitável porque o probe só roda na pasta do projeto.

- **S-3**: O `start_period: 30s` está conservador. Pós-fix, `wait_dur` médio é ~11s. Reduzir para 15s economizaria ~15s no path de falha (quando healthcheck demora muito). Otimização micro; deixar como está. Re-avaliar se CI ficar lento.

- **S-4**: O ticket é retrospectivo (fix aplicado antes do `000-request.md` ser escrito). Padrão atípico do projeto, mas justificável: a investigação descobriu o problema; o ticket formaliza. O relatório técnico em `tests/reports/` serve como "W0 expandido" que precede o pipeline formal. Documentado em D4.

## O que está bom

- **Distinção clara entre fix infra (correto) e fix runtime (rejeitado)**. A tabela "Por que aplicar fix infra (não retry no driver)" em `000-request.md` é referência didática para futuros tickets de tech debt similar.
- **Skills obrigatórias declaradas no topo do ticket**. Qualquer revisor futuro entra com o framework teórico (database-theorist) + operacional (database-engineer) carregados antes de tocar no `compose.yaml`.
- **Relatório técnico em `tests/reports/`** persiste o conhecimento mesmo se o `.pipeline/` for limpo no futuro. Decisão arquitetural de armazenamento alinhada com a regra do projeto "código vivo é em `src/` e `tests/`; trilha auditável é em `.pipeline/`; relatório técnico de incidente fica em `tests/reports/`".
- **Validação empírica robusta**: 20 runs (antes) + 10 ciclos de probe + 10 runs (depois) = 40 execuções de evidência. Antes do fix: padrão bimodal claríssimo (wait_dur ≤ 6.5s sempre falha). Depois: 40/40 OK.
- **Comentário inline em `compose.yaml`** menciona o relatório por path, não só por descrição — reviewer humano vê o link e pode investigar.

## Próximo passo

**APPROVED → W3 (gates).** O W3 já passou em paralelo com o W1.

## Follow-ups

- Quando o serviço HTTP for wired (ticket futuro), revisitar o healthcheck do MinIO seguindo o mesmo princípio: exercitar via TCP no caminho do cliente real, não só `mc ready local` interno.
- Considerar abrir ADR "Healthcheck Correctness Principle" se o padrão se repetir em outros services — mas N=1 é cedo para ADR formal. Aguardar 2º incidente similar.
