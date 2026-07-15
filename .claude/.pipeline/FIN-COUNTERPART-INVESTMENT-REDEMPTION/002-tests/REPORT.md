# W0 — REPORT (RED) · FIN-COUNTERPART-INVESTMENT-REDEMPTION (#428)

> Wave 0 (fail-first). Skill: `tdd-strategist`. Estende a criação da **contrapartida esperada** da
> conciliação de só `type='Transfer'` para **`Investment`** e **`Redemption`** quando há
> `destinationAccountRef`. O movimento esperado no destino segue agnóstico ao tipo
> (`opposite(transaction.movement)`); mudam a abrangência do guard, o `type` propagado e o CHECK/mapper.
> **Nenhum arquivo `src/` tocado** (anti-padrão #3 respeitado).

## Arquivos alterados (todos sob `tests/`)

| Arquivo | Mudança |
| :-- | :-- |
| `tests/modules/financial/application/use-cases/record-manual-entry-counterpart.test.ts` | **Invertido** o antigo "só Transfer cria contrapartida" → Investment/Redemption + destino **criam**; adicionadas não-regressões CA3 (Transfer mantém; Payment com destino e FeePenaltyInterest sem destino **não** criam). `txOf` ganhou parâmetro `movement`. |
| `tests/modules/financial/domain/expected-counterpart/create.test.ts` | `baseInput` passa `type` (default `'Transfer'`); 2 casos novos Investment/Redemption assertando propagação do `type` ao agregado (movimento oposto agnóstico). |
| `tests/modules/financial/adapters/persistence/expected-counterpart-store.drizzle-mysql.test.ts` | 2 casos gated (`MYSQL_INTEGRATION`) de round-trip Investment/Redemption (save + findById/listPending) — CA5 (migration do CHECK + mapper `toType`). Helper `buildTypedCounterpart`. |
| `tests/modules/financial/application/use-cases/confirm-counterpart-match.test.ts` | `buildWorld` parametrizado por `counterpartType`; 1 caso novo CA4 assertando que a perna espelho B nasce com o **tipo real** da contrapartida (não `'Transfer'` fixo). |

Manifesto `scripts/ci/test-integration.ts`: **sem alteração** — o arquivo de integração já está registrado na suíte `financial` (linha 116). Os casos novos foram adicionados ao arquivo existente, então não há teste órfão.

## Mapa CA → teste

| CA (#428) | Teste | Camada / arquivo | Estado W0 |
| :-- | :-- | :-- | :-- |
| CA1 (Investment cria contrapartida `Pending`, movimento oposto, valor espelhado) | `CA1(#428): Investment + destino → 1 contrapartida Pending type=Investment` | application unit · record-manual-entry-counterpart | **RED** (`0 !== 1`, guard não abre) |
| CA2 (Redemption idem, origem Credit → movimento Debit) | `CA2(#428): Redemption + destino → 1 contrapartida Pending type=Redemption` | application unit · record-manual-entry-counterpart | **RED** (`0 !== 1`) |
| CA3 não-regressão (Transfer mantém; Payment/FeePenaltyInterest/sem-destino não criam) | `CA3(não-regressão): Transfer …` · `… sem destinationAccountRef …` · `… Payment mesmo COM destino …` | application unit · record-manual-entry-counterpart | **GREEN** (comportamento a preservar) |
| CA1/CA2 (propagação do `type` no domínio) | `CA(#428): Investment → propaga type=Investment` · `CA(#428): Redemption → propaga type=Redemption` | domain unit · create.test | **RED** (`create` crava `'Transfer'`) |
| CA4 (perna espelho B nasce com o tipo real) | `CA4(#428): perna espelho B nasce com o tipo REAL da contrapartida (Investment)` | application unit · confirm-counterpart-match | **RED** (`'Transfer' !== 'Investment'`) |
| CA5 (persistência MySQL: migration do CHECK + mapper; sem `invalid-expected-counterpart-type`) | `CA5(#428): round-trip Investment …` · `CA5(#428): round-trip Redemption …` | integração MySQL (gated) · expected-counterpart-store.drizzle-mysql | **RED diferido** — gate `MYSQL_INTEGRATION` off no W0 (skipa limpo); vira RED real no W3 até migration+mapper |

## Prova do RED (saída real)

### 4 arquivos-alvo (`node --test`, sem `MYSQL_INTEGRATION`)

```
[financial:expected-counterpart-store] MYSQL_INTEGRATION não definido — pulando integração.
✔ tests/.../expected-counterpart-store.drizzle-mysql.test.ts (skip limpo)
✖ financial/application — confirmCounterpartMatch (US2 · #269)
✖ financial/application — recordManualEntry cria contrapartida (Transfer/Investment/Redemption · #428)
✖ financial/domain — ExpectedCounterpart.create (Transfer/Investment/Redemption · #428)
ℹ tests 15 · pass 10 · fail 5 · skipped 0
✖ failing tests:
✖ CA4(#428): perna espelho B nasce com o tipo REAL da contrapartida (Investment), não Transfer fixo
✖ CA1(#428): Investment + destino → 1 contrapartida Pending type=Investment (movement oposto)
✖ CA2(#428): Redemption + destino → 1 contrapartida Pending type=Redemption (origem Credit → movement Debit)
✖ CA(#428): Investment → propaga type=Investment ao agregado (movement oposto agnóstico)
✖ CA(#428): Redemption → propaga type=Redemption (origem Credit → movement Debit)
```

Diffs representativos (todos por **asserção de semântica ausente**, nunca import/link):

```
# domain create Investment/Redemption:  + 'Transfer'  - 'Investment' / - 'Redemption'
# record-manual-entry Investment/Redemption:  actual 0 !== expected 1  (guard type==='Transfer' não abre)
# confirm CA4 leg B:  + 'Transfer'  - 'Investment'
```

### Suíte `financial` completa (regressão zero)

```
ℹ tests 842 · pass 836 · fail 5 · skipped 1
```

As 5 falhas são exatamente os REDs #428 acima. O `skipped 1` é
`tests/modules/financial/adapters/document-reader/native-pdf-real.local.test.ts:34` (`{ skip: true }`,
fixture PDF local-only/LGPD) — **pré-existente e alheio ao #428** (não tocado). Nenhum RED colateral.

## Garantias de higiene do RED

- **Sem erro de import/link ESM.** Nenhum símbolo novo é importado — o `type` novo trafega como
  **dado** (campo de input), não como export. Por isso não foi preciso import dinâmico (precedente
  #437 não se aplica aqui).
- **Integração skipa limpo** sem `MYSQL_INTEGRATION`. Não polui `pnpm test` puro.
- **`typecheck` ficará vermelho no W0** por design (o input de `create` ainda não declara `type`;
  `ExpectedCounterpartType` ainda é só `'Transfer'`). Estado W0 esperado — W1 fecha ao implementar.

## Decisões / dúvidas para o W1

1. **Eventos (ponto 7) — reusar `TransferCounterpart*`.** Os testes de Investment/Redemption **não**
   assertam nome de evento; só o caso Transfer mantém `ev.type === 'TransferCounterpartCreated'`.
   Manter os nomes existentes (payloads já agnósticos) — renomear quebraria o outbox sem valor.
2. **⚠️ FORK DE DESIGN na perna espelho B (US2/CA4) — DECISÃO HUMANA PENDENTE.** Ao fazer o leg B
   espelhar o tipo real (Investment/Redemption), o `confirmManualEntry` do leg B passa a exigir
   `productLabel` (`investment-requires-product` — `manual-entry.ts:57-62`). O agregado
   `ExpectedCounterpart` **não carrega `productLabel`**. Opções:
   - (a) **propagar `productLabel`** pela contrapartida (campo no agregado + coluna + migration) — o
     correto conceitualmente (a perna B é a mesma operação de produto), porém expande o schema;
   - (b) **relaxar o guard** para a perna espelho gerada pelo sistema (não é entrada de usuário) — mais
     barato, mas mexe em invariante de domínio;
   - (c) placeholder de `productLabel` no mirror — remendo.
   O teste CA4 assere `manualEntry.type === 'Investment'` **e** `r.ok === true` — força o mirror a
   suceder, sem fixar o mecanismo. **Escalado ao humano antes do W1** (muda schema OU invariante).
3. **CA5 (persistência) é RED diferido.** Só roda sob `MYSQL_INTEGRATION` (validação x99/OrbStack é do
   W3). Cobre: (i) migration ampliando `fin_expected_counterpart_type_chk` para
   `IN ('Transfer','Investment','Redemption')` (ADR-0020: ampliar CHECK é DDL — validar ALTER real,
   lição MySQL 8.4); (ii) `expected-counterpart.mapper.ts:32` `toType` aceitando os 3.
4. **`ExpectedCounterpartType` (ponto 3)** ganha `'Investment' | 'Redemption'`; o guard de
   `record-manual-entry.ts:149` abre para os 3 **preservando** o fail-closed para Payment/Receipt/
   FeePenaltyInterest e ausência de destino (CA3, já GREEN, não pode regredir).
