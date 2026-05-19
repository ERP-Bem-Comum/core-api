# W3 — QUALITY — CTR-INFRA-MYSQL-HEALTHCHECK-TCP

**Wave:** W3 (QUALITY)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — todos os gates clean

## Gates

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` | ✅ exit 0 |
| Lint | `pnpm run lint` | ✅ exit 0 (após `tests/reports/**` em ignores) |
| Format check | `pnpm run format:check` | ✅ |
| `compose config` (sintaxe) | `docker compose config` | ✅ exit 0 |
| Probes TCP pós-fix | 10 ciclos × 4 probes = 40 | ✅ 40/40 OK |
| `pnpm test:integration` pós-fix | 10 runs back-to-back | ✅ 10/10 GREEN (57/57 cada) |

## Estatística comparativa

| Métrica | Antes do fix | Depois do fix |
| :--- | :-: | :-: |
| Runs de `test:integration` | 20 | 10 |
| Fails | 5 | 0 |
| **Taxa de fail** | **25%** | **0%** |
| `wait_dur` médio | bimodal | 11.0s mediana |
| `wait_dur` mínimo | 5.9s (cenário de fail) | 10.9s |
| Probes TCP imediatos pós `--wait` | 32/40 OK | 40/40 OK |

## Conteúdo do commit semântico sugerido

```
fix(infra): healthcheck do MySQL via TCP em vez de socket Unix

Healthcheck anterior do `compose.yaml` usava `mysql` CLI default (socket Unix).
Socket Unix interno aceita conexões antes do listener TCP estar pronto, fazendo
`docker compose up --wait` retornar prematuro. Primeira conexão do `mysql2`
rodando no HOST falhava com `Connection lost: The server closed the connection`.

Taxa de flakiness antes do fix: 5/20 runs de `pnpm test:integration` (25%).
Depois do fix: 0/10 (0%).

Mudanças:
- compose.yaml: healthcheck.test usa --protocol=tcp -h 127.0.0.1
- eslint.config.js: ignores += tests/reports/**
- tests/reports/CA-3-flakiness-investigation/: relatório técnico (240 linhas)
  com 20 runs antes + 10 ciclos de probe + 10 runs depois

Por que fix infra e não retry no driver:
  - Driver mysql-driver.ts INTOCADO (não mascara erros reais de prod)
  - Healthcheck agora exercita o MESMO CAMINHO que o cliente real
  - Defesa em profundidade + observabilidade de boot preservadas
  - Princípio: Date (Introduction to DB Systems Cap. 9) + MySQL Refman

Pipeline: W0→W1→W2 (APPROVED)→W3
Skills obrigatórias usadas: database-theorist (W0), database-engineer (W1, W2)

Closes ticket CTR-INFRA-MYSQL-HEALTHCHECK-TCP.
Resolve tech debt herdado de CTR-CLI-MYSQL-SMOKE (#7).
```

## Lições para o repo

1. **Healthchecks no compose devem exercitar o caminho real do cliente.** Socket Unix interno ≠ TCP externo.
2. **`compose up --wait` é tão confiável quanto o healthcheck que ele aguarda.** Healthcheck "rápido demais" → `--wait` retorna prematuro.
3. **Caracterizar antes de fix.** A primeira tentativa (retry no driver) foi rejeitada por mascarar 5 hipóteses indistintamente sem evidência.
4. **Skills obrigatórias** funcionam — `database-theorist` ancorou raciocínio teórico no W0; `database-engineer` aplicou fix correto no W1. Ambas evitaram "tentativa e erro".

## Próximo

Sem follow-ups bloqueantes. Sequência ADR-0020 (#1-#8) + este ticket = **100% estável**.

Possíveis tickets futuros (não-bloqueantes):
- `CTR-INFRA-MINIO-HEALTHCHECK-AUDIT` — auditar healthcheck do MinIO seguindo o mesmo princípio. N=1 atualmente; aguardar 2º incidente para abrir.
- `CTR-ADR-HEALTHCHECK-CORRECTNESS` — formalizar princípio em ADR. Aguardar evidência mais ampla.
