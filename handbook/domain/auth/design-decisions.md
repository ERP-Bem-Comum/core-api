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

## DD-PERSIST-01 — `UserRepository` Drizzle (P1): roles via junção + `email-already-registered` no port

- **Status:** Aceita (2026-05-27) · **Confiança:** alta (decidida com o usuário)
- **save:** transação — upsert `auth_user` (SELECT-then-UPDATE-or-INSERT, padrão ADR-0020, **sem** `ON DUPLICATE
  KEY`) + **replace** das associações `auth_user_role` (DELETE do `user_id` + INSERT das atuais). **Não** cria
  `auth_role`/`auth_permission` (responsabilidade do `RoleRepository`, P2) — a FK `auth_urt_role_fk` exige roles
  preexistentes; salvar User com role inexistente é violação de FK (esperado).
- **findById/findByEmail:** reidratam `roles[]` via JOIN `auth_user_role → auth_role → auth_role_permission →
  auth_permission`; o mapper agrupa por role, monta `Role.create` + `Permission.parse`, e despacha por
  `row.status` → `ActiveUser | DisabledUser` (DD-USER-01; o domínio não tem `rehydrate`, o mapper reconstrói a
  borda). Tudo `Result<User | null, …>`; corrupção de row → `user-repo-unavailable`.
- **UNIQUE email (rede de unicidade, nota propagada do log):** o adapter Drizzle mapeia `ER_DUP_ENTRY` (errno
  1062) no índice `auth_user_email_idx` → **`'email-already-registered'`**. `UserRepositoryError` **ganha** esse
  código; o `InMemory` passa a detectar e-mail duplicado (outro `id`); o `registerUser` propaga (o literal já
  está no seu union). Cobre a **race** que o `findByEmail`+`save` não-atômico deixa aberta.
- **Teste:** contract-suite compartilhada (`user-repository.contract.ts`) ganha CA de e-mail duplicado (InMemory
  **e** Drizzle passam); teste Drizzle-específico de reidratação de roles usa **fixture SQL** de
  `auth_role`/`auth_permission`/`auth_role_permission` (desacopla do `RoleRepository` P2).

## DD-USER-06 — `changePassword` (A8): **re-autentica** (senha atual) e **revoga todas as sessões**

- **Status:** Aceita (2026-05-27) · **Confiança:** alta (decidida com o usuário)
- **Decisão:** o use case A8 `changePassword({ userId, currentPassword, newPassword })`:
  1. `findById(userId)`; `null` → `err('invalid-credentials')`; `parseActive` falho → `err('user-disabled')`.
  2. **Re-autenticação:** `Password.parse(currentPassword)` falho **ou** `passwordHasher.verify` false →
     `err('invalid-credentials')` (mesma resposta — não vaza qual falhou; senha **antiga** não revalida política).
  3. `Password.parse(newPassword)` falho → erro de política (`PasswordPolicyError`/`weak-password`) — política
     aplica à **nova** senha. `passwordHasher.hash(new)` → `User.changePassword(active, hash, now)` → `save`.
  4. **Revoga TODAS as sessões** do usuário (`findRevocableByUserId` + `revoke`+`save`) **após** o save da senha
     (a troca é a operação primária; a revogação é consequência de segurança — OWASP ASVS V3.3).
- **Racional da revogação no use case:** mesmo precedente de DD-SESSION-04 — o **EventBus não existe**, então
  deixar para o "consumidor de `PasswordChanged`" (nota propagada, linha ~261) deixaria um gap real: trocar a
  senha após suspeita de roubo não expulsaria o atacante com refresh ativo. Quando o EventBus existir, a
  revogação migra para o handler de `PasswordChanged` e este passo vira redundante (fail-closed, mantém).
- **Revoga todas (inclui a sessão atual):** mais simples e mais seguro; o usuário re-loga. Preservar a sessão
  atual (excluir o refresh corrente) exigiria recebê-lo no input — YAGNI agora.
- **Output:** `{ user: ActiveUser; event: PasswordChanged }` (espelha `registerUser`; não publica — EventBus futuro).
- **Helper local** `revokeAllForUser(refreshTokenRepo, userId, at)` no arquivo do A8 (3ª ocorrência do loop
  revoke; extração compartilhada com `revokeAllSessions`/`revokeChain` fica para refactor futuro com ticket).

## DD-USER-07 — `assignRole` (A9): **autoriza o ator** (`authorize`/`forbidden`), fail-closed

- **Status:** Aceita (2026-05-27) · **Confiança:** alta (decidida com o usuário)
- **Decisão:** o use case A9 `assignRole({ actorId, targetUserId, roleId })` é a **primeira** materialização de
  DD-USER-02 (`authorize` chamado pelo use case). Atribuir papel é privilegiado (admin sobre outro user):
  1. Carrega o **ator** (`findById(actorId)`); `null` **ou** `parseActive` falho → `err('forbidden')`
     (fail-closed: ator inexistente/desabilitado não autoriza; não vaza qual).
  2. `authorize(actor, REQUIRED)` onde `REQUIRED = Permission.parse('user:assign-role')`; `!ok` → `err('forbidden')`.
     Se a constante de permissão não parsear (impossível — string estática válida `resource:action`), também
     `err('forbidden')` (fail-closed).
  3. Carrega o **target** (`findById(targetUserId)`); `null` → `err('user-not-found')`; `parseActive` falho →
     `err('user-disabled')` (não se atribui papel a conta desabilitada — `assignRole` exige `ActiveUser`).
  4. Carrega o **role** (`RoleRepository.findById(roleId)`); `null` → `err('role-not-found')`.
  5. `User.assignRole(target, role, now)` (idempotente — `grant` no-op se já tem) → `save` → `ok({ user, event })`.
- **Permission exigida:** `'user:assign-role'` (`resource:action` kebab — VO `Permission`). Convenção; ajustável.
- **Output:** `{ user: ActiveUser; event: RoleAssigned }` (espelha os demais; não publica — EventBus futuro).
- **Erros:** `'forbidden' | 'user-not-found' | 'user-disabled' | 'role-not-found' | UserRepositoryError | RoleRepositoryError`.
- **Edge:** `actorId === targetUserId` (atribuir a si) é permitido se o ator tiver a permissão — sem tratamento especial.

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

## DD-SESSION-04 — `refreshAccessToken` (A6) valida **User ativo** (defense-in-depth)

- **Status:** Aceita (2026-05-27) · **Confiança:** alta (decidida com o usuário)
- **Decisão:** o use case A6 carrega o `User` via `UserReader.findById(token.userId)` **depois** de `verify` do
  refresh, e nega a renovação se a conta estiver `DisabledUser` → `err('user-disabled')`, **revogando** o refresh
  apresentado (`revoke` + `save`) antes de retornar.
- **Racional:** o **EventBus de revogação ainda não existe** (nota D6 / "EventBus do auth"): hoje `disable` **não**
  invalida sessões ativas. Sem este check, um usuário desabilitado renovaria o access indefinidamente — gap real de
  segurança no estado atual. `UserReader` (read port, DD-PORTS-01) entra como dep do use case.
- **Gatilho de revisão:** quando o consumidor de `UserDisabled` revogar sessões via evento (transporte futuro), o
  refresh de conta desabilitada já nascerá `revoked` e `verify` barraria antes — este check vira defense-in-depth
  redundante (manter mesmo assim é barato e fail-closed).

> **Refino 2026-05-27:** método do repo é `findRevocableByUserId` (não `findActiveByUserId`) — `active` é temporal
> e o repo não tem relógio (DD-SESSION-01). Detalhe em DD-SESSION-05.

## DD-SESSION-06 — A7 revoke: `revokeSession` (single) + `revokeAllSessions` (global); **idempotente**

- **Status:** Aceita (2026-05-27) · **Confiança:** alta (decidida com o usuário)
- **Decisão:** o ticket A7 entrega **dois** use cases de revogação por **refresh em claro** (ADR-0024:45
  "logout/admin revoga imediatamente"):
  1. `revokeSession({ refreshToken })` — logout **deste** dispositivo: `hash` → `findByTokenHash` →
     `revoke(token, now)` + `save`.
  2. `revokeAllSessions({ refreshToken })` — "sair de **todos** os dispositivos": resolve o `userId` pelo
     refresh apresentado → `findRevocableByUserId` (A6a) → `revoke`+`save` em cada.
- **Idempotência (anti-enumeration):** refresh **não encontrado** → `ok(undefined)` (não `err`). Logout é
  idempotente — o objetivo é encerrar a sessão; se o token já sumiu/expirou, o objetivo está cumprido.
  Não vaza se o token existe. `revoke` de já-revogado é no-op (agregado, DD-SESSION-03). **Diverge
  conscientemente** do A6b (`refreshAccessToken`), que retorna `refresh-token-not-found` — lá o not-found é
  informação útil de fluxo; aqui é ruído.
- **Input por refresh (não `userId`):** o cliente porta o refresh, não o `userId`; manter `userId` fora do
  contrato. **Admin revoga por `userId` de terceiro** fica YAGNI/futuro (precisaria de `authorize` + outro input).
- **Sem evento no output:** espelha `authenticate-user`/`refreshAccessToken`; `SessionRevoked` (ADR-0024:72)
  entra com o EventBus do auth (nota "EventBus do auth (futuro)").
- **Arquivo:** ambos em `application/use-cases/revoke-session.ts` (variações coesas do mesmo conceito,
  como A5+A5b em `authenticate-user.ts`).
- **Não usa `Clock` externo?** usa — `revoke(token, at)` recebe `clock.now()`.

## DD-SESSION-05 — reuse detection: refresh `rotated` reapresentado → **revoga a cadeia ativa do usuário**

- **Status:** Aceita (2026-05-27) · **Confiança:** alta (decidida com o usuário)
- **Decisão:** apresentar um refresh já `rotated` é sinal clássico de **replay/roubo** (OWASP ASVS V3.3). O A6, ao
  detectar `verify → 'refresh-token-rotated'`, **revoga todos os refresh ativos** do `userId` antes de falhar
  (`err('refresh-token-rotated')`). Caminho feliz (token `active`) **não** paga esse custo.
- **Modelagem do port (exigência):**
  1. `RefreshTokenRepository` ganha `findRevocableByUserId(userId): Promise<Result<readonly RefreshToken[], E>>`
     (read) — retorna os refresh com `revokedAt === null` (tudo que **ainda pode** ser revogado). **Não** se chama
     `findActiveByUserId` porque `active` é estado **temporal** (depende do relógio, DD-SESSION-01) e o repo não tem
     `Clock`; `revokedAt === null` é critério **armazenável**. Revogar um já-expirado é no-op semântico inofensivo
     (fail-closed). O use case aplica `revoke` (domínio puro, idempotente) em cada e `save` — **mutação fica no
     Functional Core**, não num `revokeAllByUserId` que empurraria a regra para o adapter.
  2. `RefreshTokenMinter` ganha `hash(rawToken): string` (sha256 hex, **mesma primitiva** do `mint`) — o A6 hasheia
     o refresh em claro recebido para o lookup `findByTokenHash`. Invariante: `hash(mint().token) === mint().tokenHash`.
- **Trade-off aceito:** o loop revoke/save **não é atômico** sob concorrência. Aceitável — reuse detection é evento
  raro de segurança; a janela é desprezível e o efeito (revogar demais) é fail-closed.
- **Fatiamento:** **A6a** (`AUTH-SESSION-REFRESH-PRIMITIVES`, S) entrega os 2 primitivos de port + adapters +
  contract-suites; **A6b** (`AUTH-USECASE-REFRESH-ACCESS`, M) entrega o use case que os consome.

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

## DD-CRYPTO-01 — argon2id via `hash-wasm` (WASM puro); impl própria PROIBIDA

- **Status:** Aceita (2026-05-27) · **Confiança:** alta
- **Decisão:** o port `PasswordHasher` (`application/ports/`) usa **argon2id via `hash-wasm`** (WASM puro):
  zero dependência transitiva, **sem `node-gyp`/binário nativo per-plataforma** — um artefato portável,
  ideal para Docker multi-arch e supply-chain. Parâmetros OWASP: `memorySize` 19456 KiB, `iterations` 2,
  `parallelism` 1, `hashLength` 32, salt 16 bytes (`crypto.randomBytes`), `outputType: 'encoded'` (PHC).
  Adapter **fake** (sha256 + `timingSafeEqual`, nativo, determinístico) para testes/CLI/use cases.
- **Recusado:**
  - **Implementação própria de argon2** — "don't roll your own crypto": memory-hard + constant-time exigem
    controle que JS não dá com segurança; risco de timing/bugs silenciosos; sem auditoria. Anti-padrão grave.
  - `@node-rs/argon2` (Rust nativo) — bom, mas binário per-plataforma; preferimos WASM portável.
  - `scrypt` nativo — divergiria do ADR-0024 (argon2id).
- **Honra:** ADR-0024 (argon2id), ADR-0011 (dep mínima auditável, sem toolchain), ADR-0020 (Docker sem C++).
- **Gatilho de revisão:** se o custo do WASM em login (latência) virar problema medido, avaliar `@node-rs/argon2`.
- **Auditoria 2026-05-27 (issue [Daninet/hash-wasm#69](https://github.com/Daninet/hash-wasm/issues/69)):** o leak relatado é da API de **instância** (`createCRC32()` reutilizada em loop, sem cleanup). A API **one-shot** `argon2id()` que usamos **não vaza** — sonda de 60 hashes sequenciais manteve RSS estável (~97 MB; delta iter10→60 = −19 MB). Sem ação no código. Nota: a one-shot é serializada por lock global do hash-wasm — revisitar se a taxa de login exigir paralelismo (worker/pool).

---

## DD-TOKEN-01 — Access token JWT em ES256 via `jose`; chaves injetadas

- **Status:** Aceita (2026-05-27) · **Confiança:** alta
- **Decisão:** `TokenIssuer` (`application/ports/`) emite o **access token JWT** assinado em **ES256**
  (ECDSA P-256) via **`jose` 6.x** (zero dep, Web Crypto nativo). **core-api assina com chave PRIVADA;
  BFF valida com PÚBLICA** (ADR-0005/0024 — emite≠valida; o BFF não pode forjar). Claims mínimas:
  `sub`=userId, `iat`, `exp` (TTL ~15 min — access curto), `iss`. **Permissions NÃO** vão no token
  (authz é do core via `authorize`, DD-USER-02). As **chaves são injetadas** no adapter (`CryptoKey`):
  `generateKeyPair('ES256')` nos testes; `importPKCS8`/`importSPKI` de PEM (secrets) no composition root.
  Fake adapter (round-trip base64, sem assinatura) para use cases.
- **Recusado:** HS256 (segredo compartilhado — BFF poderia forjar); `jsonwebtoken` (CJS, deps); impl
  própria de assinatura ("don't roll your own crypto").
- **Honra:** ADR-0024 (JWT curto, emite/valida), ADR-0011 (`jose` zero-dep, nativo).
- **Gatilho de revisão:** se múltiplos validadores externos surgirem, expor **JWKS** (`/.well-known/jwks.json`) e `kid` para rotação de chave.

---

## DD-LOGIN-01 — `authenticate`: senha não valida política; respostas anti-enumeration; refresh em A5b

- **Status:** Aceita (2026-05-27) · **Confiança:** alta
- **Decisão:**
  - No login, falha de `Email.parse` **ou** `Password.parse` → **`'invalid-credentials'`** (não vaza formato
    nem política — a política de força é só de **registro/troca**, não de login).
  - **Ordem anti-enumeration:** `findByEmail` null → `invalid-credentials`; `verify` false → `invalid-credentials`
    (mesma resposta); `'user-disabled'` **só após** a senha correta (não revela conta desabilitada a quem não tem a senha).
  - **A5 emite só o access JWT.** O refresh token opaco (`RefreshTokenMinter` randomBytes+sha256 + persistência)
    fica em **A5b** (fatiamento aprovado 2026-05-27).
- **Trade-off:** se a política de senha endurecer, senhas antigas válidas falhariam `Password.parse` no login →
  rehash-on-login ou `verify(raw: string)`. Revisitar então.
- **Honra:** ADR-0024 (sessão híbrida, access curto), DD-USER-02 (authorize separado).

---

## DD-LOGIN-02 — refresh token opaco: `randomBytes(32)` + `sha256` (não argon2)

- **Status:** Aceita (2026-05-27) · **Confiança:** alta
- **Decisão:** `RefreshTokenMinter.mint()` (port, síncrono) → `{ token, tokenHash }`. `token` =
  `base64url(randomBytes(32))` (256 bits, vai ao cliente); `tokenHash` = `sha256(token)` hex (persiste).
  **Não usa argon2** — refresh é **alta-entropia aleatória** (≠ senha de baixa entropia que exige KDF lento).
  O `authenticate` (A5b) emite o par: access JWT (ES256) + refresh opaco persistido.
- **Honra:** ADR-0024 (sessão híbrida). O `findByTokenHash` (A3) é o lookup do A6 (refresh/rotação).

---

## Notas propagadas para tickets futuros

- **D6 / refresh (sessão):** `disable` e `changePassword` devem **invalidar sessões/refresh ativos**
  (OWASP ASVS V3.3). O `User` puro não toca sessão — o consumidor de `UserDisabled`/`PasswordChanged`
  revoga (`SessionRevoked`). Lockout/`failedAttempts` também moram na camada de sessão, não no `User`.
- **Persistência (P1/P2):** `rehydrate(row)` dispatcher por `row.status` para reconstruir o tipo refinado (DD-USER-01).
- **X1 (PasswordHasher):** invariante DD-USER-04 — senha em claro descartada após o hash; nunca logada.
- **EventBus do auth (futuro):** os use cases (A4 `registerUser`, A5–A9) já **retornam** o evento no output mas **não publicam** (não há EventBus/outbox no `auth`). Ao criar o transporte de eventos do módulo, ligar `eventBus.publish(event)` **após** `repo.save` — destrava o AuditLog (ADR-0022). A assinatura dos use cases não muda.
- **Persistência do auth (Fase P):** `auth_user.email` precisa de **`UNIQUE INDEX`** como rede real de unicidade (o `findByEmail`+`save` do use case não é atômico — race sob concorrência). Mapear o erro de violação → `'email-already-registered'`. Mesmo padrão de `sequentialNumber` em `contracts`.

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
- **2026-05-27** — `DD-CRYPTO-01` (X1): argon2id via `hash-wasm` (WASM puro); impl própria recusada; fake sha256 para testes. (Gabriel Aderaldo)
- **2026-05-27** — `DD-TOKEN-01` (X2): access JWT ES256 via `jose`; core assina (privada) / BFF valida (pública); chaves injetadas; HS256 e impl própria recusados. (Gabriel Aderaldo)
- **2026-05-27** — `DD-SESSION-04..05` (A6): refresh valida User ativo (defense-in-depth, pois EventBus de revogação ainda não existe); reuse detection de refresh `rotated` revoga a cadeia ativa do usuário (OWASP ASVS V3.3); port ganha `findActiveByUserId` + `RefreshTokenMinter.hash`; fatiado em A6a (primitivos) + A6b (use case). (Gabriel Aderaldo + decisão de escopo)
- **2026-05-27** — `DD-SESSION-06` (A7): `revokeSession` (single) + `revokeAllSessions` (global, reusa `findRevocableByUserId`); input por refresh em claro; not-found → idempotente `ok` (diverge do A6b); admin-by-userId YAGNI. (Gabriel Aderaldo + decisão de escopo)
- **2026-05-27** — `DD-USER-06` (A8): `changePassword` re-autentica (verifica senha atual → `invalid-credentials`) e revoga TODAS as sessões após o save (defense-in-depth, pois EventBus não existe); política aplica à nova senha; output `{user, event}`. (Gabriel Aderaldo + decisão de escopo)
- **2026-05-27** — `DD-USER-07` (A9): `assignRole` autoriza o ator via `authorize`/`forbidden` (1ª aplicação de DD-USER-02); input `{actorId, targetUserId, roleId}`; permissão `user:assign-role`; fail-closed (ator null/disabled/sem-permissão → forbidden); `role-not-found`/`user-not-found`/`user-disabled`. (Gabriel Aderaldo + decisão de escopo)
