# W1 — GREEN · PARTNERS-COLLABORATOR-CSV

**Skill:** application-cli-builder (adapter de apresentação) · **Resultado:** GREEN (9/9)

## Arquivo criado

`src/modules/partners/adapters/export/collaborator-csv.ts` — `collaboratorsToCsv(collaborators): string`
+ projeção `collaboratorToCells(c)` (switch exaustivo por `status`). 26 colunas em ordem fixa. Delega
escape/BOM/RFC 4180 a `toCsv` de `#src/shared/utils/csv.ts` (zero mecânica local).

## Decisões de design

- **Helpers `isoOrEmpty`/`boolOrEmpty`** — datas nullable → ISO 8601 ou `''`; boolean nullable →
  `'true'`/`'false'`/`''`. Pessoais string nullable → `?? ''`.
- **`disableBy`/`deactivatedAt` discriminados por `status`** (switch sem `default`): vazios em `Active`,
  preenchidos em `Inactive` — o TS estreita o tipo dentro de cada `case`.
- **`cpf` via `String(c.cpf)`** (branded string normalizada, 11 dígitos).

## Ajuste no teste (W0)

O fixture `completeInput().completeAddress` tinha vírgula (`'Rua das Flores, 123'`). A implementação cita
corretamente (`"Rua das Flores, 123"`), mas o `.split(',')` ingênuo do teste quebrava a célula e deslocava
os índices > 17 — **artefato do assert por índice, não bug**. Removida a vírgula do fixture (`'Rua das Flores 123'`);
a verificação de escape de vírgula permanece no bloco "projeção alimenta o escape do util".

## Confirmação GREEN

```
ℹ tests 9 · pass 9 · fail 0
```
