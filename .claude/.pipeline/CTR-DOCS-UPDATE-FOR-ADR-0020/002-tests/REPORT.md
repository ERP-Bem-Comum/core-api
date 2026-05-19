# W0 — RED — CTR-DOCS-UPDATE-FOR-ADR-0020

**Wave:** W0 (RED)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — RED válido (10/11 fail)

## Arquivo

`tests/cleanup/docs-update.test.ts` (~190 linhas) — 11 CAs estruturais.

## RED

```
✖ CA-1..CA-10 (10 falhas — docs ainda têm strings SQLite operacionais)
✔ CA-11 (sanidade — trivial)
```

Cada CA tem mensagem precisa apontando qual string específica falhou — checklist do W1.

## Estratégia

- Assertions são **negativas e específicas**: `assert.doesNotMatch(content, /...string-target.../)`.
- Tolera refs históricas/comparativas (ex.: "ADR-0018 baniu X em 2026-05-14...") — só pega strings operacionais ativas.
- 11 CAs cobrem: 4 CLAUDE.md + 2 handbook + 4 SKILLs + 1 sanidade.

## Próximo passo

W1 — GREEN: editar CLAUDE.md + handbook (2 arquivos) + 8 SKILLs. CA-11 já está GREEN; resto fica GREEN à medida que as edições rolam.
