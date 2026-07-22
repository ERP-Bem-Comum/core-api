# W0 — testes RED (ETL-FINANCIAL-WRITER)

tests/etl/financial/mapper.test.ts: 15 casos fixando o contrato do mapper —
conta-cedente (Bradesco→237, convenio LEGADO/D6, agência F7 preservada, opening
balance), vocabulário D7 (NOTA FISCAL→NFS-e, FATURA→Fatura, BOLETO→Boleto,
LANÇADO/EM APROVAÇÃO→open, APROVADO→approved), approvedAt histórico com fallback
updatedAt (F2), remaps (supplier/contract/cedente) com quarentenas, defeitos de
origem F3/F4→draft, F5→ExcludedByDecision (R-1), F6→retention_type, competência.

RED por inexistência do módulo scripts/etl/financial/mapper.ts (ERR_MODULE_NOT_FOUND).
Especialista do domínio financeiro consultado em paralelo p/ validar o design
contra o código real (save/approve/cedente/idempotência) antes do W1.
