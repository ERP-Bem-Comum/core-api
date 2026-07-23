# TEST-ISOLATION-PARTNERS-CONTRACT — escopo + achado

> Issue **#535** (dívida sistêmica de isolamento de testes de integração). Nasceu como size **M**
> (contrato + helper `resetPartnersTables` + refactor dos ~22 arquivos financeiros latentes). A
> investigação do W0 **reclassificou** para doc-only (goes direct, sem W0→W3). Registro auditável abaixo.

## O que o W0 mediu (MySQL 8.4 isolado no x99, container `iso535-mysql`, 2026-07-23)

Rodei as suítes de integração **em ordem invertida de arquivo** (o cenário que expõe dependência de
ordem, já que `--test-concurrency=1` não recria o schema entre arquivos irmãos):

- `partners` invertido → **50/50 pass** (os `Duplicate entry` no log são os testes intencionais de
  `integrity-violation`, não resíduo).
- `financial` invertido → **119/119 pass**.

**Conclusão:** as duas suítes já são **order-independent**. O fix do **#521**
(`suppliers-batch-reader` passou a limpar por tabela na entrada) eliminou a **única** dependência de
ordem real. Os ~22 arquivos financeiros "latentes" usam UUIDs distintos por arquivo — não colidem
mesmo com a ordem trocada. **Não há trabalho corretivo em código.**

## Entrega (doc-only)

- `.claude/rules/testing.md` — nova seção **"Contrato de isolamento (testes de integração contra
  MySQL real)"**: limpar na ENTRADA, por tabela, nunca por PK quando há UNIQUE natural
  (CNPJ/CPF/`code`/`legacy_id`), com a prova mecânica (rodar em ordem invertida) e a ressalva do #521.
  O helper `resetPartnersTables`/`resetFinancialTables` fica documentado como o encapsulamento natural
  do contrato **quando um terceiro arquivo precisar** da mesma limpeza (YAGNI: enquanto cada arquivo já
  limpa por tabela na entrada, o contrato está satisfeito sem o helper).

## Por que não a pipeline W0→W3 completa

Mudança de **documentação** (regra path-scoped em `.claude/rules/`). Por constituição, doc/config vai
direto. O W0 (investigação) virou a evidência que reclassificou o ticket; não há `src/` a tocar, logo
não há RED de código nem W1/W2/W3 de implementação. O gate aplicável (`format:check`) passa verde.

## Rastreio

Issue #535 · fix mínimo que já resolveu o ofensor real = #521 · exposto originalmente pelo CI do #523 ·
prova em ordem invertida contra MySQL 8.4 real.
