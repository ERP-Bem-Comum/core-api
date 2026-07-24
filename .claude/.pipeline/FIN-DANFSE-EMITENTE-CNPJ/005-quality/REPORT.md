# W3 — gate de qualidade — FIN-DANFSE-EMITENTE-CNPJ

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm exec eslint <native-pdf + test>` | ✅ 0 erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4418 tests · 4398 pass · **0 fail** · 20 skip |

- `structureText(DANFSe)` → `supplier.taxId = '64894238000190'` (emitente, 14 dígitos; não o tomador) +
  `legalName` sem o IM — 2 casos verdes (gabarito = nota fictícia da P.O.).
- E2E adicional no PDF real (leitor completo `unpdf`): `{legalName:'ALESSANDRA CASTRO DE OLIVEIRA',
  taxId:'64894238000190'}`. Sem regressão nos readers.

Roda no `pnpm test` puro (unpdf in-process). Com o #560 (já na dev), o `taxId` agora resolve → fornecedor
pré-selecionado (se cadastrado + driver mysql + front binda).
