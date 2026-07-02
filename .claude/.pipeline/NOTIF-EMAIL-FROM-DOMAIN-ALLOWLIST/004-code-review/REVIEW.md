# W2 — REVIEW — NOTIF-EMAIL-FROM-DOMAIN-ALLOWLIST

**Skill:** code-reviewer (via contratos-orchestrator; read-only; REVIEW persistido pela sessão principal) · **Data:** 2026-07-02 · **Round:** 1/3
**Veredito:** ✅ **APPROVED** (Minors não-bloqueantes)

## Resultado por item do checklist

### 1. Idioma identificador-a-identificador — ✅ PASS

`DISPLAY_NAME_RE`, `extractAddress`, `domainOf`, `parseAllowedDomains`, `parseFromField`, `allowedDomains`, `address`, `domain`, `inner`, env `EMAIL_FROM_ALLOWED_DOMAINS`, tag `'from-domain-not-allowed'`, campos `field`/`domain` — **todos EN**; tag kebab-case coerente com a union. Nenhum vazamento de PT em identificador. Critério: regra pura, sem "consistência com legado".

### 2. Cast `raw as EmailAddress` (ponto mais arriscado) — ✅ SAFE

O cast (`email-config.ts:129`) só é alcançado no ramo `address !== raw`, que só ocorre quando `DISPLAY_NAME_RE` casou e extraiu `inner` — e `parseEmailAddress(address)` valida o endereço interno ANTES do cast. Sem display name, `address === raw` e o retorno é `parsed.value` (validado). **Não existe caminho de raw malformado com brand.** Comentário explica a invariante.

### 3. `DISPLAY_NAME_RE` — bordas — ✅ PASS (sem falso-aceite)

- `"<a@b.c>"` → aceito (angle-addr válido). `"Nome <a@b.c> extra"` → `$` impede o match → `EMAIL_REGEX` rejeita. `"<<a@b.c>>"` → sem match → rejeitado.
- Display name com `@` (`"a@b.c <d@e.f>"`) → `domainOf` opera no inner (`e.f`), não no raw.
- Adversarial `"abemcomum.org <evil@codebit.dev>"` → domínio checado = `codebit.dev` → **rejeitado**; o texto do display name não engana a checagem.
- `domainOf` seguro (`EMAIL_REGEX` garante um `@`); `noUncheckedIndexedAccess` respeitado.

### 4. Cobertura da validação — ✅ PASS

Validados com a allowlist: `EMAIL_FROM`, `EMAIL_FROM_RESET`+`AUTH_RESET_FROM`, `EMAIL_FROM_INVITE`+`AUTH_INVITE_FROM`, `EMAIL_FROM_NOTIFICATION` — o `FromMap` inteiro. `EMAIL_SANDBOX_TO` com allowlist `[]` (é destinatário) — correto. Grep: `PARTNERS_INVITE_FROM` **não é lido em nenhum ponto de produção** — não é remetente resolvível (ver Minor 4).

### 5. Compat (allowlist ausente) — ✅ PASS

`parseAllowedDomains(undefined)` → `[]` → zero checagem. Caso plano retorna `parsed.value` byte-idêntico ao anterior (21 testes de `NOTIF-EMAIL-DEPLOY-CONFIG` intactos). Ressalva registrada: display name passa a ser aceito MESMO sem allowlist (antes `invalid-from`) — o "achado colateral" do W0, alinhado ao formato documentado desde sempre em `.env.example`/§3.6; nenhum teste travava a rejeição.

### 6. Coerência de docs — ✅ PASS

Env idêntica entre `.env.example`, §3.6 e código; exemplo CSV bate com o parse.

### 7. Sintaxe TS / errors-as-values / YAGNI / CA1-CA7 — ✅ PASS

Sem `throw` vazando; novo variant não quebra exaustividade (o switch de `build-email-sender.ts:30` é sobre provider, não sobre o erro); helpers module-private; CA1-CA7 cobertos.

## Achados

**Blocker / Major:** nenhum.

**Minor (não-bloqueantes):**

1. **Overload semântico do brand `EmailAddress`** — passa a poder carregar `"Nome <addr>"` (não-nu) no escopo da config. Seguro hoje (consumidores são headers From/to do nodemailer/resend, que aceitam a forma), mas alarga a invariante nominal do VO. Candidato a tipo distinto (`FromHeader`) em ticket futuro → **rastrear via issue-report**.
2. **Widening incidental do `EMAIL_SANDBOX_TO`** — também aceita display name agora (reusa `parseFromField`). Inofensivo (campo `to` aceita a forma). Nota de escopo.
3. **Doc bleed dos tickets-irmãos** no diff de `.env.example`/§3.6 (linhas de `SMTP_REQUIRE_TLS` e base URLs pertencem aos outros tickets da branch) — fronteira intencional do PR único; aprovação deste ticket não avaliza aquelas linhas.
4. **Inconsistência pré-existente em §3.6**: lista `PARTNERS_INVITE_FROM` como alias "ainda lido", mas o código nunca o lê. Sem gap de segurança; doc diverge do código → **rastrear via issue-report** (anti-padrão #15, fora do escopo aqui).

**Nit:** CA5 (teste) asserta só `ok === false` na rejeição, sem checar `tag`/`field`/`domain` — fortalecimento opcional.

## Próximo passo (W3)

4 comandos do gate; esperado: só os 2 erros baseline `payable-view-backfill` no typecheck (mesma condição de fechamento dos tickets-irmãos); suíte ≥ 3374/0 fail.
