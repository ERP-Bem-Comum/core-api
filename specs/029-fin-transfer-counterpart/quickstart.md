# Quickstart — Contrapartida esperada (#269)

Exercita o fluxo A→B fim a fim (driver memory, `fastify.inject` — sem MySQL).

## Pré-condições

- Duas contas cedente ativas: A (origem) e B (destino).
- Uma transação `Pending` na conta A (débito da saída), importada ou lançada.

## Passos

1. **Registrar a transferência (US1)** — `POST /financial/reconciliations/manual-entry`

   ```json
   {
     "transactionId": "<tx-A>",
     "type": "Transfer",
     "destinationAccountRef": "<conta-B>",
     "reconciledBy": "<user>"
   }
   ```

   → 201; a perna de A fica conciliada **e** surge uma contrapartida `Pending` de sinal oposto na conta B.

2. **Ver a contrapartida esperada em B** — `GET /financial/cedente-accounts/<conta-B>/suggestions`
   → item com `kind: "counterpart"`, `label: "outra perna da transferência de <Conta A> em <data>"`.

3. **Importar o extrato de B + casar (US2)** — após importar o extrato de B com o crédito real:
   `GET .../suggestions` → sugere o casamento transação real × contrapartida (valor exato + janela de data).
   `POST /financial/reconciliations/confirm` com `target: { kind: "counterpart", counterpartId }`
   → as duas pernas ficam conciliadas e vinculadas; a contrapartida vira `Matched`; **sem** lançamento duplicado.

4. **Desfazer a origem (US3)** — `POST /financial/reconciliations/<recon-A>/undo`
   → contrapartida `Pending` é descartada; se já `Matched`, o par de B é reaberto de forma consistente.

## Verificações (mapa dos SC)

- SC-001: 1 único lançamento cria as duas pernas.
- SC-002: a sugestão de casamento acende sem busca manual.
- SC-003: 0 duplicatas após confirmar.
- SC-004: navegação A↔B pelo vínculo.
- SC-005: undo deixa estado consistente (sem contrapartida órfã).
