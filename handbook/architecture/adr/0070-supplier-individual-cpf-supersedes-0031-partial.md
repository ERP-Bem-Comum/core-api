[← Voltar para ADRs](./README.md)

# ADR-0070: Fornecedor pessoa física — o documento do Fornecedor passa a ser CPF **ou** CNPJ, e a PF não tem razão social nem nome fantasia

- **Status:** Accepted
- **Date:** 2026-10-01
- **Deciders:** Tech Lead (Gabriel) + P.O do cliente (decisão de produto na issue e na conversa de 2026-10-01)
- **Supersedes (parcial):** [ADR-0031](./0031-partners-registry-module.md) — na linha de `par_suppliers` da tabela de schemas (`cnpj unique`): a chave natural do Fornecedor deixa de ser só CNPJ e o campo sensível da edição passa de `cnpj` a `document`. `Financier` e `Act` **não mudam** — continuam com o `Cnpj` do kernel e recusam CPF. O resto do ADR-0031 segue vigente.
- **Relates:** [#1022](https://github.com/ERP-Bem-Comum/core-api/issues/1022) · [ADR-0043](./0043-partners-supplier-integration-events.md) (payload de integração já usa `document`) · [ADR-0044](./0044-cnpj-alphanumeric-kernel.md) (CNPJ alfanumérico)

## Contexto

O cliente tem fornecedores pessoa física, pagos por RPA. O cálculo do RPA já existe no Contas a Pagar;
faltava o cadastro: `Supplier.cnpj` era o VO `Cnpj` do kernel, a coluna `par_suppliers.cnpj` era
`varchar(14)` UNIQUE e o mapper reidratava com `Cnpj.parse` — uma linha com CPF quebraria na leitura.

Pessoa física não tem razão social nem nome fantasia. A pergunta de modelagem é **como representar
um campo que, para um dos dois tipos de pessoa, não existe**.

## Decisão

### 1. Identidade PF × PJ é uma union discriminada no domínio

```ts
type SupplierIdentity =
  | { personType: 'individual'; document: { kind: 'cpf'; value: Cpf } }
  | { personType: 'company'; document: { kind: 'cnpj'; value: Cnpj }; corporateName: string; fantasyName: string };
```

Na PF, `corporateName` e `fantasyName` **não existem no tipo** — não é que existam vazios. O
compilador impede ler razão social de quem não a tem sem antes perguntar o `personType`, e o
`switch` exaustivo obriga cada consumidor (DTO, CSV, busca, mapper) a decidir o que mostra para PF.

O `SupplierDocument` vive em `partners/domain/supplier/`, **não no kernel**: só o Fornecedor aceita os
dois documentos. O `Cnpj` do kernel não muda.

### 2. O tipo de pessoa é derivado do documento, nunca gravado

Um campo `personType` gravado permitiria o estado "PF com CNPJ". Derivado do documento (11 dígitos →
CPF/PF; letra ou 14 caracteres → CNPJ/PJ), esse estado não é representável. A borda HTTP expõe
`personType: 'PF' | 'PJ'` calculado.

### 3. `NULL` só nas bordas; nenhum valor sentinela

Na coluna MySQL e no JSON, a ausência de razão social/nome fantasia da PF é `NULL`/`null`, e o banco
amarra isso ao documento:

```sql
CHECK ((CHAR_LENGTH(document) = 11) = (corporate_name IS NULL))  -- idem fantasy_name
```

**Alternativa recusada: valor sentinela** (`-1`, `00`, string reservada) no lugar de `null`. Foi
proposta para evitar que um `null` "corrompido" virasse `undefined` ou `NaN` no caminho. A premissa
não se sustenta, e o sentinela traria defeito concreto:

- Em JS, `null` é um valor primitivo fixo, não um ponteiro para memória não inicializada; o `NULL` do
  MySQL é estado definido pelo padrão SQL e o driver `mysql2` o entrega como `null`; no JSON, `null`
  faz ida e volta exata. Quem some na serialização é `undefined`, não `null`.
- Corrupção de memória ou de disco atinge qualquer valor por igual — um `-1` corrompido também vira
  outra coisa. O sentinela não protege contra ela.
- Os dois campos são **texto**: o sentinela seria a string `"-1"`, que passaria pelo `CHECK`
  (`IS NULL` falso) e chegaria à busca, ao CSV, à resposta HTTP e à tela se algum consumidor esquecer
  de filtrá-lo — um magic value com outro nome.
- O objetivo real ("o código nunca fica em dúvida se o valor existe") é entregue melhor pela union do
  §1: dentro do domínio não há nem `null` nem sentinela.

O resto do módulo já representa ausência com `null` na borda (`collaborator/types.ts:35-50`).

### 4. PF com razão social/nome fantasia preenchido é **recusado**, não ignorado

`supplier-corporate-name-not-allowed-for-pf` / `supplier-fantasy-name-not-allowed-for-pf` (422).
Descartar em silêncio algo que o usuário digitou esconde um erro de cadastro (CPF digitado no lugar
do CNPJ, por exemplo). Branco (`""`, espaços) conta como ausente, porque a tela desativa os campos e
pode enviá-los vazios. Para PJ, os dois continuam obrigatórios.

### 5. Trocar PF ↔ PJ é trocar o campo sensível

O campo vital da edição passa de `cnpj` a `document`. Trocar PF ↔ PJ necessariamente troca o
documento, então exige `supplier:edit-sensitive` sem regra adicional. Ao virar PJ, razão social e
nome fantasia passam a ser obrigatórios.

### 6. Contrato HTTP v1: aditivo, com alias por um ciclo

O recurso `/api/v1/suppliers` é contrato congelado ([ADR-0033](./0033-api-versioning-v1-legacy-mirror.md)),
então a mudança é **aditiva** e o nome antigo sobrevive por um ciclo, para o backend subir antes do
front sem quebrar a tela atual:

- **Entrada (POST/PUT):** `document` (11 ou 14 caracteres). `cnpj` aceito como alias deprecated;
  exige-se um dos dois, iguais se vierem ambos.
- **Resposta:** `document` + `personType`; `cnpj` segue como alias deprecated de `document`;
  `corporateName`/`fantasyName` passam a `string | null`.
- **Códigos de erro renomeados:** `invalid-cnpj` → `invalid-supplier-document`;
  `*-cnpj-duplicate` → `*-document-duplicate`.

A remoção do alias `cnpj` é decisão do próximo ciclo, quando o front (`web-app` spec
`117-fornecedor-pessoa-fisica`) estiver em produção consumindo `document`/`personType`.

## Consequências

- **Migration `0020`** (partners): `RENAME COLUMN cnpj TO document` (continua `varchar(14)`), índice
  `par_suppliers_document_idx`, `corporate_name`/`fantasy_name` nullable e os dois CHECKs. Sem
  backfill: toda linha existente tem CNPJ de 14 caracteres e os dois nomes preenchidos.
- **Integração `partners → financial`:** nenhuma mudança de contrato. O payload já se chamava
  `document` desde o ADR-0043, e o evento de domínio `SupplierRegistered` nunca é serializado — o
  payload sai do snapshot do agregado. Não há evento antigo no outbox com `cnpj` a aceitar.
- **CNAB/VAN:** sem mudança de código. `financial/domain/payout/inscription.ts` já deriva o tipo de
  inscrição do tamanho (11 → `1`).
- **Leitura de nota (OCR):** `findSupplierIdByCnpj` vira `findSupplierIdByDocument` e resolve CPF
  também — o emitente de um RPA é pessoa física. ⚠️ Risco aceito: a cascata do leitor de PDF tem
  fallbacks sobre o texto inteiro, e um CPF que não é do emitente (tomador, representante) e que
  coincida com o de um fornecedor PF passa a **pré-selecioná-lo**. Antes, `Cnpj.parse` descartava
  todo valor de 11 posições. É pré-seleção, revisável na tela, não lançamento; se aparecer na
  prática, a correção é restringir o resolver ao campo do emitente, não recusar CPF.
- **ETL legada:** a coluna legada `cnpj` pode trazer CPF; antes ia para quarentena (`CnpjInvalid`),
  agora entra como PF. O legado tinha razão social/nome fantasia `NOT NULL`, então a PF chega com os
  dois preenchidos à força; o ACL os **descarta** para PF, porque ali eles são enchimento de
  formulário, não dado da pessoa. **Exceção: CPF ambíguo vai para quarentena** (`ExcludedByDecision`,
  ADR-0070) — se as 11 posições completadas com zeros formam um CNPJ válido, pode ser um CNPJ
  legado que perdeu os zeros à esquerda (pelos pesos do módulo 11, só acontece com documento
  iniciado em `00`), e importá-lo como PF descartaria a razão social real. Se a ETL já rodou e pôs fornecedores PF em quarentena, eles
  precisam ser recarregados depois desta entrega (#1022 §6).
- **CSV:** a coluna do documento passa a se chamar `CPF/CNPJ`; razão social e nome fantasia saem
  vazios na PF.
- ⚠️ **Mudança de status perceptível:** POST/PUT de PJ **sem** `corporateName` passa de 400 (Zod) a
  422 (`supplier-corporate-name-required`, domínio), porque o shape não pode mais exigir o campo — quem
  decide é o documento.
