# W0 — RED — NOTIF-EMAIL-FROM-DOMAIN-ALLOWLIST

**Skill:** tdd-strategist (via contratos-orchestrator; REPORT persistido pela sessão principal) · **Data:** 2026-07-02
**Arquivo de teste:** `tests/modules/notifications/adapters/email/email-config.test.ts`
**Alvo:** `src/modules/notifications/adapters/email/email-config.ts` (`parseEmailConfig`) — **não tocado**.

## Objetivo da wave

Cravar em teste o guarda-corpo `EMAIL_FROM_ALLOWED_DOMAINS` (incidente prod #331: `From: ...@codebit.dev`). Presente → todo remetente resolvível deve ter domínio (após `@`, case-insensitive) na lista, senão config inválida (fail-fast de boot já existente). Ausente → comportamento atual.

## Decisão de formato de erro

Novo variant em `EmailConfigError`, mantendo o padrão real do arquivo (union `Readonly<{ tag; ... }>`):

    Readonly<{ tag: 'from-domain-not-allowed'; field: string; domain: string }>

- `field` = env do remetente rejeitado — espelha `invalid-from` (`email-config.ts:59`).
- `domain` = domínio rejeitado, lower-case — espelha `invalid-provider` (`email-config.ts:53`, que carrega o valor ofensor).
- Tag EN kebab-case, como as existentes. Satisfaz o CA1 ("erro nomeando a env e o domínio").

## Cobertura — casos × CAs (describe novo, sem duplicar os verdes)

| Teste (it) | CA | Cenário | Esperado | RED por quê |
| :-- | :-- | :-- | :-- | :-- |
| CA1 (incidente codebit.dev) | CA1 | allowlist `abemcomum.org` + `EMAIL_FROM=no-reply@codebit.dev` | `err from-domain-not-allowed` (field=`EMAIL_FROM`, domain=`codebit.dev`) | hoje aceita qualquer domínio → `ok` |
| CA2 display name na lista | CA2 | `EMAIL_FROM="Bem Comum <no-reply@abemcomum.org>"` | `ok` | **`address.ts:18` hoje rejeita display name** → `err` |
| CA2 case-insensitive | CA2 | `"Bem Comum <No-Reply@ABEMCOMUM.ORG>"` | `ok` | idem + força match case-insensitive |
| CA3 compat guard | CA3 | **sem** allowlist + `EMAIL_FROM=no-reply@codebit.dev` | `ok` | **verde por construção** (trava de regressão, não RED) |
| CA4 override por fluxo | CA4 | allowlist ok no global, `EMAIL_FROM_INVITE=x@outro.dev` | `err` (field=`EMAIL_FROM_INVITE`) | hoje não checa nenhum remetente → `ok` |
| CA5 CSV multi-domínio | CA5 | `abemcomum.org, mail.abemcomum.org` (trim): aceita ambos, rejeita `codebit.dev` | `ok`/`err` | sub-asserção de rejeição hoje dá `ok` |

**Nota CA3:** "ausente = sem efeito" não pode ser RED — o comportamento atual já é o desejado; o teste trava regressão (CA7) e é verde em W0 e W1. CA6/CA7 (docs + suíte) são de W1/W3.

**Achado colateral (para o W1 resolver e o W2 auditar):** o exemplo documentado em `.env.example`/§3.6 usa display name (`"Bem Comum <no-reply@dominio>"`), mas o parse atual o rejeita (`address.ts:18` — regex sem suporte à forma `Nome <local@dominio>`). O CA2 crava o comportamento DOCUMENTADO como o correto.

**Não-duplicação:** os 21 testes de `NOTIF-EMAIL-DEPLOY-CONFIG` (provider/sandbox/from/resolveFrom) não foram alterados nem repetidos.

## Evidência RED (arquivo isolado, binário real do node)

    tests 27 · suites 5 · pass 22 · fail 5

    ✖ CA1 (incidente codebit.dev)      — actual ok=true (esperava err)
    ✖ CA2 display name                 — false !== true
    ✖ CA2 case-insensitive             — false !== true
    ✖ CA4 override por fluxo           — true !== false
    ✖ CA5 CSV multi-dominio            — true !== false
    (CA3 compat guard: PASS)

21 pré-existentes verdes + CA3 verde = 22 pass; 5 RED genuínos por comportamento inexistente.

## Próximo passo (W1 — GREEN, nodemailer-email-expert)

1. `parseAllowedDomains` (CSV split, trim, toLowerCase, drop vazios).
2. Extração de domínio robusta ao display name (`"Nome <local@dominio>"`), sempre lower-case — resolvendo a inconsistência documentada acima.
3. Validar cada remetente resolvível quando a allowlist estiver presente; primeiro fora da lista → `err({ tag: 'from-domain-not-allowed', field, domain })`; ausente → nenhuma verificação.
4. CA6 (docs `.env.example` via `git apply` + §3.6) no mesmo W1; CA7 (suíte ≥ 3368) no gate.
