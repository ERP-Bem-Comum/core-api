# Code Review — PAR-CONTRACT-COUNT-BACKFILL (#110) — Round 1

**Veredito:** APPROVED
**Reviewer:** code-reviewer
**Escopo revisado:**
- `src/jobs/partners/contract-count-backfill/{backfill,run}.ts`
- `src/modules/contracts/application/ports/contract-count-read.ts`
- `src/modules/contracts/adapters/persistence/repos/contract-count-read.{drizzle,in-memory}.ts`
- `src/modules/contracts/public-api/{read,index}.ts`
- `src/modules/partners/application/ports/contract-count-store.ts` + `adapters/.../contract-count-store.{drizzle,in-memory}.ts`
- `tests/jobs/partners/contract-count-backfill.test.ts`

---

## Issues encontradas

### 🔴 Crítica
Nenhuma.

### 🟡 Importante

#### I1 — `contract-count-read.drizzle.ts` sem cobertura da query real (só in-memory trivial)
**Problema:** a regra que garante CA1 (`WHERE status IN ('Pending','Active') GROUP BY contractorId`) só existe no adapter Drizzle; o in-memory devolve `seed` sem exercer o SQL. Se a lista de status ou o GROUP BY divergir do worker, nada unitário pega.
**Ação:** **não bloqueia** (decisão de pirâmide registrada no W0: query → integration). **W3 deve rodar `test:integration`** com um caso que insira contratos em status vivos + terminais e afira a contagem por contraparte. Registrado como gate obrigatório do W3.

### 🔵 Sugestão

#### S1 — `count()` → `number` (robustez mysql2)
`activeCount: count()` confia no mapeamento do drizzle. Para contagens de contratos é seguro (cabe em number). Sem ação; só nota.

---

## Verificação dos pontos de risco do escopo

- **Isolamento cross-módulo (ADR-0006)** ✔ — contracts exposto só via `public-api` (`buildContractsContractCountReadPort`); write no partners via adapter no **composition root** (`run.ts`), mesmo padrão do worker `contract-count-projection`. Nenhum módulo importa o outro.
- **Idempotência / CA2** ✔ — `setCount` usa `onDuplicateKeyUpdate({ set: { activeCount } })` com valor **absoluto** (não `sql\`… + …\``), não registra `eventId`. Re-execução converge. O teste unit prova (rodar 2× → 2, não 4).
- **Semântica / CA1** ✔ — `activeCount = #{status ∈ (Pending,Active)}` espelha `applyContractCountEvent` (Created +1 p/ Pending e Active; Ended/Cancelled −1). `contractorId` é `notNull` (schema:83) → **sem linha órfã NULL** no GROUP BY.
- **Result na borda** ✔ — read e store convertem `try/catch → err(...)`; nunca vazam `Error`. Ports são `type Readonly<{...}>`.
- **ESM/TS** ✔ — imports com `.ts`, `import type`, sem class/any/throw indevido. typecheck/lint/format já verdes (W1).

## O que está bom

- Semântica de "contrato vivo" **documentada nos 3 arquivos** com aviso explícito de não divergir do worker — excelente defesa contra regressão futura de CA1.
- `setCount` como método novo do port (não reuso torto de `applyDelta`) — decisão limpa que também resolve drift (#129).
- `run.ts` segue fielmente o molde do composition root (fechamento de handles em `finally`, exit sysexits).

## Próximo passo

APPROVED → W3. **Condição herdada:** o gate W3 DEVE incluir `test:integration` cobrindo a query GROUP BY (I1).
