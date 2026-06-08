# Diagnóstico do runner (US4 T017) — 26 falhas da suíte principal

> Rodado via Bruno CLI com `--reporter-json` contra infra real (MySQL+MinIO). Cada falha tem
> `error.code` e response body reais. Conclusão central: a maioria é **`.bru` desalinhado com o
> server real** (coleções que nunca rodaram via Bruno — ex.: contracts) — alinhamento de teste,
> não bug do server. Poucos são suspeitos de bug real.

## A. Contracts — body sem `mode` (6 falhas → 1 causa + cascata)

**Causa:** `createContractBodySchema` é `z.discriminatedUnion('mode', [...])` — exige `mode: 'Pending'`
(ou `'Active'` + `signedAt`). O `.bru` envia title/objective/originalValue/contractor **sem `mode`** →
`{ error: { code: 'validation' } }` 400. Os demais (GET/PATCH/DELETE `:id`) são **cascata** (sem
`contractCreatedId`, usam id vazio → 400 id inválido).
**Fix:** adicionar `"mode": "Pending"` ao body do `6-contracts/01-create-contract.bru`; conferir os campos
do `contractWriteShape` (período/valor). Alinhamento de teste.

## B. Collaborators — CPF inválido (7 falhas → 1 causa + cascata)

**Causa:** `03-create-collaborator.bru` usa `"cpf": "12345678901"` (sequência — reprova módulo 11) →
`invalid-cpf` 422. Os demais collaborators são cascata (sem id criado).
**Fix:** usar um CPF válido (gerar por módulo 11, como `scripts/seed-partners.ts`). Alinhamento de teste.

## C. PAG boundary — server retorna 400 `validation` (5 falhas)

**Causa:** `page=0`/`page=-1`/`pageSize` inválido → o Zod da borda retorna **400 `validation`**. Os testes
`PAG-1/2/5a/5b` esperam `[422, 200]`. O comportamento real (400 na borda) é **correto** (validação de
querystring). **Fix:** ajustar as asserções para aceitar **400** (`expect([400,422,200]).to.include(status)`;
o invariante real é "nunca 500"). Alinhamento de teste.

## D. PAG-5d — naming `total` vs `totalItems` (1 falha)

**Causa:** contracts retorna `meta: { page, limit, total, totalPages }` — usa **`total`**; o teste espera
`meta.totalItems`. (users usa `totalItems`; partners usa `itemCount/totalItems` — **inconsistência de
contrato de paginação entre módulos**.) **Fix:** o teste de contracts deve usar `meta.total`. Registrar a
inconsistência de naming como achado (possível ticket de harmonização).

## E. Partners aggregate — `type=invalido` → 200 vazio (2 falhas) ⚠️ SUSPEITO DE BUG

**Causa (RESOLVIDA — NÃO é bug):** o `.bru` `06-type-invalido-400` faz `GET /api/v1/partners` **sem o
`?type=invalido` na URL** (o subagente esqueceu o query param). O schema é
`type: z.enum(['supplier','financier','collaborator','act']).optional()` — **correto**: sem `type`, retorna
200 (agregado); **com** `?type=invalido`, o Zod rejeita → 400. O segundo caso (`meta.itemsPerPage`) também é
`.bru` (param de limit ausente/errado). **Fix:** adicionar `?type=invalido` à URL; alinhar o param de limit.
Alinhamento de teste — **server está correto**.

## F. deactivate-self — `user-id-invalid` (1 falha)

**Causa:** `US5 auto-desativacao` espera 422 (anti-lockout) mas recebe **400 `user-id-invalid`** — o
`adminUserId` capturado (via `/me`) está vazio/mal-formado no contexto unificado. **Fix:** garantir a
captura do `adminUserId` antes do PATCH (ordem/var). Alinhamento de teste.

## G. Foto — `photo-empty` (1 falha)

**Causa:** `US6 upload foto` retorna **422 `photo-empty`** — o corpo binário (octet-stream) não foi
enviado. **Fix:** conferir o `body:file`/asset do `.bru` de upload de foto (igual ao que a coleção auth
fazia com `assets/sample.jpg`). Alinhamento de teste.

## Resumo de ações

| Cat               | Falhas | Tipo     | Ação                            |
| ----------------- | ------ | -------- | ------------------------------- |
| A contracts       | 6      | teste    | add `mode:'Pending'` + campos   |
| B collaborators   | 7      | teste    | CPF válido                      |
| C PAG boundary    | 5      | teste    | aceitar 400                     |
| D PAG-5d          | 1      | teste    | `meta.total`                    |
| E partners type   | 2      | **bug?** | confirmar contrato (400 vs 200) |
| F deactivate-self | 1      | teste    | captura adminUserId             |
| G foto            | 1      | teste    | body binário                    |

**24/26 são alinhamento de teste** (`.bru` desatualizado); **2 (E) são suspeitos de bug real** do aggregate.

## Resolução (W1 INT-RUNNER-ALL) — PRINCIPAL VERDE ✅
Todas as 26 alinhadas (server estava correto em todas). Fixes: contracts `mode:'Pending'` + campos reais
(`originalValueCents`/`periodStart`/`periodEnd`/`sequentialNumber` formato `NNN/AAAA`) + captura do id no
**body** (não Location); collaborator CPF válido + PUT com o MESMO cpf (campo sensível, não-editável);
PAG aceita 400; `meta.total`; `?type=invalido` na URL; `adminUserId` via getEnvVar; asserção de contractor
com `bru.getEnvVar`. **Resultado: 172/172 requests, 295/295 testes — exit 0.**

### Achados laterais (candidatos a ticket — NÃO bloqueiam)
- **POST /contracts não retorna header `Location`** (201 com `{id}` só no body). Boa prática REST sugere
  `Location: /api/v2/contracts/:id`. Melhoria de produto (ticket próprio).
- **Naming de paginação divergente**: contracts `meta.total`; users `meta.totalItems`; partners
  `meta.itemCount/totalItems`. Harmonizar (ticket próprio).
