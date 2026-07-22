# W0 — Testes (RED) · FIN-DOCUMENT-TYPE-METADATA

**Skill:** tdd-strategist (terreno mapeado por Explore)
**Data:** 2026-06-30T23:05Z
**Estado:** **RED** — o catálogo `document-type-metadata` ainda não existe.

## Arquivo (W0)
- `tests/modules/financial/domain/document/document-type-metadata.test.ts` — domínio puro:
  `metadataFor(type)` + `allMetadata()`.

## Casos
- **CA1** `NFS-e` → `allowedRetentions` = [ISS,IRRF,INSS,CSRF], `accessKeyRequired` = false.
- **CA2** `DANFE` → `allowedRetentions` = [], `accessKeyRequired` = true.
- **CA3** `Boleto` → [], `suggestedPaymentMethod` = 'Boleto'.
- **CA4** `Imposto` → `suggestedPaymentMethod` = 'GuiaRecolhimento'.
- **CA4b** `RPA` → 4 retenções.
- **CA (Fatura/Recibo)** → vazio, `accessKeyRequired` false, `suggestedPaymentMethod` null.
- **CA5** `allMetadata()` cobre os 7 tipos, sem faltar/duplicar.

## Evidência RED
```
✖ document-type-metadata.test.ts  ('test failed' — load error: módulo inexistente)
```
Padrão idiomático: `import { metadataFor }` aponta para módulo a criar no W1.

## API alvo (W1)
- `domain/document/document-type-metadata.ts`: `type DocumentTypeMetadata { type, allowedRetentions: readonly RetentionType[], accessKeyRequired: boolean, suggestedPaymentMethod: PaymentMethod | null }` + `metadataFor(type)` + `allMetadata()`.
- **REUSAR `ALLOWED_RETENTIONS`** (extrair de `document.ts:72` para fonte compartilhável; o agregado passa a consumi-la). Cross-check **CA7** (catálogo == agregado) + rota **CA6** (`GET /financial/document-types/metadata`) entram no W1.
