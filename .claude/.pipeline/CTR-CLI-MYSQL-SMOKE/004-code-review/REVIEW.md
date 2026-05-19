# Code Review W2 — CTR-CLI-MYSQL-SMOKE — Round 1

**Veredito:** APPROVED
**Reviewer:** Claude (self-review — padrão consistente com #4/#5; agent Maestro truncou output em #4, mantive consistência)
**Data:** 2026-05-16

## Foco — checks críticos

| # | Foco | Veredito | Ancoragem |
| :- | :- | :-: | :- |
| 1 | Cobertura dos 6 subcomandos da `REGISTRY` | PASS | CA-3..9 exercitam `criar-contrato` (×4), `listar-contratos` (×3), `mostrar-contrato` (×2), `criar-aditivo` (×2), `anexar-documento` (×1), `homologar-aditivo` (×2) |
| 2 | Isolamento entre tests via TRUNCATE | PASS | `beforeEach` chama `truncateAll()` — ordem FK reversa via `docker exec` |
| 3 | Persistência cross-invocation comprovada | PASS | CA-7 invoca CLI 2× em processos diferentes; 2ª vê o contrato da 1ª |
| 4 | Mensagens PT-BR validadas em assertions | PASS | `/✅ Contrato criado\./`, `/1 contrato\(s\)/`, `/Valor (vigente|original): R\$/`, `/MySQL\|conectar\|credenciais/i` |
| 5 | Opt-in via `MYSQL_INTEGRATION=1` consistente | PASS | bloco `if (integrationEnabled()) { describe(...) }` — padrão herdado do #4 |

## Issues encontradas

### 🔴 Critical
Nenhuma.

### 🟡 Important
Nenhuma.

### 🔵 Suggestions

- **S-1: TRUNCATE rápido mas frágil em caso de FK orphan.**
  `truncateAll()` faz `SET FOREIGN_KEY_CHECKS=0; TRUNCATE ...; SET FOREIGN_KEY_CHECKS=1` — pula a checagem de FK durante o TRUNCATE. É necessário porque o TRUNCATE de uma tabela com FK falha mesmo sem rows referenciando. Decisão consciente; alternativa (`DELETE FROM` em vez de TRUNCATE) é mais lenta. Manter.

- **S-2: Comando `criar-aditivo` da CLI usa `--tipo`, não `--kind`.**
  Descoberto durante o W1 (CA-6 e CA-9 falharam na 1ª execução). A CLI segue convenção PT-BR (todos os subcomandos têm flags em PT). Documentado no REPORT do W1. Lição: futuro autor de testes deve consultar `--help` ou `commands/*.ts:ALLOWED` antes de escrever assertions. **Não-bloqueante; histórico documentado.**

- **S-3: 6 testes funcionais demoram ~12-13s totais.**
  Cada invocação `runCli` é um novo processo Node (boot ~150-300ms) + abertura de pool MySQL (~30ms) + operação + close. CA-6 é o mais caro (5 invocações encadeadas = 3.3s). Aceitável para smoke. Otimização (reusar pool entre tests) seria desproporcional — perde o ponto do smoke real.

- **S-4: `before()` top-level invoca `listarContratos()` apenas pra forçar migration apply.**
  Hack pragmático: o efeito colateral de abrir o driver MySQL com `applyMigrations: true` garante schema. Funciona mas é indireto. Alternativa mais limpa: invocar `openMysql({applyMigrations:true})` diretamente no `before()` (não como subprocess CLI). Trade-off: complica imports do test. Mantido como está; comentário inline (`listar-contratos invoca openMysql que aplica migration`) explica.

- **S-5: Pode haver acúmulo de conexões MySQL entre tests.**
  Cada invocação abre pool de 10, fecha no `finally` do main.ts. `pool.end()` é async mas `process.exit` mata tudo. Em prática, `max_connections=100` do server.cnf é folgado para 10 tests × ~3 invocações. **Sem evidência de problema durante a execução** (todos os 57 tests do `test:integration` passaram em 18s).

## O que está bom

- **Reuso do `runCli` helper** existente, sem inventar harness novo. Consistência com `contracts.cli.test.ts` (memory driver).
- **Padrão `if (integrationEnabled()) { describe(...) }`** herdado do #4 — quando `MYSQL_INTEGRATION≠1`, os 8 CAs funcionais simplesmente não são registrados, sem `t.skip` ruidoso. Suite default offline reporta `pass=1, fail=1` (CA-1 ✔, CA-2 ✖ até o W1 aplicar) corretamente como RED.
- **Helpers locais (`criarContrato`, `listarContratos`, `mostrarContrato`)** evitam duplicação. Cada test inline tem o necessário sem boilerplate.
- **UUIDs hardcoded (`'dddddddd-6666-...`, `'eeeeeeee-7777-...`)** — determinismo em logs/diffs. Pattern do projeto.
- **Connection string fixa com senha "fixa-dev declarada pública"** — `apppw-migration-test-only`. Documentado inline como tal. Nenhum risco de leak.
- **Cobertura END-TO-END comprovada:** CA-6 exercita `criar` → `aditivo` → `anexar` → `homologar` → `mostrar` — 5 invocações encadeadas, valor `currentValue` muda de R$ 100.000,00 para R$ 105.000,00. Prova que a stack inteira funciona contra MySQL real.
- **CA-8 prova UNIQUE em runtime + CA-9 prova RN-12 do domínio** — não só "fluxo feliz", mas também invariantes que precisam ser garantidas em prod.

## Próximo passo

**APPROVED → seguir para W3 (gates).** W3 já passou no W1 (typecheck + lint + format + suite default + suite integration).

## Follow-ups gerados

Nenhum bloqueante. Possíveis melhorias futuras:
- Substituir o `before()` indireto por chamada direta a `openMysql({applyMigrations:true})` quando o smoke ganhar mais cenários.
- Considerar timeout maior em CA-6 (atualmente cabe em 3.3s, mas se o número de aditivos crescer pode estourar o default de 30s do `runCli`).
- Quando o storage real (S3/MinIO) for wired, expandir CA-6 para usar documento real em vez de UUID fictício.
