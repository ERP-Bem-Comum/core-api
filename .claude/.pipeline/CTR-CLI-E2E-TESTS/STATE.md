# Estado do Ticket CTR-CLI-E2E-TESTS

| Wave | Status |
| :--- | :--- |
| W0 — RED | ✅ done — testes e helpers escritos primeiro |
| W1 — GREEN | ✅ done — 16 testes E2E passando |
| W2 — REVIEW | ✅ APPROVED (sem mocks, sem throw fora de boundary, isolamento por UUID) |
| W3 — QUALITY | ✅ ALL GREEN — 243/243 testes (227 + 16 novos), format + lint + typecheck |

## 🎉 Ticket FECHADO — suite ponta-a-ponta da CLI

### Cobertura

| Cenário BDD | Testes | Status |
| :--- | :---: | :--- |
| **1.1** — Persistência e numeração | 4 | ✅ (inclui Defeitos #5 e #6) |
| **1.2** — Motor de cálculo (Addition) | 1 (encadeia 4 comandos) | ✅ |
| **2.1** — Bloquear homologação sem documento | 1 | ✅ |
| **2.2** — Validação de magnitude (Suppression) | 4 (setup + happy + neg + zero) | ✅ |
| **Side-effects** — `--state` / `--no-state` | 2 | ✅ |
| **Help / usage** | 3 | ✅ |
| **Defeito #12** — state file corrompido | 1 | ✅ |

### Estrutura entregue

```
tests/cli/
├── helpers/
│   ├── run-cli.ts          # spawnSync direto em `node --experimental-strip-types`
│   ├── temp-state.ts       # tmpdir() + UUID + cleanup
│   └── extract.ts          # regex UUID v4 + label-anchored
└── contracts.cli.test.ts   # 16 testes / 8 suites
```

### Decisões finais (vs. ticket original)

| # | Decisão | Implementação |
| :-- | :--- | :--- |
| D1 | `spawnSync` síncrono | ✅ Mantido — testes inline sem promise hell. |
| D2 | tmpdir + UUID por teste | ✅ Mantido via `newStateFile()` + cleanup em `after()`. |
| D3 | `{ stdout, stderr, exitCode }` | ✅ Mantido. |
| D4 | Disparar via `pnpm` | ❌ **Revisado**: dispara `node` direto com `--experimental-strip-types`. Mais rápido, sem ruído de task runner. |
| D5 | Extrair IDs por regex | ✅ Mantido com helper `extractUuidAfter(text, label)` ancorado em label do formatter. |
| D6 | Timeout 30s | ✅ Mantido. |
| D7 | Não substitui unit/integration | ✅ Confirmado — 227 prévios continuam. |

### Notas técnicas

- **Sintaxe da CLI**: `<subcomando>` SEMPRE primeiro; flags (incluindo `--state`) depois. O `main.ts` faz `[subcommand, ...subArgv] = rawArgv` antes de extrair `--state`.
- **Help vai para stderr** (`printUsage` usa `process.stderr.write`), então o teste de `--help` faz `assert.match(r.stderr, ...)`.
- **Mensagens PT-BR exatas** validadas contra `formatters/error.ts` (ex.: "Já existe um contrato com este número sequencial.", "Valor de impacto não pode ser zero.").
- **Defeito #12 coberto end-to-end**: state file corrompido dispara exit 74 (EX_IOERR) com mensagem ❌.

### Performance

- 16 testes em ~4s (cada teste = 1 fork de `node --experimental-strip-types`, ~150–700ms).
- Suite total: 3,5s — sem regressão.

## Tickets relacionados sugeridos

- `CTR-CLI-OBSERVABILITY` — flag `--verbose-events` (não bloqueia este ticket).
- `CTR-HTTP-ADAPTER` — cenários BDD 3 e 4 dependem.
