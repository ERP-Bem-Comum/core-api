# W2 — Code Review (read-only audit)

**Veredito:** APPROVED (1 achado corrigido durante a wave).

## Escopo auditado

Vertical completa do Acordo de Cooperação Técnica (domínio → persistência → application →
HTTP → export → contractor-view → seed). 6 commits (camadas 1–5 + ajuste W2).

## Achado #1 — DRY: predicado de filtro duplicado (corrigido)

- **Onde:** `adapters/http/act-list-query.ts` definia um `matchesFilter` + `ActExportFilter`
  próprios, enquanto `application/use-cases/list-acts.ts` já expunha `actMatchesFilter` +
  `ActListFilter` com a mesma lógica.
- **Por quê é problema:** diverge do padrão canônico do projeto — `supplier-list-query.ts`
  **reusa** `supplierMatchesFilter` do use case (fonte única). Além disso, o comentário em
  `list-acts.ts` ("reusada pela borda HTTP") ficava falso.
- **Correção:** `act-list-query.ts` passou a importar `actMatchesFilter`/`ActListFilter` de
  `list-acts.ts`; `act-plugin.ts` importa `actMatchesFilter` do use case. Predicado único.
  Commit `dcd16c7`.

## Itens verificados (conformidade)

- **Domínio puro** (`.claude/rules/domain.md`): sem `throw`/`class`/`any`; `Result<T,E>`;
  branded (`ActNumber`); `immutable`; switch exaustivo no CSV/mapper. ✓
- **Regra de repasse condicional** (CA2): imposta no domínio (`buildFields`) E no schema
  (CHECK `par_acts_payment_target_chk`). ✓
- **ADR-0020:** sem ENUM nativo (varchar + CHECK), sem JSON (payment target/validity
  achatados), sem AUTO_INCREMENT em PK; `cnpj` varchar(14) COLLATE bin; `validity` em colunas
  `date`. ✓
- **ADR-0006 (cross-módulo):** `ActView` mantém shape estável; `document=CNPJ`,
  `role=legalRepresentative`. Suíte de contracts verde (CA6). ✓
- **ADR-0014:** só tabelas `par_*`. ✓
- **Idioma:** código EN, docs PT, erros kebab EN (`act-number-required`,
  `act-payment-target-required`), eventos PascalCase passado. ✓
- **Migration (D3):** `0008` DROP+CREATE; snapshot validado por `db:generate`
  (nothing to migrate). ✓

## Observações não-bloqueantes (aceitas)

- `rehydrate` reusa `act-already-inactive` para estado corrompido (Inactive sem
  deactivatedAt); o mapper traduz para `act-mapper-invalid-state`. Padrão herdado, aceito.
- Eventos (`ActRegistered/...`) emitidos mas não publicados (sem outbox nesta fase) — conforme
  épico §7 e `repository.ts`.
- `actToInsert`: ramo Indefinite da vigência é inalcançável (Act sempre Fixed) — comentado.
