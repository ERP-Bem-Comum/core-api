# Decisões de Design — Módulo `auth` (log vivo)

> **Natureza deste documento.** Diferente de um [ADR](../../architecture/adr/README.md) (imutável), este é um
> **log vivo de decisões de design de domínio** do módulo `auth`. Existe para ser **consultado antes de
> cada ticket, criticado e melhorado**. Decisões aqui podem ser revistas sem abrir novo documento — basta
> editar a entrada, registrar a data e o motivo na seção _Histórico de revisão_ da própria decisão.
>
> **Hierarquia:** ADRs aceitos ([0024](../../architecture/adr/0024-identity-and-rbac-auth-module.md),
> [0025](../../architecture/adr/0025-http-server-fastify-core-api.md),
> [0026](../../architecture/adr/0026-mysql-read-write-split-connection.md)) vencem este log. Aqui ficam
> as decisões **abaixo do nível de ADR** (modelagem de agregado, recorte de funções, shape de evento).

## Como propor uma mudança

1. Abra a entrada `DD-…` correspondente, leia o racional e as objeções já registradas.
2. Edite a decisão; adicione uma linha em _Histórico de revisão_ com data + motivo + quem.
3. Se a mudança afeta código já entregue, abra ticket de refactor no pipeline.
4. Se a mudança contraria um ADR, **não edite aqui** — abra ADR que o supersede.

---

## Origem: painel de skills do agregado `User` (2026-05-27)

As decisões `DD-USER-*` saíram de um **painel paralelo de 6 lentes** (subagentes read-only, cada um lendo a
SKILL.md correspondente). Rastreabilidade dos pareceres (agentIds desta sessão):

| Lente | agentId | Voto-resumo |
| :-- | :-- | :-- |
| `ts-domain-modeler` | `a4e24efbf42b4c2d8` | Q1 refinado · Q2 serviço puro · Q3 {user,event} · Q4 hash+UserId · Q5 4 eventos |
| `ports-and-adapters` | `a7ffe454c4befb111` | Q1 **simples** · Q2 função pura (use case chama) · Q3 ports no use case · Q4 hash+UserId · Q5 publica pós-save |
| `clean-code-reviewer` | `a79f0bd35fd92c5ae` | Q1 **simples** · Q2 serviço (SRP) · Q3 5 funções pequenas · Q4 hash+UserId · Q5 1 evento/transição |
| `tdd-strategist` | `a3037eb8d0676fdd8` | Q1 refinado · Q2 função pura · Q3 Clock/Id injetados · Q4 hash pronto · Q5 assert no retorno |
| `requirements-engineer` | `a50e80f8ebda12106` | Q1 2 estados · Q2 serviço puro · Q3 register/disable/changePwd/assignRole · Q4 hash+UserId · Q5 3 eventos |
| `security-reviewer` | `a400121294aeaafdf` | Q1 refinado (fail-closed) · Q2 fail-closed só ActiveUser · Q3 invalidar sessão (nota) · Q4 hash opaco · Q5 sem segredo no payload |

---

## DD-USER-01 — `status` como tipos refinados (`ActiveUser | DisabledUser`)

- **Status:** Aceita (2026-05-27) · **Confiança:** média (decisão dividida 3–2–1)
- **Decisão:** modelar o estado do `User` como **discriminated union de tipos refinados** —
  `ActiveUser{ status:'active' }` e `DisabledUser{ status:'disabled'; disabledAt: Date }` — não um campo
  `status` escalar solto. `disabledAt` é obrigatório no estado desabilitado (estados eliminam `null`).
- **Racional:**
  1. Consistência com `Contract` (`ActiveContract | ExpiredContract | TerminatedContract`, §3.D.2 da entrevista 0001) — uma só gramática de agregado no código.
  2. Segurança fail-closed por tipo: `disable`/`authorize` aceitam só `ActiveUser`; o compilador barra uso de desabilitado.
  3. Testável por exaustão.
- **Objeções registradas (minoria — revisitar se pesarem):**
  - `ports-and-adapters`: mapper de persistência precisa discriminar shape na desserialização. **Mitigação:** `rehydrate(row)` dispatcher lê `row.status` (CONSIDER §3.D.5), igual ao `Contract`.
  - `clean-code-reviewer`: over-engineering para 2 estados. **Mitigação:** custo já pago no projeto; amortiza quando entrar `locked`.
- **Gatilho de revisão:** se após 2+ agregados o `rehydrate` dispatcher virar fardo, ou se nunca surgir 3º estado, reconsiderar campo simples.

## DD-USER-02 — `authorize` é função pura em serviço, fora do agregado

- **Status:** Aceita (2026-05-27) · **Confiança:** alta (unânime)
- **Decisão:** `authorize(user: ActiveUser, required: Permission): Result<void, 'forbidden'>` vive em
  `domain/authorization/authorize.ts` — **não** é método de `User`. Varre `user.roles` reusando
  `Role.hasPermission`. Default = **deny** (allowlist). Chamado pelo use case (após carregar via `UserReader`), **nunca** pelo BFF (ADR-0005).
- **Racional:** SRP (User = identidade; autorização = decisão de acesso, eixos de mudança distintos);
  fail-closed por aceitar só `ActiveUser`; ADR-0024 §2 normatiza essa assinatura.

## DD-USER-03 — Transições puras retornam `{ user, event }`; I/O no use case

- **Status:** Aceita (2026-05-27) · **Confiança:** alta (unânime)
- **Decisão:** o agregado expõe transições **síncronas puras** que retornam `{ user, event }`:
  `register`, `disable`, `changePassword`, `assignRole`, + refinement constructor `parseActive`. Cada uma
  recebe `at: Date` como argumento. Unicidade de e-mail, hashing, geração de id e persistência ficam no
  **use case** (Imperative Shell) com ports `Clock`/`IdGenerator`/`PasswordHasher`/`UserRepository`/`EventBus`.
- **Fora de escopo (YAGNI):** `enable` e `revokeRole` (aditivos sob demanda).
- **Racional:** Functional Core / Imperative Shell (§3.I.5); evento como valor de retorno (testável sem espião de bus).

## DD-USER-04 — `changePassword` recebe `PasswordHash` pronto; `UserId` branded

- **Status:** Aceita (2026-05-27) · **Confiança:** alta (unânime)
- **Decisão:** o domínio **nunca** hasheia nem vê senha em claro. `changePassword(u, newHash: PasswordHash, at)`
  recebe o hash já produzido pelo port `PasswordHasher` (argon2id, adapter, ticket X1). `UserId =
  Brand<string,'UserId'>` em `identity/user-id.ts` (UUID, espelha `role-id.ts`).
- **Invariante de segurança:** `Password` (claro) e `PasswordHash` **nunca** entram em log, evento, serialização ou DTO de resposta.

## DD-USER-05 — Eventos do agregado: `UserRegistered` · `PasswordChanged` · `RoleAssigned` · `UserDisabled`

- **Status:** Aceita (2026-05-27) · **Confiança:** alta (consenso)
- **Decisão:** o agregado emite **um evento por transição**, shape flat `Readonly<{ type; …payload; occurredAt }>`,
  PascalCase passado. Payload carrega só `userId`/`roleId`/`occurredAt` — **nunca** hash, senha ou token.
  Destrava o AuditLog diferido do [ADR-0022](../../architecture/adr/0022-read-models-via-projection-over-event-stream.md).
- **Fora do agregado `User`:** `UserAuthenticated`, `AccessTokenRefreshed`, `SessionRevoked` pertencem à
  camada de **sessão/credencial** (D6 + fase HTTP), não a este agregado.

---

## DD-SESSION-01 — estado do `RefreshToken` é **computado** por `state(token, now)`, não tipos refinados

- **Status:** Aceita (2026-05-27) · **Confiança:** média (diverge conscientemente de DD-USER-01)
- **Decisão:** o agregado `RefreshToken` **não** usa união refinada de tipos (como `User`). Os estados
  `active | expired | revoked | rotated` são derivados por uma função pura `state(token, now: Date)`.
- **Racional:** o estado `expired` depende de `now` (relógio), que **não é armazenável** no tipo — um
  `ExpiredToken` só existe relativo a um instante. Forçar tipos refinados exigiria recriar o tipo a cada
  leitura de relógio. Estado **temporal** ≠ estado **armazenado** (o `User` é armazenado → refinado cabe).
- **Consequência:** a borda usa `verify(token, now): Result<void, …>` (gate, análogo a `parseActive`).

## DD-SESSION-02 — agregado sem eventos; eventos de sessão nascem nos use cases

- **Status:** Aceita (2026-05-27) · **Confiança:** média
- **Decisão:** `issue`/`revoke`/`rotate` retornam só o `RefreshToken` (sem `{token, event}`). Os eventos
  `SessionRevoked`/`AccessTokenRefreshed` (vocabulário do ADR-0024) são emitidos pelos **use cases** de
  sessão (A3/A4/A5), não pelo agregado puro — mesmo critério do `Role` (D4).
- **Gatilho de revisão:** se o AuditLog exigir o "Quem/Quando" dessas transições direto do agregado, reabrir.

## DD-SESSION-03 — `rotate` ≠ `revoke`; precedência de estado e `tokenHash` opaco

- **Status:** Aceita (2026-05-27) · **Confiança:** alta
- **Decisão:** `rotate(token, replacementId, at)` marca `replacedBy` (token foi sucedido na renovação);
  `revoke(token, at)` marca `revokedAt` (logout/admin). São estados distintos. **Precedência** em `state`:
  `revoked` > `rotated` > `expired` > `active`. `tokenHash` é string **opaca** não-vazia (não vira VO
  próprio agora — YAGNI; nunca em claro, nunca logado — herda invariante DD-USER-04).

---

## DD-PORTS-01 — Ports da Fase A: repos no domínio, fatiados por agregado, read/write split

- **Status:** Aceita (2026-05-27) · **Confiança:** alta
- **Decisão:**
  1. Os 3 repositórios (User, Role, RefreshToken) são ports **ditados por invariância** → vivem em
     `domain/<agg>/repository.ts` (§3.H.2), cada um com **contract-suite** parametrizada + adapter **InMemory**.
  2. **Fatiar a Fase A por agregado:** `AUTH-REPO-USER`/`-ROLE`/`-SESSION` (não um `AUTH-PORTS` monolítico).
  3. **`User` tem 2 ports** (ADR-0026, read/write split desde já): `UserRepository` (write: `save`) +
     `UserReader` (read: `findById`, `findByEmail`).
  4. **`Clock` reusa** `src/shared/ports/clock.ts` (+ `clock-fixed` nos testes). **Sem port `IdGenerator`** —
     padrão do projeto é `XxxId.generate()` no domínio (`shared/utils/id.ts`).
  5. **`PasswordHasher`/`TokenIssuer`** (capacidades técnicas, não invariância) são definidos **junto dos
     adapters** X1 (argon2id) / X2 (JWT), em `application/ports/`.
- **Racional:** §3.H.2 (port de invariância no domínio); ADR-0026 (split na borda); reuso de infra; tickets
  pequenos e testáveis end-to-end (contract-suite roda contra InMemory).
- **Gatilho de revisão:** se `UserReader` e `UserRepository` nunca divergirem de implementação, reconsiderar unificar.

---

## Notas propagadas para tickets futuros

- **D6 / refresh (sessão):** `disable` e `changePassword` devem **invalidar sessões/refresh ativos**
  (OWASP ASVS V3.3). O `User` puro não toca sessão — o consumidor de `UserDisabled`/`PasswordChanged`
  revoga (`SessionRevoked`). Lockout/`failedAttempts` também moram na camada de sessão, não no `User`.
- **Persistência (P1/P2):** `rehydrate(row)` dispatcher por `row.status` para reconstruir o tipo refinado (DD-USER-01).
- **X1 (PasswordHasher):** invariante DD-USER-04 — senha em claro descartada após o hash; nunca logada.

## Decisões de design anteriores do módulo (resumo; detalhe nos tickets)

| Decisão | Onde |
| :-- | :-- |
| `Email`/`Permission` normalizam (trim+lowercase); senha/hash **não** (preservação byte-a-byte) | tickets `AUTH-VO-EMAIL`, `AUTH-VO-PERMISSION`, `AUTH-VO-PASSWORD` |
| Limite de e-mail 254 (identidade) ≠ 320 do `notifications/EmailAddress` (envio); regex replicada, não importada (ADR-0006) | `AUTH-VO-EMAIL` W2 |
| Política de senha: comprimento [8,128], sem regra de composição (NIST 800-63B) | `AUTH-VO-PASSWORD` |
| `Role` agregado **não-brandado** (§3.A.1); `grant` idempotente, `revoke` no-op | `AUTH-AGG-ROLE` |

## Histórico de revisão

- **2026-05-27** — Criação. Decisões `DD-USER-01..05` a partir do painel de 6 skills. (Gabriel Aderaldo + painel)
- **2026-05-27** — `DD-SESSION-01..03` (agregado `RefreshToken`, D6): estado temporal computado (diverge de DD-USER-01), sem eventos no agregado, `rotate`≠`revoke`. (Gabriel Aderaldo)
- **2026-05-27** — `DD-PORTS-01` (Fase A): repos no domínio (§3.H.2), fatiar por agregado, read/write split do User, reuso de Clock, sem IdGenerator port. (Gabriel Aderaldo + reality-check)
