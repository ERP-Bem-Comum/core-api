# CTR-DOMAIN-CONTRACT-PENDING-STATE — estado refinado `PendingContract` + `create` dual

## Origem

[ADR-0023](../../../handbook/architecture/adr/0023-contract-lifecycle-pending-state.md) (decide
[Inquiry-0021](../../../handbook/inquiries/0021-contract-status-lifecycle-http.md)): o ciclo de
vida do `Contract` passa de 3 para 4 estados, com o contrato podendo **nascer `Pendente`**
(cadastrado sem documento assinado, sem efetividade).

**Primeiro ticket da série de domínio.** Escopo deliberadamente mínimo: introduzir o estado
`Pending` e a criação dual. Demais fatias em tickets seguintes (ver §"Fora de escopo").

## Estado atual

`src/modules/contracts/domain/contract/`:
- `types.ts` — `Contract = ActiveContract | ExpiredContract | TerminatedContract`. `ContractCore`
  já carrega `signedAt: Date`, `currentValue/currentPeriod` e `homologatedAmendmentIds`
  obrigatórios. `CreateContractInput` exige `signedAt: Date`.
- `contract.ts` — `Contract.create(input)` **sempre** retorna `ActiveContract` (l.48-86), com
  `currentValue = originalValue`, `currentPeriod = originalPeriod`, `status: 'Active'`.

Padrão a espelhar: o agregado `Amendment` (`amendment/types.ts`) já modela
`PendingWithoutDocument → PendingWithDocument → Homologated` com tipos refinados por estado.

## Critérios de aceitação

- **CA1:** Existe o tipo refinado **`PendingContract`** (`status: 'Pending'`) na union `Contract`.
  Ele **não expõe** `signedAt`, `currentValue`, `currentPeriod` nem `homologatedAmendmentIds`
  efetivos — acessá-los num `PendingContract` é **erro de compilação** (campos pertencem aos
  estados ativos/terminais, via refino do `ContractCore`). Carrega: `id`, `sequentialNumber`,
  `title`, `objective`, `originalValue`, `originalPeriod`.
- **CA2:** **`Contract.createPending(input)`** (input **sem** `signedAt`) produz `PendingContract`
  (`status: 'Pending'`). O evento `ContractCreated` usa um timestamp de criação injetado
  (`createdAt`, NÃO `signedAt` — que não existe em Pending; o use case injeta via clock).
- **CA3:** `Contract.create(input)` (com `signedAt` válido) **permanece inalterado** → `ActiveContract`
  (vigência inicia: `current = original`). O use case `create-contract` e seus testes existentes
  seguem verdes **sem alteração**.

> **Refino W0 (decisão de API):** optou-se por **construtor separado `createPending`** em vez de
> sobrecarregar `create` com `signedAt` opcional. Razão: (1) preserva 100% o `create → Active`
> (CA3 trivial, retorno não vira union); (2) espelha o agregado `Amendment`, cujo `create` nasce no
> estado inicial e transições (`attach`/`homologate`) levam adiante. O caminho "nascer já Active"
> segue via `create`; a ponte `Pending → Active` é a transição `activate` do próximo ticket.
- **CA4:** As validações de cadastro (formato `NNN/AAAA` do `sequentialNumber`, `title`/`objective`
  não-branco, `originalValue` ≠ 0) valem para **ambos** os caminhos.
- **CA5:** `ContractStatus` passa a incluir `'Pending'`; `switch` exaustivo sobre `Contract`/status
  no domínio (se houver) é atualizado sem `default`.

## Fora de escopo (tickets seguintes da série)

- **Transição `activate`** (`Pending → Active` por documento assinado + data) + `signedDocumentRef`
  no `ActiveContract` (RN-CV-02). → próximo ticket.
- **Invariante anti-aditivo em `Pending`** (RN-CV-01) — guards em create/attach/homologate amendment.
- **Persistência** (schema/migration: `status` 4 valores; `signedAt`/doc-ref nuláveis em Pending).
- **CLI + formatters PT** (`Pendente`).
- **ACL/HTTP** — bloqueado por ADR-0023 até a série fechar.

## Notas

- Skill canônica: `ts-domain-modeler` (domínio puro). Pipeline W0→W3.
- Decisão de modelagem do input (signedAt opcional vs. input variante) e do refino de `ContractCore`
  (campos comuns vs. campos de vigência efetiva) fica para o W0/W1 — o importante é a garantia
  estática do CA1.
- Idioma: discriminador interno em EN (`'Pending'`); termo de UI `Pendente` vem na borda (ticket de CLI/ACL).
