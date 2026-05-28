# Code Review — CTR-PIPELINE-STATE-JSON — Round 1

**Veredito:** ✅ **APPROVED**

**Reviewer:** code-reviewer (W2, read-only)
**Data:** 2026-05-21
**Escopo revisado:** 8 arquivos (4 em `scripts/pipeline/`, 4 em `tests/pipeline/`).

---

## Nota de escopo

Este ticket é **tooling de pipeline** (em `scripts/pipeline/`) — não toca `src/modules/*/domain/`. Várias regras do checklist (Categorias A, B, D, E — smart constructors PT-BR, branded types, ports/adapters, modular monolith) **não aplicam**. As regras avaliadas:

- **C** — discriminated unions / exhaustiveness ✅
- **F** — ESM / NodeNext / TS moderno ✅
- **G** — naming, clareza ✅
- **H** — tests ✅
- Estilo do projeto — `Result<T, E>`, tagged errors, `import type`, extensões `.ts` ✅

Nenhuma regra invariante do CLAUDE.md foi violada. Nenhum ADR contradito.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não bloqueia, mas registrar)

#### Issue I1 — `scripts/pipeline/state-cli.ts:94-95` — sem validação de formato de ticket (potencial path traversal)

**Categoria:** F (TS moderno / robustez)
**Problema:** `cmdInit` recebe `ticket: string` arbitrário e chama `ticketDirOf(cwd, ticket)` → `join(cwd, '.claude', '.pipeline', ticket)` → `fsp.mkdir(dir, { recursive: true })`. Se alguém invocar `pnpm run pipeline:state init "../../etc/test" --size S`, o `join` resolve para fora do scope `.claude/.pipeline/` e cria diretório arbitrário.

**Risco real:** Baixo. A CLI é de uso local pelo dev/orquestrador, não exposta a HTTP. Hook bloqueia npm. Mas é um buraco que vale tampar antes de evoluir.

**Fix sugerido (futuro):**

```ts
const TICKET_FORMAT = /^[A-Z]+(?:-[A-Z0-9]+)+$/;

const validateTicket = (ticket: string): void => {
  if (!TICKET_FORMAT.test(ticket)) {
    exitFail(1, `ticket inválido: "${ticket}" (esperado /^[A-Z]+(-[A-Z0-9]+)+$/)`);
  }
};
```

Aplicar no início de cada `cmd*`. Aceito para fica fora deste ticket (YAGNI W1) mas vale ticket follow-up `CTR-PIPELINE-HARDENING`.

#### Issue I2 — `tests/pipeline/state-io.test.ts:9-13` — docblock desatualizado

**Categoria:** G (clareza / freshness de doc)
**Problema:** O docblock no topo ainda diz:

> **Constraint para W1:** o impl precisa importar `node:fs/promises` via namespace (`import * as fsp from 'node:fs/promises'`) e chamar `fsp.rename(...)`. Isso permite o `t.mock.method(fsp, 'rename', ...)` deste test substituir a função real.

Mas o test CA-T5b foi reescrito (linhas 115-124) para usar `opts.rename` via DI explícita (decisão documentada no REPORT W1). O docblock contradiz o test atual e vai confundir leitores futuros.

**Fix sugerido:**

```diff
-* **Constraint para W1:** o impl precisa importar `node:fs/promises` via
-* namespace (`import * as fsp from 'node:fs/promises'`) e chamar
-* `fsp.rename(...)`. Isso permite o `t.mock.method(fsp, 'rename', ...)`
-* deste test substituir a função real.
+* **Atomicidade testada via DI explícita** (`opts.rename`): o W0 tentou usar
+* `t.mock.method(fsp, 'rename', ...)`, mas módulos nativos do Node têm
+* propriedades `configurable: false`. A solução adotada em W1 foi
+* `writeState(dir, state, { rename: ... })`. Ver REPORT W1 §"Decisões".
```

#### Issue I3 — `scripts/pipeline/render-state-md.ts:13-24` — `statusLabel` sem exhaustiveness explícito

**Categoria:** C (discriminated unions)
**Problema:** O switch em `statusLabel(status)` cobre os 4 casos de `WaveStatus`, mas não tem `default: { const _: never = status; return _; }`. TypeScript hoje aceita porque `noFallthroughCasesInSwitch` + `noImplicitReturns` cobrem implicitamente; mas se um novo `WaveStatus` for adicionado ao schema (ex.: `'skipped'`), a falha aparece longe — um teste de render começa a retornar `undefined` na string.

**Fix sugerido:**

```diff
 const statusLabel = (status: WaveEntry['status']): string => {
   switch (status) {
     case 'done':
       return 'done';
     case 'in-progress':
       return 'in-progress';
     case 'pending':
       return 'pending';
     case 'failed':
       return 'failed';
+    default: {
+      const _: never = status;
+      return _;
+    }
   }
 };
```

Hardening barato. Vale aplicar antes de fechar o ticket OU deixar para `CTR-PIPELINE-HARDENING`.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão S1 — `scripts/pipeline/state-schema.ts:102` — parser não valida tipos profundos

`parsePipelineState` cobre `tag: 'MissingField'` para campos top-level, mas não checa se `waves` é array de objetos com a forma de `WaveEntry`. O cast final `as unknown as PipelineState` é "MVP" documentado no `000-request.md`. Se um STATE.json corrompido tiver `waves: ['W0', 'W1']` (strings em vez de objetos), o parser aceita silenciosamente e o render quebra mais tarde.

**Decisão sugerida:** Aceitar como dívida. v1 confia na própria CLI como produtor único do JSON. Se evoluir para edição manual ampla, escalar para schema validation real (zod, valibot).

#### Sugestão S2 — `scripts/pipeline/render-state-md.ts:13-24` — `statusLabel` é identidade

Todos os `case` retornam string idêntica ao input. Pode ser substituído por `w.status` direto no template. Mas mantém um seam para tradução futura (PT-BR no STATE.md gerado, ex.: `'concluído'` em vez de `'done'`). Aceitável manter.

#### Sugestão S3 — `tests/pipeline/state-cli.test.ts:27-44` — `execFileAsync` poderia ser helper reusável

O wrap manual sobre `execFile` para virar Promise é repetitivo. Já existe `tests/cli/helpers/run-cli.ts` para a CLI principal do módulo Contracts. Considerar extrair para `tests/pipeline/helpers/exec.ts` ou reusar o helper existente (se aplicável). Não bloqueia.

#### Sugestão S4 — `tests/pipeline/state-io.test.ts` + `state-cli.test.ts` — sem cleanup explícito de `mkdtemp`

Cada teste cria diretório em `os.tmpdir()` e não o limpa. macOS faz auto-cleanup periódico, mas idealmente `after(() => fs.rm(dir, { recursive: true, force: true }))`. Não crítico. Vale considerar se a suite crescer.

#### Sugestão S5 — `scripts/pipeline/state-cli.ts:274/278/297/313` — mix de `exitFail` e `process.exit` direto

O main usa `process.exit(1)` em alguns pontos e `exitFail` em outros. Justificado pelo narrowing do TS (documentado no REPORT W1), mas a inconsistência reaparece a cada leitura. Comentário curto no helper `exitFail` poderia explicar quando usar qual.

---

## O que está bom

Lista o que de fato ficou bem feito:

- ✅ **Tagged errors disciplinados** em `ParseError`, `ReadError`, `WriteError` — todos com campo `tag` discriminante. Padrão consistente com o resto do projeto.
- ✅ **DI explícita** (`WriteStateOptions`) é solução elegante para o problema de `t.mock.method` em módulos nativos. Justificada no REPORT W1 e mantém impl de produção limpa (`opts` opcional, default = fsp real).
- ✅ **Helpers `tryParseJson` / `readRaw`** extraídos para satisfazer `init-declarations`. Resultado: zero `let` mutável, código mais limpo do que `let x; try { x = ... }`.
- ✅ **`function exitFail` (não arrow)** demonstra entendimento das limitações de TS narrowing. Decisão documentada no REPORT W1.
- ✅ **Atomic write rigoroso** (tmpfile + rename + cleanup do tmp em falha). CA-T5b prova o invariante via DI sem hack frágil.
- ✅ **Render determinístico** (CA-T6). Função pura, sem side effects, sem `Date.now()` escondido.
- ✅ **Compat com hook** (CA-T7). Output respeita header `# Estado do Ticket <ID>` + tabela `| W0 ... | W3 |`, validado por assertion.
- ✅ **CLI dogfoodada** — este próprio ticket gerou seu `STATE.json` via `pnpm run pipeline:state render CTR-PIPELINE-STATE-JSON`. Validação end-to-end do design.
- ✅ **`CLAUDE.md` atualizado** com estrutura do ticket (STATE.json canônico, STATE.md gerado) e comandos essenciais (6 subcomandos listados).
- ✅ **AAA explícito** em todos os tests.
- ✅ **Isolation via mkdtemp** em todos os tests de IO/CLI.
- ✅ **Type narrowing correto** (`if (r.ok)` antes de acessar `value`) em todos os testes.
- ✅ **`process.argv` parsing manual e legível** — sem dependência de libs externas (commander/yargs).

---

## Métricas do round 1

| Item | Valor |
| :--- | :--- |
| Arquivos revisados | 8 |
| Linhas auditadas | ~870 |
| Issues 🔴 críticas | 0 |
| Issues 🟡 importantes | 3 |
| Sugestões 🔵 estilo | 5 |
| Veredito | APPROVED |
| Round | 1 / 3 |

---

## Próximo passo

✅ **APPROVED.** Pipeline-maestro avança para **W3 — QUALITY** com `ts-quality-checker`.

**Notas para W3:**

- Gates a rodar: `pnpm run typecheck`, `pnpm run format:check`, `pnpm run lint`, `pnpm test` (full repo, não só `tests/pipeline/`).
- Os 🟡 importantes deste review **não bloqueiam** W3, mas valem virar ticket follow-up `CTR-PIPELINE-HARDENING` (size XS, agrega I1+I2+I3 + S2 opcional).
- A 🔵 sugestão S3 (helper `execFileAsync` reusável) só faz sentido se outro test de CLI similar aparecer em tickets futuros — YAGNI agora.

**Pré-condição para W3:** garantir que `pnpm test` (full repo, não só `tests/pipeline/`) continue verde — o ticket adicionou tests novos mas não tocou código de produção fora de `scripts/pipeline/`, então risco de regressão em outros módulos é baixo.
