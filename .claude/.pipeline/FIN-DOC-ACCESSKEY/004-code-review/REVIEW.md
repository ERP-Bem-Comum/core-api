# W2 — Code Review · FIN-DOC-ACCESSKEY (#115)

**Veredito:** ✅ APPROVED

- Invariante DANFE⇒chave no **domínio** (`Document.create`), não só na borda — fonte de verdade correta; erro → 422.
- Normalização na borda (remove não-dígitos) + validação de formato no domínio: separação limpa.
- `accessKey` propagado por toda a cadeia (create + draft + undo-approval) de forma simétrica; migration aditiva nullable.
- Slugs EN kebab + mensagens PT-BR; sem `any`/`as` indevido.
- Regressão de contrato (CT-006) atualizada, não suprimida.
- Não-objetivos respeitados (não valida DV/estrutura interna da chave).
