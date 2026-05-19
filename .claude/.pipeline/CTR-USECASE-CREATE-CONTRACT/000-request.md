# Ticket CTR-USECASE-CREATE-CONTRACT: Use case `createContract`

> Documentação PT, identificadores EN (regra invariante).

## Contexto

Para a CLI permitir P.O. criar um contrato, precisamos do use case que **converte input cru** (ISO strings, cents, ID gerado pelo caller ou pelo próprio use case) em um `Contract` criado, persistido e com evento publicado.

## Escopo

- `src/modules/contracts/application/use-cases/create-contract.ts`
- `tests/modules/contracts/application/use-cases/create-contract.test.ts`

## Decisões

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | Use case **gera o ContractId** internamente (não recebe no command) | CLI/HTTP não precisa gerar UUID. Use case usa `ContractId.generate()`. |
| D2 | `originalEndDate: string \| null` — `null` = período indefinido | Suporta ambas as variantes de Period. |
| D3 | Datas como ISO strings no command | CLI parser converte mais facilmente; uso `new Date(iso)` + validação interna. |
| D4 | Valor como `originalValueCents: number` | Mantém precisão; consumidor (CLI) converte de R$ se quiser. |
| D5 | `Clock` injetado — usado **apenas para `signedAt` quando não passado**? Não. `signedAt` é input obrigatório (data legal documental). Clock não usado neste use case. | YAGNI — quando precisarmos de "registrar quando o contrato foi criado no sistema" diferente de "quando foi assinado", revisitamos. |
| D6 | Sequência: validate inputs → build VOs → Contract.create → save → publish → return | Padrão estabelecido em `homologateAmendment`. |

## Critérios de aceite

### Happy path
- [ ] Comando válido (com `originalEndDate` ISO) → `Ok({ contract: Active com Fixed period, event: ContractCreated })`.
- [ ] Comando com `originalEndDate: null` → `Ok({ contract com Indefinite period })`.
- [ ] Contract persistido com `id` gerado automaticamente.
- [ ] Evento publicado.

### Validações
- [ ] `signedAt` ISO inválido → `Err('create-contract-invalid-signed-at')`.
- [ ] `originalPeriodStart` ISO inválido → `Err('create-contract-invalid-period-start')`.
- [ ] `originalPeriodEnd` ISO inválido (quando não null) → `Err('create-contract-invalid-period-end')`.
- [ ] `originalValueCents` < 0 → propaga `Err('money-negative-value')`.
- [ ] `originalValueCents` não-inteiro → propaga `Err('money-non-integer-value')`.
- [ ] `end < start` → propaga `Err('period-end-before-start')`.
- [ ] Sequencial vazio → propaga `Err('contract-sequential-number-required')`.

### Effects on error
- [ ] Nenhuma persistência nem publicação em qualquer erro.

## Fora de escopo

- Numeração automática `001/2026` — caller passa o sequentialNumber (CLI pode autogerar localmente, ou use case próprio para isso depois).
- Validação de duplicidade `(sequentialNumber, year)` — R4 do handbook é responsabilidade do repository.
