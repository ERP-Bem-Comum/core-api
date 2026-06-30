# 000 — Request CTR-AMENDMENT-SIGNEDAT-AND-NUMBER

> Recorte G2+G3 do card `handbook/tickets/todo/CTR-CONTRACT-METADATA-E-ADITIVOS.md` (fatiável).
> Agregado **Amendment** (`ctr_*`). G1 (metadados do contrato) fica para ticket próprio. Size L.

## Decisões de modelagem (pipeline + aval do humano, 2026-06-10)

### G2 — `signedAt` por aditivo
- **Capturado no attach do documento assinado** (`attachSignedDocument`), como data de NEGÓCIO fornecida
  pelo operador (espelha `Contract.activate(signedAt)`).
- **Tipo refinado por estado:** `PendingWithDocumentAmendment` e `HomologatedAmendment` carregam
  `signedAt: Date`; `PendingWithoutDocumentAmendment` **não** tem o campo (sem null-as-state).
- Schema: coluna `signed_at datetime(3)` NULL + CHECK de consistência (`signed_at NOT NULL ⟺
  signed_document_ref NOT NULL` — ambos entram juntos no attach).
- Borda: o `signedAt` entra como query param na rota de upload+attach
  (`POST /contracts/:id/amendments/:amendmentId/documents`); o DTO de aditivo passa a expor `signedAt`.

### G3 — numeração sequencial do aditivo gerada pelo backend
- **`amendmentNumber` passa a ser GERADO pelo backend**, por **ordem de criação dentro do contrato**
  (escopo per-contract) — substitui o input do cliente (espelha CTR-CONTRACT-SEQUENTIAL-NUMBER).
- **Formato `NN/AAAA`**: sequência zero-pad a 2 dígitos (per-contract) + ano de criação (clock).
  Ex.: 1º aditivo do contrato em 2026 → `01/2026`; 2º → `02/2026`. A sequência NN é monotônica
  por contrato (não reinicia por ano); `AAAA` é o ano de criação do aditivo.
- Borda: `createAmendmentBodySchema` **remove** `amendmentNumber` (cliente não fornece). Resposta
  retorna o número gerado. O front compõe o rótulo de exibição (`AD NN-<contrato>/ANO`).
- Port: `nextAmendmentNumber(contractId, year) => Result<string, AmendmentRepositoryError>`.
  Implementação (decisão de W1): contador per-contract — avaliar `ctr_amendment_seq(contract_id PK,
  last_seq)` (CHILD_CODES, race-safe, como contratos) vs MAX+1 + UNIQUE(contract_id, amendment_number).

## Critérios de Aceitação

1. **G2**: anexar o documento assinado a um aditivo grava `signedAt` (data informada); o aditivo passa a
   expor `signedAt` no detalhe/tabela; `PendingWithoutDocument` não tem assinatura.
2. **G3**: criar aditivo NÃO exige `amendmentNumber` no body; o backend gera `NN/AAAA` por contrato,
   crescente por ordem de criação; a resposta retorna o número gerado.
3. Unicidade do número por contrato como rede (UNIQUE ou seq-table transacional).
4. Eventos/timeline e import legado preservam o comportamento (import preserva número se fornecido).

## Superfície de mudança (mapeada)

- **Domínio:** `amendment/types.ts` (`signedAt` em PendingWithDocument+Homologated; input do attach),
  `amendment/amendment.ts` (`attachSignedDocument` recebe `signedAt`), `amendment/errors.ts` (se preciso).
- **Persistência:** `schemas/mysql.ts` (`signed_at` + CHECK; eventual `ctr_amendment_seq`), migration(s),
  `mappers/amendment.mapper.ts` (round-trip `signedAt`).
- **Port + adapters:** `amendment/repository.ts` (`nextAmendmentNumber`), in-memory + drizzle.
- **Application:** `create-amendment.ts` (gera número; `amendmentNumber` sai do command),
  `attach-signed-document.ts` (captura `signedAt`).
- **Borda HTTP:** `schemas.ts` (`createAmendmentBodySchema` sem `amendmentNumber`;
  `uploadDocumentQuerySchema`/rota de attach com `signedAt`; `amendmentSchema` expõe `signedAt`),
  `plugin.ts` (handlers), `amendment-dto.ts`.

## Fora de escopo

- G1 (metadados do contrato: programa/categoria/centro de custo/plano orçamentário/classificação).
- Numeração global/por-ano de aditivo (escopo é per-contract).

## Fechamento

W0 RED → W1 GREEN → W2 (drizzle-orm-expert + typescript-language-expert) → W3 (typecheck/format/lint/
test + integração escopada) → close. Mover ticket-pai? Não — o card CTR-CONTRACT-METADATA-E-ADITIVOS
permanece em `todo/` (G1 pendente); registrar neste fechamento que G2+G3 saíram.
