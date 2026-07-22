# W1 — GREEN — NOTIF-EMAIL-FROM-DOMAIN-ALLOWLIST

**Skill/agente:** nodemailer-email-expert (via contratos-orchestrator; REPORT persistido pela sessão principal) · **Data:** 2026-07-02
**Alvo:** `src/modules/notifications/adapters/email/email-config.ts` (`parseEmailConfig`)
**Docs:** `.env.example` (git apply) + `handbook/infrastructure/03-secrets-catalog.md` §3.6

## Objetivo da wave

Implementar o mínimo para os 5 testes RED do W0 passarem (`email-config.test.ts` 22→27): guarda-corpo `EMAIL_FROM_ALLOWED_DOMAINS` (incidente prod #331, `From: ...@codebit.dev`). Presente → todo remetente resolvível deve ter domínio (após `@`, lower-case) na allowlist, senão config inválida (mesmo fail-fast de boot). Ausente → comportamento atual preservado. Inclui o achado colateral do W0: aceitar `From` com display name (`"Nome <local@dominio>"` — formato documentado).

## Arquivos tocados

### 1. `src/modules/notifications/adapters/email/email-config.ts`

- **`EmailConfigError`:** novo variant `Readonly<{ tag: 'from-domain-not-allowed'; field: string; domain: string }>` — `field` espelha `invalid-from`; `domain` (lower-case) espelha `invalid-provider.raw`; tag EN kebab-case.
- **Helpers module-private (YAGNI):** `DISPLAY_NAME_RE` + `extractAddress(raw)` (extrai endereço interno de `Nome <local@dominio>`; sem display name devolve `raw`); `domainOf(address)` (`slice(lastIndexOf('@')+1).toLowerCase()` — seguro, o endereço já passou pelo regex de e-mail); `parseAllowedDomains(raw)` (CSV → split/trim/toLowerCase/drop vazios; `undefined` → `[]`).
- **`parseOptionalFrom` → `parseFromField(field, raw, allowedDomains)`:** valida o endereço interno; allowlist presente e domínio fora → `err(from-domain-not-allowed)`. Caso plano devolve `parsed.value` (idêntico ao anterior); caso display name devolve `raw as EmailAddress` (preserva o header From; endereço interno validado — cast comentado).
- **`parseEmailConfig`:** computa `allowedDomains` uma vez; valida todos os remetentes resolvíveis (global, reset+alias, invite+alias, notification). `EMAIL_SANDBOX_TO` é **destinatário** (redirect não-prod), não remetente → chamado com allowlist `[]`.

### 2. `.env.example` (via `git apply --recount`)

`EMAIL_FROM_ALLOWED_DOMAINS=` na seção de e-mail, após `EMAIL_SANDBOX_TO=`, com comentário: recomendado em prod (ex.: `abemcomum.org, mail.abemcomum.org`); presente → todo remetente na lista, senão boot exit 78; ausente → sem verificação.

### 3. `handbook/infrastructure/03-secrets-catalog.md` §3.6

Linha nova na tabela + frase introdutória de "boot falha" ampliada para citar o domínio fora da allowlist.

## Decisões de design

- **Display name resolvido no escopo da CONFIG, não no VO `EmailAddress`:** o VO serve destinatários (`to`/`cc`/`bcc`); alargá-lo aceitaria display name onde só se espera endereço nu — scope-creep. A extração vive no parser da config, único ponto que lê `From` documentado com display name. `address.ts` intacto.
- **Valor armazenado no caso display name = `raw` original:** o `from` resolvido vira header From direto no worker (`delivery.ts:23`); preservar o raw mantém o display name no e-mail. No caso plano nada muda (trava de regressão dos testes `resolveFrom` existentes).
- **Sandbox fora da allowlist:** restrição é de *From*, não de caixa de recepção.
- **`parseAllowedDomains` não exportado:** padrão do arquivo (helpers module-private); testado via `parseEmailConfig`.

## Evidências (gates)

- `email-config.test.ts` (isolado, node real): **tests 27 · pass 27 · fail 0** (5 RED do W0 → GREEN; CA3 compat segue verde).
- `pnpm run lint`: **0**. `pnpm run format:check`: **OK**.
- `pnpm run typecheck`: apenas os **2 erros baseline** `payable-view-backfill` (ETL alheio) — nenhum erro novo.
- `pnpm test`: **tests 3374 · pass 3356 · fail 0 · skipped 18** — sem regressão (CA7 ✓; 3368 + 6 do ticket).

## Próximo passo (W2 — REVIEW, code-reviewer)

Auditar read-only: (a) cast `raw as EmailAddress` no display name; (b) exhaustividade/idioma do novo variant; (c) sandbox corretamente fora da allowlist; (d) docs coerentes; (e) idioma identificador-a-identificador.
