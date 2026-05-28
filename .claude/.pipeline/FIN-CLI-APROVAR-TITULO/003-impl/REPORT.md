# W1 — Implementação GREEN (FIN-CLI-APROVAR-TITULO)

> **Wave:** W1 · **Outcome:** GREEN · **Agent:** `main-session`
> **Predecessor:** [`../002-tests/REPORT.md`](../002-tests/REPORT.md) (W0 RED — 6 fails por REGISTRY sem `aprovar-titulo`)
> **Artefatos:** 2 arquivos novos + 2 modificados em src/ + 1 test pré-existente ajustado

---

## 1. Mudanças

| Arquivo | Linhas | Conteúdo | Status |
| :--- | ---: | :--- | :--- |
| `src/modules/financial/cli/commands/_flag-errors.ts` | 20 | Helper `formatFlagError(ParseFlagsError)` + comentário "CANDIDATO A EXTRAÇÃO" | NOVO |
| `src/modules/financial/cli/commands/aprovar-titulo.ts` | 96 | `descricao`/`help`/`run` consumindo `approvePayable` use case + interpolação inline para `PayableNotOpen` | NOVO |
| `src/modules/financial/cli/registry.ts` | 22 | +1 import + entry `'aprovar-titulo'` no REGISTRY | MODIFICADO (+3L) |
| `src/modules/financial/cli/formatters/error.ts` | 64 | +6 entradas (3 use case errors + 3 tagged PayableError) | MODIFICADO (+10L) |
| `tests/modules/financial/cli/main.test.ts` | 132 | CA-3, CA-NEW-1 e CA-NEW-2 atualizados para refletir REGISTRY com `aprovar-titulo` | MODIFICADO (~30L tocadas) |
| **Total** | **~334** | (~116 novos + ~218 tocados) | |

### 1.1. `_flag-errors.ts` — helper compartilhado entre subcomandos

Helper de 1 função (`formatFlagError(ParseFlagsError): string`) que traduz `cli-flag-duplicated`/`cli-flag-unknown` para `❌ <mensagem> (--<flag>)\n` via `formatErrorCode`. Pattern espelha `src/modules/contracts/cli/commands/_flag-errors.ts` literalmente. Comentário marca como **CANDIDATO A EXTRAÇÃO** quando 3º módulo precisar (Risco 1 mitigado).

### 1.2. `aprovar-titulo.ts` — comando

Estrutura padrão: `export const descricao`/`help`/`run`. Sequência canônica:

```ts
parseFlags(argv) → validateAllowedFlags → REQUIRED check
  → approvePayable({ payableRepo, clock })({ payableId, approvedByRaw })
  → if !ok: tratamento inline PayableNotOpen + fallback formatErrorCode + exit 1
  → ctx.persist() → if !ok: formatErrorCode + exit 74
  → stdout "✅ Título aprovado." + bloco com ID/status/aprovado em/por + exit 0
```

**CA-8b — interpolação inline para `PayableNotOpen`:**

```ts
if (typeof e === 'object' && 'tag' in e && e.tag === 'PayableNotOpen') {
  const status = (e as { currentStatus: string }).currentStatus;
  process.stderr.write(`❌ Título não está em estado Aberto (status atual: ${status}).\n`);
} else {
  process.stderr.write(`❌ ${formatErrorCode(e)}\n`);
}
```

5 linhas. Formatter permanece "lookup-only". Risco 3 mitigado.

### 1.3. `registry.ts` — populado

```ts
import * as aprovarTitulo from './commands/aprovar-titulo.ts';

export const REGISTRY: Readonly<Record<string, SubCommand>> = {
  'aprovar-titulo': aprovarTitulo,
};
```

Sigle entry. Quando comandos novos chegarem (`transmitir-titulo`, etc.), adicionar imports + entries.

### 1.4. `formatters/error.ts` — +6 entradas

```ts
// ─── Use case errors (FIN-CLI-APROVAR-TITULO) ─────────────────────────────
'approve-payable-invalid-id': 'ID do título inválido (formato UUID v4 esperado).',
'approve-payable-not-found': 'Título não encontrado.',
'user-ref-invalid': 'ID de usuário inválido (formato UUID v4 esperado).',

// ─── Payable domain errors (tagged, lookup-only) ──────────────────────────
PayableNotOpen: 'Título não está em estado Aberto.',  // interpolação inline no comando
PayableInvalidApprovalDate: 'Data de aprovação inválida.',
PayableApprovalDateBeforeOpenedAt: 'Data de aprovação anterior à data de abertura do título.',
```

Mensagem genérica para `PayableNotOpen` no dicionário; interpolação dinâmica fica no `run` do comando (CA-8b).

### 1.5. Testes pré-existentes ajustados (`main.test.ts`)

**Evolução esperada do estado** — REGISTRY antes era vazio (FIN-CLI-SCAFFOLD), agora tem `aprovar-titulo`. 3 testes precisam refletir nova semântica:

- **CA-3 (`--help`):** trocou regex `/nenhum ainda/i` por `/Subcomandos disponíveis/i` + `/aprovar-titulo/` — valida que o help lista pelo menos 1 subcomando real.
- **CA-NEW-1 (`--driver mysql`):** antes esperava "Subcomando desconhecido" (REGISTRY vazio); agora exercita o caminho real `cli-driver-not-supported-yet` — valida que o pipeline chega ao `buildContext` e a mensagem cita `FIN-ADAPTER-DRIZZLE-PAYABLE`. **Resolve a pendência conceitual do FIN-CLI-SCAFFOLD CA-NEW-1** (que era um "stub" aguardando comando real).
- **CA-NEW-2 (subcomando inexistente):** trocou `aprovar-titulo` por `fake-cmd-xyz` (subcomando garantidamente inexistente) para preservar o teste do fallback "Subcomando desconhecido" sem conflitar com o REGISTRY populado.

Cada mudança tem comentário inline explicando o "Atualizado por FIN-CLI-APROVAR-TITULO".

### 1.6. Zero `class`, zero `throw`, zero `as any`

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" \
    src/modules/financial/cli/commands/{aprovar-titulo,_flag-errors}.ts
(nenhum)
```

Único `as` em `aprovar-titulo.ts:74`: `(e as { currentStatus: string }).currentStatus` — narrow controlado após o type guard `'tag' in e && e.tag === 'PayableNotOpen'`. Não é cast para Brand, não é `as unknown as`. Pattern aceito.

---

## 2. Verificação

### 2.1. Typecheck

```
$ pnpm run typecheck
> tsc --noEmit
(exit 0, zero output)
```

Zero erros TS.

### 2.2. Suite global — delta vs baseline

```
$ pnpm test
ℹ tests 1117  pass 1101  fail 0  skipped 16  duration_ms 38092
```

| Métrica | Baseline (W3 FIN-CLI-SCAFFOLD) | W0 RED | W1 GREEN | Delta W1 vs Baseline |
| :--- | ---: | ---: | ---: | ---: |
| tests | 1111 | 1117 | **1117** | **+6** |
| pass | 1095 | 1095 | **1101** | **+6** |
| fail | 0 | 6 | **0** | 0 |
| skipped | 16 | 16 | 16 | 0 |
| suites | 361 | 367 | 367 | +6 |

**Delta +6/+6/0** — exatamente o esperado no REPORT W0 §6. Composição:
- 6 it's novos do `aprovar-titulo.test.ts` (CA-15..20) → todos GREEN
- 3 it's pré-existentes ajustados (CA-3, CA-NEW-1, CA-NEW-2) → continuam passando com asserts atualizados
- 1 fix de teste detectado durante W1 → semântica evoluiu naturalmente

### 2.3. Testes específicos do ticket

```
$ node --test --experimental-strip-types --no-warnings \
    'tests/modules/financial/cli/commands/aprovar-titulo.test.ts'
✔ aprovar-titulo — happy path (CA-15)
  ✔ Open → Approved + state file atualizado
✔ aprovar-titulo — help (CA-16)
  ✔ --help imprime ajuda em stdout exit 0
✔ aprovar-titulo — flag obrigatória ausente (CA-17)
  ✔ sem --payable-id → exit 64 stderr "Flag obrigatória ausente: --payable-id"
✔ aprovar-titulo — invalid id (CA-18)
  ✔ --payable-id não-UUID → exit 1 "ID do título inválido"
✔ aprovar-titulo — not found (CA-19)
  ✔ --payable-id válido mas não persistido → exit 1 "Título não encontrado"
✔ aprovar-titulo — status != Open com interpolação inline (CA-20)
  ✔ payable Approved → exit 1 com "(status atual: Approved)" interpolado
ℹ tests 6  pass 6  fail 0
```

6/6 GREEN — inclusive **CA-20 valida a string literal exata** `"Título não está em estado Aberto (status atual: Approved)."`, confirmando interpolação inline (CA-8b) funcional.

---

## 3. CAs (000-request §3)

| # | Critério | Status |
| :--- | :--- | :--- |
| CA-1..3 (`descricao`/`help`/`run`) | ✅ §1.2 |
| CA-4 (REQUIRED + ALLOWED) | ✅ aprovar-titulo.ts:33-34 |
| CA-5 (flag obrigatória ausente) | ✅ §1.2 + CA-17 runtime |
| CA-6 (parseFlags/validateAllowedFlags fail) | ✅ aprovar-titulo.ts:53-62 |
| CA-7 (use case ok → persist + stdout) | ✅ §1.2 + CA-15 runtime |
| CA-8 (use case err → exit 1; persist err → exit 74) | ✅ §1.2 (comportamento idempotente documentado) |
| CA-8b (interpolação inline `PayableNotOpen`) | ✅ §1.2 + CA-20 runtime valida string literal |
| CA-9 (`_flag-errors.ts` com comentário CANDIDATO A EXTRAÇÃO) | ✅ §1.1 |
| CA-10 (REGISTRY com aprovar-titulo) | ✅ §1.3 |
| CA-11 (--help global lista comando) | ✅ §1.5 (CA-3 ajustado valida `/aprovar-titulo/`) |
| CA-12 (6 entradas no formatter) | ✅ §1.4 |
| CA-13 (formatter lookup-only) | ✅ formatter intacto na mecânica; interpolação fica no comando |
| CA-14 (`_flag-errors.ts` reusado ou criado) | ✅ criado local — pattern do contracts |
| CA-15..20 (6 testes E2E) | ✅ §2.3 (todos GREEN) |
| CA-21..24 (typecheck/format/lint/test) | ⏳ W3 (typecheck e test ✅ §2.1/2.2; format/lint W3) |

**21 de 25 CAs validadas em W1.** 4 operacionais para W3.

---

## 4. Decisões W1

- **Atualização dos 3 testes do FIN-CLI-WIRE/FIN-CLI-SCAFFOLD** — REGISTRY antes vazio agora tem `aprovar-titulo`; semântica evoluiu naturalmente. CA-NEW-1 do FIN-CLI-SCAFFOLD finalmente exercita `cli-driver-not-supported-yet` (era pendência conceitual conhecida). CA-NEW-2 usa subcomando garantidamente inexistente (`fake-cmd-xyz`) para preservar teste do fallback. CA-3 valida `/aprovar-titulo/` em vez de `/nenhum ainda/`.
- **Tratamento inline `PayableNotOpen` (5L)** — formatter permanece lookup-only. Se `transmitir-titulo` ou `processar-saida-bancaria` repetirem o pattern (`PayableNotApproved`, `PayableNotTransmitted` etc.), abre-se `FIN-CLI-FORMATTER-INTERPOLATION` para extrair mecanismo genérico.
- **Validação completa de `parseFlags`/`validateAllowedFlags`** — ambos consumidos pelo `run` do comando, **fechando definitivamente a sugestão 🔵 #4 do FIN-CLI-SCAFFOLD W2**. Não são dead code.
- **`flags['payable-id'] ?? ''`** após REQUIRED check — TS strict não infere que REQUIRED check garante o key (lookup dinâmico). Pattern do contracts (`criar-contrato.ts:72-76`) replicado.
- **Output formatado inline** (sem `formatters/payable.ts` neste ticket) — 4 linhas `process.stdout.write(...)` direto. Quando comandos mais ricos chegarem (`mostrar-titulo`/`listar-titulos`), aí sim cria formatter dedicado.

---

## 5. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access em arrays | ✅ |
| Sem shadowing de built-ins | ✅ |
| `try/catch` só em borda I/O (zero neste comando — use case retorna Result) | ✅ |
| Imports `#src/*` no test; relativos `..` em src interno (pattern do contracts) | ✅ |
| `import type` separado de runtime | ✅ |
| Cast `as <Brand>` único — N/A (sem branding novo no comando) | ✅ |
| Sem `eslint-disable @typescript-eslint/require-await` órfão em src | ✅ |
| Atomicidade ADR-0015 D2 — use case já encapsula (`repo.save(state, [event])`) | ✅ |
| Comportamento idempotente em persist falha (CA-8) | ✅ documentado no header |
| Fixtures via agregado real (não literal) | ✅ no test W0 |

Expectativa W3: **ALL-GREEN round 1**.

---

## 6. Pronto para W2

`code-reviewer` deve validar:

1. **Tratamento inline `PayableNotOpen`** (CA-8b) — type guard `'tag' in e && e.tag === 'PayableNotOpen'` + cast escopado `(e as { currentStatus: string })`. Pattern aceito? Ou vale criar utilitário `assertTaggedError` no shared?
2. **`_flag-errors.ts` com comentário CANDIDATO A EXTRAÇÃO** — confirma decisão YAGNI.
3. **Ajuste dos 3 testes pré-existentes** — CA-3, CA-NEW-1, CA-NEW-2 atualizados com comentários "Atualizado por FIN-CLI-APROVAR-TITULO". Reviewer entende a evolução natural.
4. **Use case consumido sem revalidar** — comando passa strings cruas para `approvePayable`; use case faz rehydrate. Pattern alinhado com `criar-contrato` do contracts.
5. **Exit codes coerentes** — 64 para flag/registry inválido, 1 para erro de domínio, 74 para state I/O.
6. **`parseFlags`/`validateAllowedFlags` consumidos** — fecha sugestão 🔵 #4 do FIN-CLI-SCAFFOLD W2.
7. **CA-NEW-1 ajustado de pendência → recurso entregue** — caminho `cli-driver-not-supported-yet` agora é exercitado E2E (regex valida `FIN-ADAPTER-DRIZZLE-PAYABLE` no stderr).
8. **Output do happy path** — 4 linhas inline `process.stdout.write` (ID/Status/Aprovado em/por). Defensível para comando simples; quando mostrar/listar chegarem, refatora para `formatters/payable.ts`.

Envelope **S** — review esperada em 1 round dado pattern bem espelhado de `criar-contrato.ts` + interpolação inline simples.

---

## 7. Marco — primeiro comando real do módulo Financial

A CLI do financial agora tem:

- ✅ Pipeline completo (FIN-CLI-WIRE + FIN-CLI-SCAFFOLD)
- ✅ Driver `memory` operacional com state file Payables
- ✅ Driver `mysql` reservado com erro acionável
- ✅ **Primeiro comando real** (`aprovar-titulo`) consumindo use case real (`approvePayable`)
- ✅ Interpolação inline para tagged errors com payload — pattern reutilizável

P.O. pode validar offline o fluxo Open → Approved:

```bash
$ pnpm run cli:financial -- aprovar-titulo \
    --state ./fin-cli-state.json \
    --payable-id <uuid-do-payable-aberto> \
    --approved-by <uuid-do-aprovador>

✅ Título aprovado.

  ID:           7a89...
  Status:       Approved
  Aprovado em:  2026-05-23T14:50:00.000Z
  Aprovado por: a1b2...
```

**Próximo ticket sugerido:** `FIN-USECASE-TRANSMIT-PAYABLE` (S) — segundo use case real (Approved → Transmitted), consome `Payable.transmit`. Ou `FIN-CLI-MOSTRAR-TITULO` (S) — primeiro comando read-only que vai exigir `formatters/payable.ts` enxuto.
