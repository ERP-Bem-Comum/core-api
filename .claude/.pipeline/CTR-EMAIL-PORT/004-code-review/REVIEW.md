# Code Review — CTR-EMAIL-PORT — Round 1

**Veredito:** ✅ **APPROVED**

**Reviewer:** code-reviewer (W2, read-only)
**Data:** 2026-05-21
**Escopo revisado:** 9 arquivos (6 source + 3 tests).

---

## Nota de escopo

**Primeiro ticket de domínio da sessão** (anteriores eram tooling em `scripts/`). Agora aplicam TODAS as categorias do checklist:

- **A** — regras absolutas do domínio ✅
- **B** — smart constructors + branded types ✅
- **C** — discriminated unions (EmailError) ✅
- **D** — ports & adapters ✅
- **E** — modular monolith (public-api) ✅ (com 1 observação)
- **F** — ESM / NodeNext / TS moderno ✅
- **G** — naming ✅
- **H** — tests ✅

Conformidade com **ADR-0006** (modular monolith, public-api como único ponto de import externo) e **ADR-0010** (Email Port/Adapter Pattern) verificada.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não bloqueia, mas registrar)

#### Issue I1 — `src/modules/notifications/adapters/email/in-memory.ts:31` — `getSent()` retorna referência mutável

**Categoria:** D (adapters) + A (imutabilidade)
**Problema:** O método `getSent()` retorna `sent` direto (referência ao array mutável da closure). Embora o tipo `readonly EmailMessage[]` proíba mutação em TypeScript, em runtime nada impede:

```ts
const sender = createInMemoryEmailSender();
await sender.send(msg);
(sender.getSent() as EmailMessage[]).push(/* mensagem fake */); // TS recusa, runtime aceita
```

Em testes isso pode causar bug silencioso: um teste inadvertido muta a lista e o próximo teste falha de forma confusa.

**Fix sugerido:**

```diff
-    getSent: () => sent,
+    getSent: () => [...sent], // copy defensivo
```

ou

```diff
+    getSent: () => Object.freeze([...sent]) as readonly EmailMessage[],
```

A primeira opção é mais simples e suficiente. Custo O(n) por chamada é trivial em testes.

#### Issue I2 — `src/modules/notifications/public-api/index.ts:22-23` — public-api expõe adapter de teste

**Categoria:** E (modular monolith)
**Problema:** O barrel re-exporta `InMemoryEmailSender` e `createInMemoryEmailSender`. Outros módulos importando do `public-api/` podem **acidentalmente** usar o adapter de teste em código de produção.

Comparação com Contracts: `src/modules/contracts/public-api/index.ts` **não** expõe adapters (InMemory ou Drizzle) — só types e decoders. Adapters são usados internamente em tests + CLI driver.

**Trade-off atual:** o módulo `notifications` **ainda não tem adapter de produção** (Nodemailer fica para `CTR-EMAIL-ADAPTER-NODEMAILER` #2). Sem o InMemory no public-api, outros módulos não conseguem testar integração consumindo o port.

**Fix sugerido (quando #2 entrar):**

```diff
-export type { InMemoryEmailSender } from '../adapters/email/in-memory.ts';
-export { createInMemoryEmailSender } from '../adapters/email/in-memory.ts';
+// adapters removidos do public-api; consumers usam injection no composition root.
+// InMemory permanece importável diretamente de `notifications/adapters/email/in-memory.ts`
+// APENAS para tests do próprio módulo notifications.
```

Aceitar como **temporary** neste ticket; registrar para limpeza no ticket #2.

#### Issue I3 — `src/modules/notifications/domain/email/types.ts:13-14` — `EmailReceipt.messageId` não é branded

**Categoria:** B (branded types)
**Problema:** `messageId: string` e `acceptedAt: string` são strings cruas, não brandadas:

```ts
export type EmailReceipt = Readonly<{
  messageId: string;     // poderia ser Brand<string, 'EmailMessageId'>
  acceptedAt: string;    // poderia ser Brand<string, 'IsoTimestamp'>
}>;
```

Inconsistente com Contracts (`ContractId`, `AmendmentId` são branded).

**Justificativa para manter:** `messageId` é valor **opaco** retornado pelo adapter (Nodemailer envelope, ou UUID local) — não é validado pelo domínio nem deve ser comparado com regras (igualdade, ordering). `acceptedAt` é timestamp serializado para `EmailReceipt` mas não é interpretado pelo domínio.

**Decisão sugerida:** aceitar `string` aqui (consistente com `OutboxRow.payload` que também é JSON string opaco). Documentar a escolha no docblock do `EmailReceipt`.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão S1 — `address.ts:9` — regex de email simplificada

`/^[^\s@]+@[^\s@]+\.[^\s@]+$/` rejeita endereços RFC 5322 válidos esotéricos (quoted local parts, IPs em domínio: `user@[127.0.0.1]`). Documentado no `000-request.md` como trade-off conhecido. Aceitar.

#### Sugestão S2 — `subject.ts:14` — subject só com whitespace passa

`raw.length === 0` falha em `''`, mas `'   '` (3 espaços) é aceito. Caso de uso real: bug em template renderer pode injetar string em branco no subject; spam filters podem rejeitar. Considerar `raw.trim().length === 0` para detectar.

#### Sugestão S3 — `in-memory.ts:22` — `await Promise.resolve()` é workaround do `require-await`

Documentado no REPORT W1. Alternativa: `// eslint-disable-next-line @typescript-eslint/require-await`. Manter como está — `await Promise.resolve()` é idiomático e zero-cost na microtask queue.

#### Sugestão S4 — `address.ts:6` + `subject.ts:14` — `MAX_LENGTH` é total, não composicional

`address.ts` checa `raw.length > 320` mas RFC 5321 separa local (64) + domain (255). String `'a'.repeat(70) + '@' + 'b'.repeat(10) + '.com'` (84 chars total) passa, embora local-part > 64. Edge case raro; mas se for problema futuro, separar `parseLocalPart` + `parseDomain`. **Não bloqueia.**

#### Sugestão S5 — Tests usam helper local `makeMessage` (in-memory.test.ts:24)

Helper local apropriado para o teste. Se outros tests de adapter (Nodemailer no ticket #2) precisarem fixture similar, considerar mover para `tests/modules/notifications/fixtures.ts`. YAGNI agora.

---

## Validação de conformidade com ADRs

### ADR-0006 — Modular Monolith ✅

- `domain/` só importa de `shared/` (Result, Brand) — ✅
- `application/ports/` só importa do próprio módulo (`domain/email/types.ts`) — ✅
- `adapters/` só importa do próprio módulo + `shared/` — ✅
- `public-api/` é o único barrel exposto — ✅ (com observação I2 sobre adapter de teste)
- Nenhum import de `src/modules/contracts/` no módulo notifications — ✅

### ADR-0010 — Email Port/Adapter Pattern ✅

- Port `EmailSender` definido como `type Readonly<{}>` — ✅ (ADR diz "interface" no texto, mas o projeto usa `type`)
- Adapter `createInMemoryEmailSender` para tests — ✅
- `EmailError` como union tagged — ✅ (ADR diz "string literal union" simples; aqui usamos `{ tag, reason }` tagged objects, mais rico)
- Adapter retorna `Result<EmailReceipt, EmailError>` — ✅
- `EmailSender.send` é único método do port — ✅
- "Sem retry, sem template, sem batch" no port — ✅
- Renderização de templates fica para application — ✅ (não implementado, conforme não-objetivo)

**Adaptação ao projeto real (não-monorepo):** ADR-0010 sugeriu `packages/shared-kernel/src/email/`; foi adaptado para `src/modules/notifications/` (módulo dedicado). Justificado no `000-request.md` e confirmado pelo usuário.

---

## O que está bom

- ✅ **Padrão `module-as-namespace`** aplicado consistentemente — `import * as EmailAddress` funciona internamente; public-api renomeia para `parseEmailAddress` para evitar conflito type/namespace.
- ✅ **Branded types corretos** — `EmailAddress = Brand<string, 'EmailAddress'>` com smart constructor que retorna `Result` antes do cast `as EmailAddress`.
- ✅ **Tagged errors em `EmailError`** com 3 variantes (`invalid-recipient`, `smtp-rejected`, `transport-failed`) + campo `reason: string` para detalhes adapter-specific. Permite UI mostrar "rejeitado pelo SMTP" e logs trazer o motivo cru.
- ✅ **`randomUUID()` + `toISOString()`** em vez de fake string — CA-T7 valida via regex UUID-v4 + ISO-8601.
- ✅ **`EmailMessage` com `readonly` arrays** (`to`, `cc`, `bcc`) — imutabilidade compositional.
- ✅ **`EmailReceipt` simples** — só `messageId` + `acceptedAt`. Sem `status` (success/failure já está no `Result`), sem `from`/`to` (já está no input).
- ✅ **Closures encapsulam estado mutável** — `sent` array é privado, acessível só via `getSent()/clear()`. Pattern fact-test-double.
- ✅ **ASCII puro preventivo** em todos os 6 arquivos source novos.
- ✅ **AAA explícito** em todos os 10 tests.
- ✅ **Tests usam `#src/*` subpath imports** — consistente com convenção do projeto.
- ✅ **Type narrowing correto** em tests (`if (r.ok)`).
- ✅ **CA-T10 smoke type-level** — `const port: EmailSender = createInMemoryEmailSender()` valida compile-time que `InMemoryEmailSender` extends `EmailSender`.
- ✅ **Estrutura modular completa** desde o ticket #1 — `domain/ + application/ + adapters/ + public-api/` todos populados; pronto para receber Nodemailer no #2.

---

## Métricas do round 1

| Item | Valor |
| :--- | ---: |
| Arquivos revisados | 9 |
| Linhas auditadas | ~290 (source) + ~230 (tests) |
| Issues 🔴 críticas | 0 |
| Issues 🟡 importantes | 3 |
| Sugestões 🔵 estilo | 5 |
| Veredito | APPROVED |
| Round | 1 / 3 |

---

## Próximo passo

✅ **APPROVED.** Pipeline-maestro avança para **W3 — QUALITY**.

**Issues `CTR-PIPELINE-HARDENING` não cresce** (escopo limitado a tooling de pipeline). As 3 🟡 deste ticket viram **`CTR-EMAIL-HARDENING`** ou agregam ao ticket #2 (CTR-EMAIL-ADAPTER-NODEMAILER):

- **I1** (getSent retorna ref mutável) — fix oportunístico no #2 quando o NodemailerEmailSender precisar de helper de teste similar.
- **I2** (adapter no public-api) — limpeza obrigatória no #2 quando Nodemailer entrar.
- **I3** (messageId não branded) — decisão registrada, sem ação.

**Pré-condição W3:** rodar `pnpm test --test-concurrency=1` (serial) para evitar flakiness pré-existente. Esperado: 722 → 732 tests (+10 do CTR-EMAIL-PORT).
