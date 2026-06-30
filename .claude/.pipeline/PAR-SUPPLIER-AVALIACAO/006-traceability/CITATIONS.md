# Citação canônica (Princípio IX) — PAR-SUPPLIER-AVALIACAO

**Decisão**: modelar `serviceRating` como **Standard Type** (VO de conjunto fechado descritivo),
não nota numérica nem string solta.

**Fonte** (via MCP `acdg-skills`, domínio ddd):

> "In many systems and applications there is a need for what I call **Standard Types**. Standard
> Types are **descriptive objects that indicate the types of things**. (…) I prefer the name Standard
> Types because it is more descriptive. (…) Using a Standard Type here helps you **avoid bogus
> currencies**. (…) If using a string attribute, you could place the model into an invalid state.
> Consider the misspelled `doolars` and the problems it would cause."
> — _(Vaughn Vernon, Implementing Domain-Driven Design, p. 307, linha 5410)_

> "If you find **enums an effective modeling choice for Standard Types** and/or State objects…"
> — _(idem, p. 320, linha 6246)_

**Aplicação**: `RUIM/REGULAR/BOM/OTIMO` como VO com smart constructor (rejeita fora do conjunto →
`invalid-service-rating`). Enum semântico escolhido sobre 1–5 porque Vernon nota que "type code
doesn't say much". Consistente com `service-category.ts` (Standard Type legado do mesmo agregado).
