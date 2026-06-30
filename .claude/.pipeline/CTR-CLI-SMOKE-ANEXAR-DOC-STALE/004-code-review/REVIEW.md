# W2 — Code review (read-only)

> Resultado: **APPROVED** · round 1

## Escopo do diff

Apenas `tests/cli/contracts.cli.mysql.test.ts`. Nenhuma mudança em `src/`.

## Itens verificados

- **Contrato de produção preservado:** o fix alinha o teste ao comportamento atual
  (`attach` exige documento existente, `CTR-AMENDMENT-DOCUMENT-LINK`); não relaxa nem
  contorna a validação. ✅
- **`subir-documento` é a API correta:** comando criado no mesmo ticket da validação,
  com flags `--parent-tipo Amendment --parent-id <amendmentId> --doc-id`. ✅
- **Coerência semântica:** o documento é criado com `parentType=Amendment` e
  `parentId=amendmentId` — vínculo correto, não um doc solto. ✅
- **Higiene de teste:** `ctr_documents` truncado no `beforeEach` junto às demais tabelas,
  sob `FOREIGN_KEY_CHECKS=0`. Ordem irrelevante (sem FK declarada), mas seguro. ✅
- **Sem `assert` mentiroso:** `subir-documento` valida `exitCode 0` próprio antes do attach. ✅
- **Idioma/estilo:** comentário PT-BR explicando o "porquê" (a validação), conforme regra. ✅

Nada a corrigir.
