# W0 — RED (Fail-First)

## Skill aplicada

`database-engineer` (W0 — regression guards estruturais).

---

## Arquivos criados

- `tests/modules/contracts/adapters/persistence/contract-repository.shape.test.ts` (110 linhas).

## CAs do W0

| CA | Camada | Estado RED hoje | Justificativa |
| :-- | :-- | :-- | :-- |
| **CA-13.1** | structural (fs.read) | PASSA hoje (1 SELECT) e deve continuar passando após W1 | "≤ 1 SELECT na junction dentro do `list`" — invariante estrutural; documenta a meta. |
| **CA-13.2** | structural (fs.read) | **RED** — padrão N+1 detectado | regex casa `for (const X of rows) { ... .from(schema.contractHomologatedAmendments) ... }`. Audit §H1. |
| **CA-14**   | structural (fs.read) | **RED** — junction populada linha-a-linha | regex casa `for (...) { ... .insert(schema.contractHomologatedAmendments).values({ ... }) }`. Audit §M4. |

## Verificação do RED

```
$ pnpm test --test-name-pattern="CTR-DB-REPO-LIST-N1"
ℹ tests 454 | pass 439 | fail 2 | skipped 13
✖ failing tests:
  CA-13.2: list() não contém SELECT da junction dentro de loop
  CA-14:   persistContract junction insert NÃO está dentro de for-loop linha-a-linha
EXIT=1
```

**Sinal de RED válido:** ambos os fails refletem o padrão proibido **presente no source** — não é falha de impl, é falha de design (intencional pré-refactor).

---

## Por que regression guards estruturais (justificativa do estilo)

| Alternativa | Pró | Contra | Veredito |
| :-- | :-- | :-- | :-- |
| Suite contratual valida funcional | Garantia de correção | N+1 é antipadrão de **performance**, não de correção — passa funcional silenciosamente | Mantemos; é a rede de segurança funcional. |
| Instrumentar mysql2 query count em integration test | Mede exatamente o objetivo (1 vs N queries) | Acopla a Docker; usa hook não-público do mysql2; lento | Fora do escopo S. |
| Lighthouse-style benchmark | Sinal direto de regressão de perf | Não-determinístico; lento | Não. |
| **Meta-teste estrutural via fs.read + regex** (escolhido) | Determinístico; rápido; roda em CI sem container; precedente no repo (`tests/cleanup/sqlite-removal.test.ts`) | Acopla teste ao layout do source — falsos positivos em renames | Aceitável para regression-guard explícito. |

---

## Cobertura comportamental preservada

A suíte contratual `runContractRepositoryContract` em `tests/modules/contracts/adapters/persistence/contract-repository.suite.ts`:

- **`list em repo vazio retorna ok([])`** (linha 68).
- **`list retorna todos os contratos persistidos`** (linha 180) — insere 3 contratos via `save` (que exercita `persistContract` + junction) e valida shape do retorno.
- **`save com mesmo ID é idempotente`** (linha 207) — exercita upsert + junction reset.
- **`valor de 1 cent ...`** (linha 224) — round-trip end-to-end.

Esses 4 testes cobrem o **comportamento funcional** de `list` e de `persistContract` (junction). Após W1 eles continuam passando ⇒ rede de segurança.

---

## Critério de saída do RED

- [x] Arquivo de teste criado.
- [x] `pnpm test` mostra 2 fails específicos (CA-13.2, CA-14).
- [x] Falhas refletem o padrão proibido presente no source (não bug de impl).
- [x] Falhas referem-se a §H1 e §M4 do audit explicitamente.

**Pronto para W1.**
