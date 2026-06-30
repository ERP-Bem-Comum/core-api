# FIN-DOCUMENT-TYPE-METADATA — escopo

> Issue #292 (sub-issue da #89 "Lançar Documento"). Módulo **financial**. Size **M**.
> Pipeline W0→W3. Catálogo **estático** de metadados por tipo de documento, exposto read-only.

## Objetivo

Expor um **catálogo de metadados por tipo de documento** que o front consulte para montar o
formulário de lançamento dinamicamente. Para cada `DocumentType` (NFS-e/DANFE/RPA/Fatura/Boleto/
Recibo/**Imposto**), descreve: **retenções habilitadas**, **campos extras** (obrigatório/opcional) e
**forma de pagamento sugerida**.

## Decisão de design (registrada)

**Catálogo ESTÁTICO no domínio** (constante derivada das regras existentes), **não persistido**.
- Metadados por tipo são **regra de negócio fixa**, não dado configurável pelo cliente.
- Precedente exato: `ALLOWED_RETENTIONS` (`domain/document/document.ts:72`) já é um mapa estático
  puro no domínio. A regra do `accessKey` obrigatório para DANFE (`document.ts:156`) é a outra fonte.
- YAGNI: zero tabela/migration/seed (≠ Category/CostCenter, que são dado de referência persistido).
- **Fonte única:** o catálogo REUSA `ALLOWED_RETENTIONS` (não duplica) — extraí-lo do `document.ts`
  para um módulo de domínio compartilhável se necessário, mantendo o agregado como consumidor.

## Escopo (in)

1. **Domínio** (`domain/document/document-type-metadata.ts`): `DocumentTypeMetadata { type, allowedRetentions: readonly RetentionType[], accessKeyRequired: boolean, suggestedPaymentMethod: PaymentMethod | null }` + `metadataFor(type): DocumentTypeMetadata` (puro, derivado das regras existentes) + `allMetadata(): readonly DocumentTypeMetadata[]`.
   - `allowedRetentions`: de `ALLOWED_RETENTIONS` (NFS-e/RPA = 4 retenções; demais = []).
   - `accessKeyRequired`: `true` só para DANFE (espelha `document.ts:156`).
   - `suggestedPaymentMethod`: **novo** — só onde óbvio (`Boleto → 'Boleto'`, `Imposto → 'GuiaRecolhimento'`); `null` nos demais (front usa default próprio).
2. **Borda** (`adapters/http`): `GET /financial/document-types/metadata` (lista) — espelha o molde read-only de `GET /financial/categories` (`plugin.ts:1058-1101`), permissão `reference:read`. Schema Zod de resposta + DTO mapper. (`GET /financial/document-types/:type/metadata` opcional — avaliar no W1; lista já atende o front.)

## Fora de escopo

- **Persistência** (tabela/migration/seed) — catálogo é estático.
- Mudar a validação do agregado (retenções/accessKey já enforçadas no domínio — o catálogo só *expõe* a regra, não a duplica nem altera).
- `competencia`/`paymentDetail`/`debitAccountRef` como "campos por tipo" — são universais (sem condicional por tipo); não entram no catálogo como type-specific.
- Inventar `suggestedPaymentMethod` para tipos sem mapeamento óbvio (fica `null`).

## Critérios de aceite

- **CA1** `metadataFor('NFS-e')` → `allowedRetentions = [ISS,IRRF,INSS,CSRF]`, `accessKeyRequired = false`.
- **CA2** `metadataFor('DANFE')` → `allowedRetentions = []`, `accessKeyRequired = true`.
- **CA3** `metadataFor('Boleto')` → `allowedRetentions = []`, `suggestedPaymentMethod = 'Boleto'`.
- **CA4** `metadataFor('Imposto')` → `suggestedPaymentMethod = 'GuiaRecolhimento'`.
- **CA5** `allMetadata()` cobre os **7** tipos (sem faltar/duplicar) — exhaustividade garantida pelo compilador.
- **CA6** (borda) `GET /financial/document-types/metadata` (autenticado, `reference:read`) → 200 com a lista; sem permissão → 403.
- **CA7** coerência: `allowedRetentions` do catálogo == `ALLOWED_RETENTIONS` do agregado (mesma fonte; um teste cruza para garantir que não divergem).

## Pipeline pré-estruturada (agentes por wave)

| Wave | Atividade | Especialista |
| :--- | :--- | :--- |
| W0 | testes RED (domínio CA1–CA5/CA7 + rota CA6) | skill **`tdd-strategist`** |
| W1 | catálogo no domínio (`document-type-metadata.ts`) | skill **`ts-domain-modeler`** |
| W1 | endpoint `GET` + schema Zod + DTO | agente **`fastify-server-expert`** ↔ **`zod-expert`** |
| W2 | audit read-only | skill **`code-reviewer`** |
| W3 | gate (`typecheck`+`format`+`lint`+`test`) | skill **`ts-quality-checker`** |

## Definition of Done

Gate W3 verde. Catálogo cobre os 7 tipos, sem divergir de `ALLOWED_RETENTIONS` (CA7). Endpoint
read-only sob `reference:read`. Sem migration/schema. Zero regressão.
