# PAR-FINANCIER-COLLAB-BANK — Dados bancários para Financiador e Colaborador

**Status**: todo (aguardando backend)
**Origem**: solicitação do front (web-app v2) — forms de **novo Financiador** e **novo Colaborador**.
**Relacionado**: o agregado **Supplier** já tem `bankAccount`/`pixKey` (e o **Act/Acordo** ganhou no #32). Este ticket pede a **mesma capacidade** para Financier e Collaborator.

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (conteúdo abaixo = visão do front em 2026-06-09/14).
>
> - **Já implementado:** o padrão `bankAccount` + `pixKey` existe **só** em **Supplier** (`src/modules/partners/adapters/http/supplier-schemas.ts`: shapes `52-62`, create `121-133` linhas `128`/`129`, update `138` = create, response `65-81` linhas `74`/`75`) e em **Act** (`src/modules/partners/adapters/http/act-schemas.ts`: shapes `17-27`, create `102-116` linhas `114`/`115`, update `121` = create, response `30-49` linhas `44`/`45`). Os dois shapes (`bankAccount` = `{bank, agency, accountNumber, checkDigit}`; `pixKey` = `{keyType ∈ cpf|cnpj|email|phone|random-key, key}`) batem com o pedido.
> - **Escopo real restante:** espelhar esse padrão em **Financier** e **Collaborator**, que hoje **não têm** os campos: `Financier` create `src/modules/partners/adapters/http/financier-schemas.ts:60-67` (sem `bankAccount`/`pixKey`), update `:72` (= create), response `:28-40`; `Collaborator` create `src/modules/partners/adapters/http/schemas.ts:158-166`, update `:171` (= create), response `:105-134`. **Não há módulo compartilhado** — Supplier e Act **duplicam** os schemas localmente, então a implementação ou repete o shape nos 2 arquivos ou extrai um shared. Pendente também: persistência (espelhar coluna/serialização do Supplier) e os agregados/domínio de Financier e Collaborator (a verificação cobriu só a borda HTTP/Zod). ⚠️ **Atenção à regra da agência:** o pedido exige `0000`/`0000-0` (4 díg + DV opcional), mas hoje em Supplier/Act `agency` é `z.string()` **sem regex** — copiar o padrão atual **não** entrega essa validação; precisa ser adicionada explicitamente.
> - **Veredito:** NÃO FEITO (~50% do padrão de referência pronto — Supplier e Act servem de molde, mas Financier e Collaborator não têm nada; validação de agência inexistente até no molde).
> ---

## Problema

Os cadastros de **Financiador** (`/api/v1/financiers`) e **Colaborador** (`/api/v1/collaborators`) **não aceitam/retornam dados bancários**. O front precisa coletar **conta bancária** (banco, agência, conta, dígito) nesses dois cadastros — hoje impossível porque o contrato do backend não tem esses campos.

**Estado atual do front (frontend-only, já entregue):** os campos bancários foram adicionados aos dois forms **VISÍVEIS porém DESABILITADOS** ("gated"), com aviso "aguardando suporte do backend". Assim que este ticket for entregue, o front **habilita os campos + liga o mapeador** (mínima mudança). O front **não envia** `bankAccount` enquanto o backend não suportar (evita 422 por campo desconhecido).

## Pedido ao backend

Adicionar **conta bancária opcional** aos agregados/rotas de **Financier** e **Collaborator**, espelhando o que já existe em **Supplier**:

### Campos `bankAccount` + `pixKey` (opcionais, nullable)
```jsonc
"bankAccount": {
  "bank": "string",
  "agency": "string",        // 4 dígitos + DV opcional (5º dígito). Ex.: "1234" ou "1234-5"
  "accountNumber": "string",
  "checkDigit": "string"
}, // | null
"pixKey": {
  "keyType": "cpf|cnpj|email|phone|random-key",
  "key": "string"
} // | null
```
- **POST/PUT** `/api/v1/financiers` e `/api/v1/collaborators`: aceitar `bankAccount` **e** `pixKey` (ambos nullable; default null), **espelhando exatamente o Supplier** (mesmos shapes/VOs).
- **GET** detalhe/lista: retornar `bankAccount` e `pixKey` (ou null).

### Regra da agência (alinhar com o front)
- A **agência** tem **4 dígitos**, com **5º dígito (DV) OPCIONAL**. O front aplica a máscara `0000` / `0000-0`. Validar coerentemente (não exigir o 5º dígito).

### Compat
- Aditivo/opcional → não quebra cadastros existentes (sem `bankAccount` = null).
- Persistência: espelhar a coluna/serialização de `bankAccount` do Supplier (ADR de partners).

## Aceite
- POST/PUT de Financier e Collaborator aceitam `bankAccount` **e** `pixKey` (com/sem DV de agência) e persistem.
- GET retorna `bankAccount` e `pixKey`.
- Front: habilitar os campos (remover o "gated") + ligar input no controller + serializar no mapeador (`core-api-financiers.ts` / `core-api-collaborators.ts`) + schemas de borda (io-schemas + response).

## Notas
- Front já preparou: máscara `agency` (4 díg + DV opcional) no átomo `Input`; labels i18n `partners.{financiers,collaborators}.form.{bank,agency,accountNumber,checkDigit,pixKeyType,pixKey}` + `partners.{financiers,collaborators}.pix.*`; seção "Dados Bancários" (conta **+ PIX**, `keyType` ∈ cpf|cnpj|email|phone|random-key) **desabilitada** nos dois forms.
