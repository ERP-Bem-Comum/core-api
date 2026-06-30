# W0 — Testes RED · FIN-RECON-ENTRYTYPE-UNION

**Skill:** tdd-strategist · **Resultado:** RED (falha por inexistência da API + valores divergentes).

## Testes escritos (mirror de `src/`)

| Camada | Arquivo | Casos novos | Por que falha (RED legítimo) |
| --- | --- | --- | --- |
| Domínio | `tests/…/domain/statement/entry-type.test.ts` (novo) | `VALUES`, `normalize` (CA1/CA2 + idempotência), `rehydrate` (válido + CA4 base) | `entry-type.ts` não existe → `ERR_MODULE_NOT_FOUND` |
| Adapter/mapper | `tests/…/persistence/mappers/statement.mapper.test.ts` (+1 `it`) | CA4: `toDomain` rejeita `entry_type` fora do union → `err('invalid-statement-entry-type')` | hoje `toDomain` passa `entry_type` cru sem validar → retorna `ok` |
| Adapter/parser | `tests/…/statement-parsers/ofx-parser.test.ts` (+1 `it`) | CA2: `TRNTYPE` bruto normalizado (`FEE→Fee`, `PIX→PIX`, `XFER→Transfer`, `XPTO→Other`) | hoje OFX repassa cru uppercase (`FEE`, não `Fee`) |
| Adapter/parser | `tests/…/statement-parsers/csv-parser.test.ts` (+1 `it`) | CA2: coluna `tipo` normalizada (`TARIFA→Fee`, `TRANSFERENCIA→Transfer`, `XPTO→Other`) | hoje CSV repassa cru uppercase (`TARIFA`, não `Fee`) |

## Saída (resumo)

```
✖ CA4: toDomain rejeita entry_type fora do union vindo do banco
✖ CA2 (#159): coluna tipo é normalizada p/ o union EntryType (fallback Other)   [csv]
✖ CA2 (#159): TRNTYPE bruto é normalizado p/ o union EntryType (fallback Other) [ofx]
✖ entry-type.test.ts → ERR_MODULE_NOT_FOUND src/.../domain/statement/entry-type.ts
```

Testes pré-existentes do extrato (CA5 round-trip do mapper, CA1/CA3/CA4 dos parsers) permanecem **verdes** — RED isolado nos casos novos.

## Conjunto canônico (âncora — spec 017)

`EntryType = 'PIX'|'TED'|'DOC'|'Fee'|'Boleto'|'DARF'|'Investment'|'Redemption'|'Transfer'|'Other'`
(`data-model.md:37` e `:122`; siglas BR preservam caixa — `:96`).

## Pendências para W1

- VO `domain/statement/entry-type.ts` (namespace pattern, como `fitid.ts`): `EntryType`, `EntryTypeError='invalid-entry-type'`, `VALUES`, `normalize(raw)`, `rehydrate(raw)`.
- Fechar `entryType: EntryType` em `types.ts:19` e `:42`; parsers chamam `normalize`; mapper `toDomain` chama `rehydrate` (novo erro `invalid-statement-entry-type` em `StatementMapperError`).
- Schema: CHECK `fin_statement_transactions_entry_type_chk` + `varchar(16)` + atualizar comentário `:540`.
- Migration `0013` (faixa pré-alocada) + **teste de integração Docker** do CHECK (CA5) atrás de opt-in `*_INTEGRATION`.
