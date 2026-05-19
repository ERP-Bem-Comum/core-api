# Estado do Ticket CTR-USECASE-CREATE-AMENDMENT

| Wave | Status |
| :--- | :--- |
| W0 | ✅ |
| W1 | ✅ — 166/166 |
| W2 | ✅ APPROVED (padrão `createContract` aplicado; helper `buildDomainInput` para variant switch) |
| W3 | ✅ ALL GREEN |

## 🎉 Ticket FECHADO

**Artefatos:**
- `src/modules/contracts/application/use-cases/create-amendment.ts` (132 linhas)
- `tests/modules/contracts/application/use-cases/create-amendment.test.ts` (157 linhas, 8 testes)

**Padrões aplicados:**
- Mesmo padrão de `createContract`, agora com **2 repos** (carrega Contract para validar existência antes de criar Amendment).
- **Discriminated union no Command** (`kind: 'Addition' | 'Suppression' | 'TermChange' | 'Misc'`) — TS força exhaustive switch no use case.
- Helper privado `buildDomainInput` separa lógica de variant — mantém o use case principal linear.
- Erro `contract-not-found` quando o contrato pai não existe; sem persistência/publicação.

**Próximo:** `CTR-USECASE-ATTACH-DOCUMENT`
