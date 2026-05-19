# Estado do Ticket CTR-CLI-MVP

| Wave | Status |
| :--- | :--- |
| W0 — RED | ✅ |
| W1 — GREEN | ✅ — 197/197 testes verdes + smoke-test ponta-a-ponta da CLI funcionou |
| W2 — REVIEW | ✅ APPROVED |
| W3 — QUALITY | ✅ ALL GREEN |

## 🎉 Ticket FECHADO — P.O. pode brincar pelo terminal

### Artefatos (12 arquivos novos)

```
src/modules/contracts/cli/
├── main.ts                       Entry point + dispatcher
├── context.ts                    Build InMemory + persistência
├── state.ts                      load/save JSON com reviver de Date
├── parse-flags.ts                Parser --flag value / --flag=value
├── format.ts                     Money/Period/Date/Status/Errors em PT-BR
├── registry.ts                   Subcomando → handler
└── commands/
    ├── criar-contrato.ts         Cria Contract Ativo
    ├── listar-contratos.ts       Lista
    ├── mostrar-contrato.ts       Detalhes por ID
    ├── criar-aditivo.ts          Cria Amendment Pending
    ├── anexar-documento.ts       Anexa signedDocumentRef
    └── homologar-aditivo.ts      Orquestra Contract+Amendment via use case

tests/modules/contracts/cli/
├── format.test.ts                16 testes
└── parse-flags.test.ts           6 testes
```

### Demo executado com sucesso

```bash
$ pnpm cli:contracts criar-contrato --numero 001/2026 --titulo ... --valor-centavos 10000000 ...
✅ Contrato 001/2026 criado. Valor vigente: R$ 100.000,00

$ pnpm cli:contracts criar-aditivo --contrato <id> --tipo Addition --valor-centavos 500000 ...
✅ Aditivo AD 01-001/2026 em Pendente. Valor de impacto: R$ 5.000,00. Documento anexado: não

$ pnpm cli:contracts anexar-documento --aditivo <id> --documento <uuid>
✅ Documento assinado anexado.

$ pnpm cli:contracts homologar-aditivo --aditivo <id> --contrato <id> --usuario <uuid>
✅ Aditivo homologado. Valor vigente: R$ 105.000,00. Status: Ativo

$ pnpm cli:contracts listar-contratos
1 contrato(s):
  - 001/2026 [Ativo] R$ 105.000,00
```

**Erros traduzidos para humano**, exit codes UNIX-style (0/1/64), stdout/stderr separados.

### Padrões aplicados

- **Persistência default** em `./cli-state.json`, com flag `--no-state` para ephemeral.
- **`JSON.stringify` cru + reviver de `Date`** — solução pragmática para MVP. Branded types são `string`/`number`/`object` em runtime, transparentes.
- **Dicionário de erros PT-BR** em `format.ts` cobrindo todos os 40+ códigos.
- **Cada `command/<verbo-objeto>.ts`** é autocontido: parse → validate → call use-case → format → exit code.
- **Smoke test manual** comprovou fluxo end-to-end. Testes unitários cobrem `format` + `parse-flags` (funções puras).

### Próximos passos (fora deste ticket)

- **`CTR-CLI-INTEGRATION-TESTS`** — testes ponta-a-ponta via `child_process.spawn` (Fase 2).
- **`CTR-ADAPTER-MYSQL`** — implementar `ContractRepository` real com Drizzle + MySQL.
- **`CTR-HTTP-NESTJS`** — exposição HTTP via NestJS no `core-api`.
- **`CHORE-CLAUDE-EN-MIGRATION`** — pendência paralela de skills.
