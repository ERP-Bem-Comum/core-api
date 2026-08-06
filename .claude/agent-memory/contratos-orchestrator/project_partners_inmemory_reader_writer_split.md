---
name: partners-inmemory-reader-writer-split
description: Em partners composition (driver memory), reader e writer são stores SEPARADOS — POST não aparece em GET detail/list
metadata:
  type: project
---

No módulo `partners`, `buildMemoryPools` (em `src/modules/partners/adapters/http/composition.ts`)
usa **stores separados** para reader e writer no driver `memory`:
- `collaboratorWriterRepo` = `makeInMemoryCollaboratorStore()` (recebe POST/PUT).
- `collaboratorReader` = `makeInMemoryCollaboratorReader(config.seed?.collaborators ?? [])` —
  populado **só** pelo `seed`, nunca pelo writer.
- `getCollaboratorById` e `listCollaboratorRecords` (rotas HTTP de leitura) usam o **reader**.
- `listCollaborators` (use case) usa `collaboratorReaderRepo` = writer store (confuso, mas é assim).

**Why:** o read-model enriquecido (legacyId/timestamps) vem do reader; em memory não há sync
writer→reader. Mesmo padrão de `act`/`supplier`/`financier`.

**How to apply:** testes HTTP que verificam "POST persiste campo X → GET detail/list mostra X" são
**estruturalmente impossíveis em memory** — o POST nunca chega ao reader. Em vez disso:
(1) testar 201/400 do body (schema aceita/rejeita) na rota; (2) semear o reader via
`buildPartnersHttpDeps({ driver:'memory', seed:{ collaborators:[record] } })` e testar que o
detail/list **expõe** o campo; (3) cobrir o threading body→domínio no nível use-case/mapper.
Foi a correção aplicada no T017/T018 da feature 010 (campo `programId`).
