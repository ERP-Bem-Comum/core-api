# ETL-FINANCIAL-WRITER — writer domain-driven do financeiro legado (payables → Documentos)

## Contexto

Última onda da migração priorizada pela P.O. Fonte: `abc-erp-financeiro-prod` (52 payables,
74 installments, 49 approvals, 5 accounts). Mapa oficial: ADR-0048 (Mapas B/C) + decisões
D7/D8/(c) ratificadas + D11 resolvida por dados. Evidências de origem em
`bem_comum/database/prod_dump/auditoria-transformacoes-legado.md` §5. Insumos: de-para de
contratos/programas (`x99:~/migracao-db/artefatos/de-para-contratos-programas.jsonl`),
suppliers migrados (remap via `partnersEtlPort.findByLegacyId`).

## Fluxo (100% via domínio)

1. **Cedentes**: 5 `accounts` → `createCedenteAccount` (use case): `bankCode='237'`
   (legado: string 'BRADESCO'), agência preservada ('0288-7' — DV embutido é defeito de
   origem F7), `convenio='LEGADO'` (placeholder D6, auditado), `nickname=name`,
   `openingBalance` de `initialBalance`+`createdAt`. Idempotente por chave natural
   (banco+agência+conta+dv → 'cedente-account-duplicate' = alreadyExists).
2. **Aprovador (D11)**: join determinístico `approvals.collaboratorId(=4, único) →
   collaborators.email → users` (1 match exato) → `authEtlPort.provisionLegacyUser`
   (idempotente; retorna userRef sem duplicar) = `approvedBy`.
3. **Payables → Documentos**:
   - Allowlist (decisão c): ids 45/46 (parcelamento de teste, F5) → `ExcludedByDecision`
     (decisionRef R-1/ADR-0048).
   - Incompletos p/ Open: liq<=0 (ids 7, 17 — F3) ou sem dueDate (id 40 — F4) →
     `saveDraft` (nasce Draft, auditado no de-para com motivo).
   - Com retenção sem tipo (ids 47-51 — F6): quarentena `RequiredFieldMissing
     retention_type` até o financeiro informar (D7).
   - Demais: `saveDocument` (Open) com: documentNumber=identifierCode; type NOTA
     FISCAL→'NFS-e', FATURA→'Fatura'; paymentMethod BOLETO/PIX/TED→Boleto/PIX/TED;
     payeeKind='supplier' + supplierRef remap; contractRef via de-para (legados 2/4/39);
     programRef via de-para; category/costCenter null + vínculo legado no artefato (D9);
     grossValueCents=round(totalValue*100); dueDate; competencia de competence_date;
     barcode→paymentDetail; obs→description; SEM approverRef e SEM reader de alçada
     (gate opt-in desligado — migração não re-valida alçada histórica).
   - `payableStatus='APROVADO'` → `approveDocument` (expectedVersion=0, approvedBy do
     passo 2, Clock injetado `ClockFixed(approval.createdAt)` p/ approvedAt histórico).
     F2: 12 payables LANÇADO com approval órfã → ficam Open; aprovação órfã no artefato.
4. **Idempotência**: documentNumber é o candidato natural (52/52 preenchidos) — verificar
   unicidade no dump; lookup por... `fin_documents` não tem findByDocumentNumber único
   garantido → estratégia: consultar por documentNumber via port de leitura disponível OU
   de-para prévio; decidir no W1 com o código real (critério: re-run → alreadyExists,
   zero duplicata, zero re-emissão de outbox).
5. **Artefatos**: de-para payable→documentId/payableIds + extras (categorização legada,
   aprovações órfãs, recorrência F-recurrent, installments de conferência) + quarentena
   dupla, truncados por run (padrão do contracts writer).
6. **Reconciliação**: soma líquida dos migrados vs legado (R$ 2.144.482,21 − exclusões/
   quarentenas, valores exatos no relatório); balanço read=migrated+quarantined+alreadyExists.

## Fora de escopo (registrado)

- fin_payable_view (rodar job payable-view-backfill após a carga — já existe).
- Tipos das 5 retenções (D7 — insumo do financeiro); convênios reais (D6); D9 (seed
  de categorias); recorrência (sem equivalente — artefato).

## Critério de aceite

W0 RED; W3 verde; dry-run + carga real no lab com: 5 cedentes; 52 payables = N docs
(Open+Approved+Draft) + 2 ExcludedByDecision + 5 retention_type + balanço fechado; soma
líquida exata dos migrados; idempotência 2×; integração full-cycle gated no molde do
contracts writer.

## Adendo pós-consulta ao especialista de domínio (W0→W1)

Incorporações ao design (validadas contra o código, arquivo:linha no parecer):
1. `createCedenteAccount` exige `document` (CNPJ do cedente) — writer recebe via env
   `ETL_CEDENTE_DOCUMENT` (lab: placeholder 'PENDENTE-D6', auditado).
2. `openingBalanceCents`+`openingBalanceDate` ('YYYY-MM-DD') são par coeso — sempre juntos.
3. `saveDocument` deps: `contractCategorizationReader` = STUB ok(null) (fiel ao legado/D9 —
   sem herdar categorização do contrato novo); `cedenteAccountStore` = real (valida conta ativa).
4. ClockFixed POR DOCUMENTO nos DOIS use cases: save (timeline DocumentSaved histórica,
   clock=createdAt legado) e approve (approvedAt=approval.createdAt).
5. IDEMPOTÊNCIA (resolve item 4): adicionar `findByDocumentNumber` ao DocumentRepository
   (port + drizzle sobre índice existente + in-memory), padrão findBySequentialNumber do
   contracts. Writer: lista vazia→migra; match refinado por supplierRef→alreadyExists;
   re-run parcial: doc Open com plano approved → re-approve usando version REAL (findById),
   nunca 0 hardcoded. Pré-condição: unicidade de identifierCode no dump (verificar).
   NÃO promover o índice a UNIQUE (números repetem entre fornecedores em uso orgânico).
6. Pós-carga: rodar payable-view-backfill (worker desligado no lab durante a carga).
