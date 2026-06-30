# Code Review — Ticket PAR-ETL-PIX-KEY-TYPE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (W2, read-only)
**Data:** 2026-06-30
**Issue:** #275 · **Branch:** `fix/275-etl-supplier-pix-key-type` · **Size:** S (fix de ~11 linhas)

**Escopo revisado (diff `HEAD`→working tree):**

- `scripts/etl/mappers/supplier.mapper.ts` — translator `LEGACY_PIX_KEY_TYPE_MAP` + `translatePixKeyType` + uso em `resolvePaymentTargets`.
- `tests/etl/mappers/supplier.mapper.test.ts` — bloco `describe` #275 (CA1/CA2/CA3), W0.

**Referências cruzadas lidas (read-only):**

- `src/modules/partners/domain/shared/payment-target.ts:10,65-68` (enum `PixKeyType` + `createPixKey` estrito).
- `scripts/etl/mappers/collaborator.mapper.ts:130` (confirma que NÃO consome `pix_key_type`).
- `scripts/etl/legacy/rows.ts:37-39` (`pixInfoKeyType: string | null`).

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Obs 1 — `scripts/etl/mappers/supplier.mapper.ts:41` — case-sensitivity por design

`translatePixKeyType` casa o mapa por igualdade exata de string (chaves UPPER). O dump de prod
confirma que o legado é sempre UPPER (`CNPJ`/`EMAIL`/...), então não há defeito. Se algum dia
vier casing misto (`CellPhone`), o `?? raw` faz pass-through → `createPixKey` rejeita →
`EnumUnknown` (quarentena estrita). Esse é o comportamento **seguro e desejado** (CA3); o
`000-request.md` §"Case/exatidão" pede mapeamento explícito, não normalização por lowercase.
Observação informativa, **não** acionável. Se a quarentena por casing aparecer na VM (CA4),
registrar via `issue-report` — fora do escopo deste ticket.

---

## Conformidade — 5 itens do checklist

### 1. Correção do translator — ✅ CONFORME

Mapa completo e correto vs `payment-target.ts:10` (`PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random-key'`):

| Legado (`supplier.mapper.ts:33-39`) | Core | Confere? |
|---|---|---|
| `CNPJ` → `cnpj` | `cnpj` | ✅ |
| `CPF` → `cpf` | `cpf` | ✅ |
| `EMAIL` → `email` | `email` | ✅ |
| `CELLPHONE` → `phone` | `phone` | ✅ |
| `ALEATORY_KEY` → `random-key` | `random-key` | ✅ |

Os 5 valores do enum são cobertos; nenhum valor de destino fora do enum. O tipo
`Readonly<Record<string, PixKeyType>>` garante, em compilação, que todo valor do mapa é um
`PixKeyType` válido (impossível mapear para tipo inexistente).

**Pass-through estrito (CA3):** `translatePixKeyType` retorna `string` (`supplier.mapper.ts:41`):
`LEGACY_PIX_KEY_TYPE_MAP[raw] ?? raw`. Com `noUncheckedIndexedAccess`, o acesso é
`PixKeyType | undefined`, e o `?? raw` repassa o valor cru fora do mapa. Esse cru segue para
`createPixKey`, que valida `PIX_KEY_TYPES.has(input.keyType)` (`payment-target.ts:66`) — só
passa se já for um dos 5 valores canônicos do core. **Não existe caminho que aceite tipo
inválido:** ou está no mapa (→ enum válido), ou é cru e tem de ser ele mesmo um enum válido;
qualquer outra coisa cai em `err('invalid-pix-key')` → `resolvePaymentTargets` empurra
`{ tag: 'EnumUnknown', field: 'pix_key_type' }` (`supplier.mapper.ts:79-83`). CA3 mantido com rigor.

Detalhe positivo: o `attempted` da quarentena reporta `row.pixInfoKeyType` **cru**
(`supplier.mapper.ts:82`), não o traduzido — diagnóstico correto (mostra o que o legado enviou).

### 2. ACL / camada (Evans, DDD p.226) — ✅ CONFORME

A tradução vive no ETL (`scripts/etl/mappers/supplier.mapper.ts:32-41`), que é o
Anti-Corruption Layer entre o legado e o core. O VO `PaymentTarget`
(`payment-target.ts`) está **intocado** no diff — o core segue estrito (fonte da verdade).
Não há vazamento do vocabulário legado (`CELLPHONE`, `ALEATORY_KEY`) para o domínio: o
mapeamento é unidirecional legado→core e termina antes de `createPixKey`. Aderente ao papel
de translator do ACL (Evans p.226, citado no `000-request.md:19`).

### 3. Pureza / robustez — ✅ CONFORME

- **Pureza:** `translatePixKeyType` é função pura — lookup determinístico, sem I/O, sem estado,
  sem `Date`/random (`supplier.mapper.ts:41`).
- **`null`/`''`:** o chamador passa `translatePixKeyType(row.pixInfoKeyType ?? '')`
  (`supplier.mapper.ts:74`); o ramo só executa sob `if (row.pixInfoKey !== null)`
  (`supplier.mapper.ts:72`). `null` → `''` → não está no mapa → pass-through `''` → `createPixKey`
  rejeita (não está em `PIX_KEY_TYPES`) → `EnumUnknown`. Sem crash, sem `undefined` vazando.
- **Idempotência:** valor já-canônico do legado (ex.: `'email'` minúsculo, usado no teste
  pré-existente `supplier.mapper.test.ts`) passa direto e é aceito — não há regressão do
  comportamento anterior.
- **Case-sensitivity:** ver Obs 1 (por design; legado é UPPER; casing inesperado → quarentena segura).

### 4. Escopo / YAGNI — ✅ CONFORME

Translator **local** ao `supplier.mapper.ts`, não um util compartilhado. Confirmado que
`collaborator.mapper.ts:130` fixa `pixKey: null` e **não** consome `pix_key_type` — único outro
consumidor potencial no ETL (grep em `scripts/etl/` só retorna o supplier). Logo o util local é
a escolha correta: nenhum over-engineering, nenhuma abstração prematura. A "Nota" de possível
follow-up do `000-request.md:29-31` fica resolvida (collaborator não tem o gap).

### 5. Idioma / anti-padrões — ✅ CONFORME

- **Idioma:** identificadores em EN (`LEGACY_PIX_KEY_TYPE_MAP`, `translatePixKeyType`, `raw`);
  comentário-âncora em EN (`supplier.mapper.ts:32`). Coerente com AGENTS.md §Idioma (código EN).
- **Naming:** claro e específico; sem `data`/`value`/`info` vago; constante `SCREAMING_SNAKE`,
  função `camelCase` — convenção respeitada.
- **Anti-padrões AGENTS.md:** sem `throw`, sem `class`, sem `any`, sem `enum`; `import type` para
  `PixKeyType` (verbatimModuleSyntax); imports com extensão `.ts`. Nenhum anti-padrão violado.
- **Tipo de retorno honesto:** `translatePixKeyType` declara retorno `string` (não `PixKeyType`),
  refletindo que o pass-through pode produzir valor não-canônico — a validação fica delegada ao
  VO. Correto.

**Teste (W0):** o bloco #275 (`supplier.mapper.test.ts`) cobre CA1/CA2 (5 mapeamentos, um
`it` por caso via tabela) e CA3 (`FOO → EnumUnknown`). Usa `pixOnly` para isolar a falha no
tipo da chave (zera o banco), CNPJ/CPF/UUID válidos, e asserções concretas
(`r.value.aggregate.pixKey.keyType === expected`) — sem matcher vago. Lógica dos testes
pré-existentes (linhas 1-97) **não** alterada pelo W1 (só o bloco #275 foi adicionado). AAA
implícito e legível. Conforme `.claude/rules` (testing) e SKILL §H.

---

## O que está bom

- **Estritude preservada:** a combinação `?? raw` + `PIX_KEY_TYPES.has` garante matematicamente
  que nenhum tipo inválido escapa — CA3 robusto, não apenas testado.
- **ACL no lugar certo:** VO do core intocado; tradução confinada ao ETL (Evans p.226).
- **Type-safety do mapa:** `Readonly<Record<string, PixKeyType>>` impede mapear para destino fora do enum em compilação.
- **Diagnóstico:** quarentena reporta o valor legado cru no `attempted`.
- **Escopo cirúrgico:** fix de ~11 linhas, sem tocar collaborator nem outros enums; YAGNI respeitado.

---

## Próximo passo

- **APPROVED:** pipeline-maestro avança para **W3** (`typecheck` + `format:check` + `lint` + `test`).
- **Pendente fora de W2 (já registrado no W1):** validação E2E na VM (CA4) — `suppliers quarantined`
  deve cair de 83 para ~1 (só o `EmailInvalid`). Não bloqueia o veredito de code review.
