# Code Review — FIN-CEDENTE-TYPE-EXTEND (#206) — Round 1

**Veredito:** APPROVED
**Reviewer:** code-reviewer · **Data:** 2026-06-22

**Escopo:** domínio cedente (types + create), Drizzle schema + migration 0019, mapper, use-cases
create/edit, borda HTTP (Zod schemas + plugin DTO/handlers), testes domínio + integração.

## Análise

Extensão **aditiva e coerente** do enum `AccountType` (+ `cartao`/`outro`) com texto livre `typeLabel`,
propagada de ponta a ponta sem quebrar contratos:

- **Migration aditiva**: `ADD COLUMN` nullable + relaxação de CHECK (DROP+ADD). Não-quebrante — contas
  existentes seguem válidas (`type IN (...antigos...)` ⊂ novo CHECK; coluna nova é NULL).
- **`typeLabel` sempre-editável**: corretamente classificado como metadado (junto de nickname/bankName),
  **fora** do guard FR-008 de dados bancários travados — editar `typeLabel` não exige conta sem histórico.
- **Conciliação intacta**: confirmado que import/confirm/manual-entry não ramificam por tipo de conta →
  CA3 sem código novo (cartao/outro conciliam pelo mesmo fluxo).
- **`as AccountType`** nos use-cases create/edit: cast de string raw validada pelo domínio (`create` rejeita
  fora do enum) — padrão pré-existente, mantido.
- **DTO/Zod consistentes**: `accountTypeSchema` (enum), `typeLabel` opcional no create/edit, `typeLabel`
  nullable no response (propaga ao list item via `.extend`).

## Issues

Nenhuma 🔴/🟡. 🔵 Nota: optou-se por NÃO exigir `typeLabel` quando `type='outro'` (issue diz "aceitar",
não exigir) — registrado como não-objetivo; vira invariante de domínio se o produto pedir.

## Próximo passo

APPROVED → W3 (gate já verde).
