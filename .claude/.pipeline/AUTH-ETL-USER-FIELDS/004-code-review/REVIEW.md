# Code Review — Ticket AUTH-ETL-USER-FIELDS (#277) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (W2, read-only)
**Data:** 2026-06-30T00:00Z
**Branch:** `fix/277-etl-auth-user-fields`
**Escopo revisado (working tree, não-commitado):**

- `src/modules/auth/domain/identity/user/user.ts` (`RegisterInput` + `register`)
- `src/modules/auth/application/use-cases/provision-legacy-user.ts` (input + `degradeCpf`/`degradeTelephone` + repasse)
- `scripts/etl/orchestrate.ts` (`migrateUserRow` → repasse ao port)
- `eslint.config.js` (override `tests/**`)
- Conferência (não-aprofundada) dos testes W0: `tests/etl/orchestrate.{fakes,test}.ts`, `tests/modules/auth/application/use-cases/provision-legacy-user.test.ts`

**Contexto cruzado conferido:** `src/modules/auth/domain/identity/{cpf,telephone}.ts` (VOs `parse`), `src/modules/auth/public-api/etl.ts` (re-export do tipo), `scripts/etl/mappers/user.mapper.ts` (`ValidatedLegacyUser`), `src/modules/auth/adapters/persistence/mappers/user.mapper.ts:205-217` (precedente login-500), todos os call-sites de `User.register`.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma. As duas decisões de maior atrito (stderr na application + relaxamento de lint) estão tratadas como 🔵 abaixo por serem ancoradas em precedente aceito e proporcionais ao tamanho M — ver justificativa.

### 🔵 Sugestão (estilo / clareza / débito futuro)

#### M1 — `provision-legacy-user.ts:83-85, 96-98` — `process.stderr.write` na camada application

**Categoria:** D/E (Ports & Adapters / layering). `degradeCpf`/`degradeTelephone` fazem I/O direto via `process.stderr.write` dentro de um use case. `.claude/rules/application.md` diz "Application orquestra; não conhece infra" — `process.*` é um global de runtime.
**Por que NÃO é bloqueante:**
1. Espelha 1:1 o precedente aceito do read-mapper (`adapters/persistence/mappers/user.mapper.ts:215`, incidente login-500) — mesmo canal, mesma política, mesmo formato de mensagem.
2. É observabilidade (warning de higienização), não regra de negócio nem decisão de estado.
3. O CA2 exige o warning com `legacyId` como parte do contrato; o teste assevera via spy no `process.stderr.write`.
4. Introduzir um `Logger`/`Warn` port em `ProvisionLegacyUserDeps` seria a forma DDD-pura, porém é escopo maior que o ticket M e fora do 000-request.
**Recomendação (débito, não-bloqueante):** registrar follow-up para injetar um `Logger` port nos use cases do auth (alinharia application-purity E permitiria o teste asseverar via fake em vez de spy de `process.stderr`). Sugiro `issue-report`.

#### M2 — `eslint.config.js:327-330` — `unbound-method: 'off'` poderia ser `eslint-disable` inline

**Categoria:** F (gate). O relaxamento está **escopado ao override `files: ['tests/**/*.ts']`** (linha 307) — NÃO afeta `src/`/produção. O gatilho é o idioma spy+restore `const restore = process.stderr.write; ...; process.stderr.write = restore;` (falso-positivo de `this`-binding: o método nunca é chamado destacado, só reatribuído ao mesmo objeto).
**Avaliação crítica (item 4 do checklist):** é falso-positivo legítimo e proporcional. Um `// eslint-disable-next-line @typescript-eslint/unbound-method` nas 2 linhas do teste seria marginalmente mais cirúrgico, mas (a) tocaria o teste W0 (a política saída-2 da regressão-zero corretamente preferiu corrigir o gate sem tocar o teste) e (b) o bloco `tests/**` já desliga 8 regras pelo mesmo motivo (idioma de teste), então o relaxamento em bloco é consistente com o estilo do arquivo. Não mascara nada em produção. **Aceito.**

#### M3 (nit) — `orchestrate.ts:269` — `String(collaboratorRef)` é redundante

`collaboratorRef` é `CollaboratorId`, um branded string (`Brand<string,'CollaboratorId'>`), já estruturalmente atribuível a `string`. O `String(...)` é inofensivo e o comentário documenta a intenção (brand→string), mas poderia ser apenas `collaboratorRef`. Sem impacto. Manter como está é aceitável.

---

## Conformidade (6 itens do checklist W2)

**1. Domínio / `exactOptionalPropertyTypes` — OK.**
`RegisterInput` (`user.ts:57-61`) declara `name?/cpf?/telephone?/photo?/collaboratorRef?` como `?: T | null` SEM `| undefined` — sob `exactOptionalPropertyTypes` nenhum caller consegue passar `undefined` explícito; só ausência. `register` (`user.ts:93-97`) normaliza cada campo com `input.X ?? null`, então o agregado `ActiveUser` sempre recebe `T | null`, **nunca `undefined`** (sem vazamento). `collaboratorRef → collaboratorId` coerente (`user.ts:97`). Retrocompat CA4 preservada: todos os call-sites de `User.register` (`composition.ts:377` OIDC/self-register, `register-user.ts:58`, e testes) passam só o núcleo → os 5 campos caem em `null`. Confirmado por busca exaustiva de call-sites.

**2. Degradação (Evans reconstituição) — OK.**
`degradeCpf`/`degradeTelephone` (`provision-legacy-user.ts:79-100`) ficam **dentro do use case** (ADR-0006: VOs do auth re-parseados no auth, não no script ETL). Em falha de `Cpf.parse`/`Telephone.parse` **degradam para `null` + `process.stderr.write` citando `legacyId`** — NÃO quarentenam, NÃO derrubam o registro (`outcome:'created'`). Bate com 000-request (decisão #2) e com o incidente login-500 (`adapters/.../user.mapper.ts:215`, mesmo canal/formato). **CPF: não há caminho de quarentena/erro** — `degradeCpf` só retorna `null` ou o VO; o `cpf` inválido nunca propaga `err`. Defesa-em-profundidade: na prática o CPF chega válido (validado por `parseCpfField` no mapper ETL), mas a degradação cobre o caso por simetria (CA2b).

**3. ETL `orchestrate` — OK.**
`migrateUserRow` (`orchestrate.ts:259-270`) repassa `validated.name` (`string`), `validated.cpf` (kernel `Cpf`, branded→`string`), `validated.telephone` (`string`) e `collaboratorRef` resolvido (`=== null ? null : String(...)`). Sem acoplar auth↔partners: o ETL fala só com `AuthEtlPort` (public-api/etl.ts, ADR-0006); `collaboratorRef` é ref lógica string sem FK. Órfão (collaborator não migrado) já quarentena ANTES do `provisionLegacyUser` (`orchestrate.ts:234-241`), então o port só recebe `CollaboratorId` válido ou `null` (CA3).

**4. Mudança de gate (`eslint.config.js`) — OK (com M2).**
Escopada a `tests/**` (não-produção), justificada por falso-positivo real do idioma spy+restore, consistente com os 8 relaxamentos pré-existentes do bloco. Não mascara nada em `src/`. Ver M2 para a alternativa inline (marginalmente mais cirúrgica, descartada por bom motivo).

**5. Escopo / YAGNI — OK.**
Só os 4 campos de dado (`name/cpf/telephone/collaborator_id`) fluem do legado. `photo?` aparece em `RegisterInput` por simetria com o agregado e por estar no plano (000-request decisão #1 lista `photo?`), mas NENHUM caller o popula (legado tem `avatarUrl`=URL, não chave S3 — decisão #4) → `auth_user.image_url` segue `null`. Não é scope-creep: é exatamente o desenho do 000-request. Persistência/schema **intocados** (confirmado: `userToInsert`/`collaborator_id` já existiam; nada no diff de migrations).

**6. Idioma / anti-padrões AGENTS.md — OK.**
Código 100% EN (identificadores, mensagens de warning `[provision-legacy-user] ... degraded invalid cpf to null`); comentários PT/ASCII (permitido). Imports: `import * as Cpf`/`* as Telephone` corretos (uso de valor `.parse`, não `import type`); extensões `.ts` presentes; `verbatimModuleSyntax` respeitado. Zero `throw` no domínio, zero `class`, zero `any`, zero `as` indevido (`'active' as const` apenas). Nenhum anti-padrão da lista do AGENTS.md presente.

**Testes W0 (conferência rasa):** as mudanças em `tests/**` são **aditivas** — novos `describe` (CA1-CA4) + instrumentação `provisionInputs`/`lastProvisionInput` no fake. Nenhuma assertion foi removida ou enfraquecida; W1 não diluiu o RED. O `unbound-method` que o W1 desligou vem exatamente do idioma spy+restore do teste CA2a.

---

## O que está bom

- **Layering DDD correto:** o script ETL passa strings raw; a parse+degradação para VO acontece na application (auth), nunca no script — respeita ADR-0006 à risca.
- **Degradação ancorada em precedente real** (login-500), não inventada: mesmo canal, mesma semântica, citação Evans p.82 no código.
- **Retrocompat cirúrgica:** estender `register` com opcionais `?? null` preservou todos os call-sites sem tocá-los; CA4 é trava de regressão, não driver de RED.
- **Idempotência/órfão intactos:** o caminho novo entra DEPOIS dos guards existentes (idempotência por `legacy_id`, quarentena de órfão), sem regressão.
- **Disciplina de regressão-zero:** o gate foi corrigido (eslint scoped) em vez de mascarar/skipar teste — saída-2 da política aplicada corretamente.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (`typecheck` + `format:check` + `lint` + `test`; depois `test:integration:{auth,etl}` + E2E na VM, CA5).
- **Débito sugerido (não-bloqueante):** abrir issue para `Logger` port nos use cases do auth (resolve M1: tira `process.stderr.write` da application e permite asserção via fake).
