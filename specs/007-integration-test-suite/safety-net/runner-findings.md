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

**Causa:** `GET /partners?type=invalido` retorna **200** com `{ items: [], meta: {...} }`; o teste espera
**400**. Um `type` inválido devolver 200-lista-vazia (em vez de 400) pode ser **bug real** (deveria validar
o enum de type). **Ação:** confirmar com o time se `type` inválido deve dar 400; se sim, é bug do server
(ticket); se "ignora e lista vazio" é o contrato, ajustar o teste.

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
