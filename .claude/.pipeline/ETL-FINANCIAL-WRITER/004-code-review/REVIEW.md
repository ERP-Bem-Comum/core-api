# W2 — Review (ETL-FINANCIAL-WRITER)

## Round 1: REJECTED
2 MAJOR (janela save→mark duplicaria em re-run parcial; extras do artefato ausentes),
2 MEDIUM (singleApprover sem generalização; mark sem blindagem), 4 MINOR (contadores
pré-mark; e-mail ambíguo last-wins; sem in-memory; sem statusDivergence/teste resume).

## Round 2: APPROVED
Todas verificadas NO CÓDIGO pelo revisor (que reproduziu lint/prettier/22 testes e
conferiu os nomes de coluna contra o schema.yaml do dump real). Sugestões R2 aplicadas
pós-veredito: resume-approve na adoção no MESMO run + statusDivergence no registro;
match de órfão refinado com grossValueCents (identifierCode repete 15/52); asserts dos
extras (valueMismatchCents no mapper; legacyCategorization/legacyInstallments/
orphan-approval na integração — fixture ganhou a aprovação órfã); nits de doc.
Follow-ups registrados: teste E2E do resume pós-crash (8a); runbook "revisar
adoptedOrphan:true antes de aceitar a carga".
