# Ticket CTR-AGG-AMENDMENT: Agregado `Amendment` (Aditivo Contratual)

> **Idioma:** documentação em PT. Identificadores em EN (regra invariante).

## Contexto

Aditivos são **eventos formais de alteração contratual** ([`handbook/domain/contratos/04-aditivos-context.md`](../../../../../handbook/domain/contratos/04-aditivos-context.md)). Sem aditivos homologados, o estado vigente de um `Contract` é igual ao original — não dá pra mudar valor nem prazo.

O agregado `Amendment` modela o **ciclo de vida da intenção de mudança**:

```
[Criar Aditivo] → Pending → [Anexar PDF assinado] → Pending (com doc) → [Homologar] → Homologated
```

A homologação dispara, via use case (próximo ticket), o `Contract.applyHomologatedAdjustment` que **muda** o estado vigente.

> **Tradução PT/EN do handbook:**
> - "Aditivo" → `Amendment`
> - "TipoAditivo: Acréscimo / Supressão / Prazo / Variado" → `AmendmentKind: 'Addition' | 'Suppression' | 'TermChange' | 'Misc'`
> - "StatusAditivo: Pendente / Homologado" → `AmendmentStatus: 'Pending' | 'Homologated'`
> - "valorImpacto" → `impactValue`
> - "novaDataFim" → `newEndDate`
> - "arquivoAssinadoRef" → `signedDocumentRef`
> - "dataHomologacao" → `homologatedAt`
> - "usuarioHomologacao" → `homologatedBy`
> - "AditivoRegistrado" → `AmendmentCreated`
> - "DocumentoAditivoAnexado" → `AmendmentDocumentAttached`
> - "AditivoHomologado" → `AmendmentHomologated`

## Escopo

- `src/modules/contracts/domain/shared/ids.ts` — **adicionar** `UserRef` branded (sem `generate`, só `rehydrate` — ID vem do auth externo).
- `src/modules/contracts/domain/amendment/types.ts` — `Amendment` (branded, base + variant), `AmendmentStatus`, `AmendmentKind`, `CreateAmendmentInput`.
- `src/modules/contracts/domain/amendment/events.ts` — `AmendmentEvent` (DU 3 variantes).
- `src/modules/contracts/domain/amendment/errors.ts` — `AmendmentError` (string literal union).
- `src/modules/contracts/domain/amendment/amendment.ts` — funções de domínio + `toContractAdjustment` (tradutor para a linguagem do `Contract`).
- `tests/modules/contracts/domain/amendment/amendment.test.ts` — testes.
- `tests/modules/contracts/domain/shared/ids.test.ts` — **estender** com testes de `UserRef`.

## Fora de escopo

- **Use case `homologateAmendment`** — próximo ticket `CTR-USECASE-HOMOLOGATE-AMENDMENT`, requer Ports (Repository, EventBus) que ainda não existem.
- **R4 do handbook** ("não homologar com data retroativa ao Contract Mãe") — depende de cruzamento com Contract, fica no use case.
- **R5** ("Numeração `AD NN-NNN/AAAA`") — formato livre no MVP (validador de regex pode entrar em ticket próprio quando regra real for confirmada).
- **Workflows multi-step de aprovação** (revisor → aprovador → homologador) — fora do MVP. Single-step com role implícito ('Gestor' do handbook).

## Decisões de design

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | `Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>` (intersection de base + variant DU) | Campos compartilhados ficam top-level (id, contractId, amendmentNumber, status, etc.); campos variantes ficam no DU (`impactValue` só em Addition/Suppression; `newEndDate` só em TermChange). Sem optional fields. |
| D2 | `AmendmentKind: 'Addition' \| 'Suppression' \| 'TermChange' \| 'Misc'` | 4 tipos do handbook, EN. |
| D3 | `AmendmentStatus: 'Pending' \| 'Homologated'` | 2 estados do MVP. Estados intermediários (Rascunho, Rejeitado, Cancelado) ficam para v2. |
| D4 | 4 comandos: `create`, `attachSignedDocument`, `homologate`, `toContractAdjustment` | `toContractAdjustment` é função pura de tradução para a linguagem do `Contract` — vive no namespace `Amendment` (sem ports). |
| D5 | `UserRef = Brand<string, 'UserRef'>` em `shared/ids.ts`, com **só** `rehydrate` (sem `generate`) | Identidade externa (auth service); domínio não gera, só valida. |
| D6 | `signedDocumentRef: DocumentId \| null` no top-level (não no DU) | É campo que existe em todas as variantes; o que muda é se está preenchido (Pending sem doc) ou não. |
| D7 | `homologatedAt`/`homologatedBy` `null` enquanto `Pending` | State-dependent fields são `null`; quando passa a Homologated, ambos são preenchidos. |
| D8 | `impactValue: Money` em Addition/Suppression sempre positivo | `Money` já garante. Sinal é semântica do `kind`. |
| D9 | `Addition`/`Suppression` com `impactValue.cents === 0` rejeitado | Aditivo de valor zero é noop conceitual — não tem propósito. |
| D10 | Comandos retornam `Result<{ amendment, event }, AmendmentError>` (padrão do Contract) | Consistência arquitetural. |
| D11 | `toContractAdjustment` retorna `ContractAdjustment` direto (sem Result) | Tradução pura, não pode falhar. Pré-condição: Amendment Homologated (TS não força em compile-time; comentar como invariante de chamada). |

## Critérios de aceite

### `Amendment.create(input)`

#### Addition / Suppression
- [ ] Input válido (`impactValue > 0`) → `Ok({ amendment: { status: 'Pending', signedDocumentRef: null, homologatedAt: null, homologatedBy: null, ... }, event: AmendmentCreated })`.
- [ ] `impactValue.cents === 0` → `Err('amendment-impact-value-zero')`.

#### TermChange
- [ ] `newEndDate` válida → `Ok`.
- [ ] `newEndDate` inválida (NaN) → `Err('amendment-invalid-new-end-date')`.

#### Misc
- [ ] Input válido → `Ok` (sem `impactValue` nem `newEndDate`).

#### Validações comuns
- [ ] Empty `amendmentNumber` → `Err('amendment-number-required')`.
- [ ] Empty `description` (após trim) → `Err('amendment-description-required')`.
- [ ] Invalid `createdAt` → `Err('amendment-invalid-created-at')`.

### `Amendment.attachSignedDocument(amendment, docId)`

- [ ] Amendment `Pending` sem documento → `Ok({ amendment: { signedDocumentRef: docId }, event: AmendmentDocumentAttached })`.
- [ ] Amendment já com documento anexado → `Err('amendment-document-already-attached')`.
- [ ] Amendment `Homologated` → `Err('amendment-not-pending')`.

### `Amendment.homologate(amendment, by, at)`

- [ ] Amendment `Pending` **com** `signedDocumentRef` → `Ok({ amendment: { status: 'Homologated', homologatedAt: at, homologatedBy: by }, event: AmendmentHomologated })`.
- [ ] Amendment `Pending` **sem** `signedDocumentRef` → `Err('amendment-without-signed-document')`.
- [ ] Amendment `Homologated` → `Err('amendment-not-pending')`.
- [ ] Invalid `at` → `Err('amendment-invalid-event-date')`.

### `Amendment.toContractAdjustment(amendment): ContractAdjustment`

- [ ] `kind: 'Addition'` → `{ kind: 'ValueIncrease', amount: impactValue, amendmentId }`.
- [ ] `kind: 'Suppression'` → `{ kind: 'ValueDecrease', amount: impactValue, amendmentId }`.
- [ ] `kind: 'TermChange'` → `{ kind: 'PeriodExtension', newEnd: newEndDate, amendmentId }`.
- [ ] `kind: 'Misc'` → `{ kind: 'Acknowledgment', amendmentId }`.

### Tipagem (compile-time)

- [ ] Discriminated union estrita — `Amendment` com `kind: 'Misc'` não tem `impactValue` acessível.
- [ ] `Amendment.toContractAdjustment` exhaustive switch com `never` no default.

## Referências

- [`handbook/domain/contratos/04-aditivos-context.md`](../../../../../handbook/domain/contratos/04-aditivos-context.md) §3-7 (entidade, comandos, eventos, invariantes).
- [`.claude/skills/ts-domain-modeler/references/ts-discriminated-unions.md`](../../skills/ts-domain-modeler/references/ts-discriminated-unions.md).
- Tickets anteriores: [CTR-AGG-CONTRACT](../CTR-AGG-CONTRACT/STATE.md) — padrão de comando + event, `as unknown as`, `assert*` helpers.
