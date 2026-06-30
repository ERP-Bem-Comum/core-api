# W3 — Gate de qualidade · FIN-DOC-PAYMENT-DETAIL

**Outcome**: GREEN ✅ (gates canônicos) · **Agente**: ts-quality-checker

## Gates canônicos (AGENTS.md §"W3") — todos verdes

| Gate | Comando | Resultado |
|---|---|---|
| Typecheck | `pnpm run typecheck` | ✅ exit 0 (sem erros) |
| Format | `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| Lint | `pnpm run lint` | ✅ exit 0 (`eslint .` limpo) |
| Test | `pnpm test` | ✅ 3241 tests · **3223 pass · 0 fail** · 18 skipped |

Contagem ≥ baseline (3213 + 10 novos GREEN). Zero regressão.

## Correções aplicadas no W3 (gate pegou o que o W1 não rodou)

O W1 não rodou `lint`; o W3 (gate) pegou **4 erros** — política de regressão zero, todos endereçados:

1. **`schemas.ts:89`** (`no-control-regex`, do diff): a regex `/^[^\x00-\x1F\x7F]*$/` rejeita control chars **intencionalmente** (requisito de segurança M1). Correção: `// eslint-disable-next-line no-control-regex` com justificativa. Não enfraquece a validação.
2. **`document-payment-detail.routes.test.ts:132,158`** (`@typescript-eslint/array-type`, do diff): `ReadonlyArray<T>` → `readonly T[]`.
3. **`tools/bugs-scripts/a.js`** (gate mal-configurado, NÃO do diff): scripts de diagnóstico descartáveis (já gitignored) que o ESLint flat config varria. Correção de gate: adicionado `'tools/bugs-scripts/**'` ao `ignores` do `eslint.config.js` (mesmo padrão de `tests/reports/**`). Prova de verde: `pnpm run lint` → exit 0 após a correção.

Re-rodados após as correções: lint/typecheck/test todos verdes (acima).

## Pendência registrada (não dispensada): integração Docker

`pnpm run test:integration:financial` (round-trip Drizzle-MySQL real — parte de CA1/CA4 + back-compat de linha legada) **NÃO foi executado**: `docker info` → indisponível na máquina local. O teste está corretamente gated por `MYSQL_INTEGRATION` (sem falso negativo no `pnpm test` puro).

- CA1/CA2/CA3/CA5 (comportamento de borda) já provados pelos testes `fastify.inject` (InMemory) — verdes.
- A camada que falta exercitar com MySQL real (mapper↔coluna, linha legada nullable) roda no **CI** (que tem Docker) ao abrir o PR, ou localmente quando o Docker subir. **Escalado ao humano** (Gabriel): rodar `pnpm run test:integration:financial` com Docker antes do merge.

## Conclusão

W3 GREEN nos 4 gates canônicos. Única pendência: execução da suíte de integração Docker (ambiental), registrada explicitamente — não há vermelho não-endereçado.
