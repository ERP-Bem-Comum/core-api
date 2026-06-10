# Handoff core-api → front — Acordo de Cooperação Técnica (PAR-ACT-ACORDO)

O backend do submódulo ACT foi reescrito de **pessoa-física** para **Acordo de Cooperação
Técnica** (instituição parceira, CNPJ). A borda HTTP `/api/v1/acts` mudou de contrato. Pontos
de ação para o front:

## 1. Vigência: meses → período explícito (⚠️ D2)

O form atual coleta **"Vigência Inicial (Meses)"**. O backend agora modela vigência como
**período** com duas datas:

- **Request** (`POST`/`PUT /api/v1/acts`): enviar `startDate` e `endDate` (ISO `YYYY-MM-DD`).
- **Response/detalhe**: retorna `startDate` e `endDate`.
- O front deve **coletar/derivar as duas datas** (ou o BFF converte meses → `startDate`+`endDate`).
- Validações: `endDate < startDate` → **422** (`period-end-before-start`); data malformada → 422.

## 2. Campos novos / renomeados (request e response)

| Antes (pessoa-física) | Agora (Acordo) |
| --- | --- |
| `cpf` | **`cnpj`** (14 dígitos, sem máscara — DV validado; inválido → 422) |
| `role` | **`legalRepresentative`** (representante legal / ponto de contato) |
| `startOfContract` | **`startDate`** + **`endDate`** (vigência) |
| `employmentRelationship` | removido |
| `registrationStatus` | removido |
| — | **`actNumber`** (nº do instrumento jurídico, **único** — duplicado → 409) |
| — | **`corporateName`** (razão social) |
| — | **`fantasyName`** (nome fantasia/sigla) |
| — | **`hasFinancialTransfer`** (boolean) |
| — | **`bankAccount`** `{ bank, agency, accountNumber, checkDigit }` \| `null` |
| — | **`pixKey`** `{ keyType, key }` \| `null` |
| `name`, `email`, `occupationArea` | mantidos (name = objeto do acordo; email = contato) |

## 3. Regra de repasse (UX)

`hasFinancialTransfer = true` ⇒ **ao menos um** entre `bankAccount` / `pixKey` é obrigatório
(senão **422** `act-payment-target-required`). Se `false`, ambos podem ser `null`.

## 4. Listagem `/api/v1/acts`

- Item de lista expõe `actNumber` e `corporateName` (além de name/cnpj/active/…).
- Filtros (query): `search` (casa actNumber/corporateName/name), `hasFinancialTransfer` (0/1),
  `occupationArea` (`PARC|DDI|DCE|EPV`), `active` (0/1), `page`, `limit`, `order`.

## 5. CSV `/api/v1/acts/export`

Colunas: `id, actNumber, name, email, cnpj, corporateName, fantasyName, occupationArea,
legalRepresentative, startDate, endDate, hasFinancialTransfer, status, deactivatedAt`.

## 6. Dados antigos (D3)

Os ACTs pessoa-física eram apenas seed de teste — **descontinuados** (migration `0008`
DROP+CREATE). `seed-partners.ts` reescrito com 3 acordos de exemplo.
