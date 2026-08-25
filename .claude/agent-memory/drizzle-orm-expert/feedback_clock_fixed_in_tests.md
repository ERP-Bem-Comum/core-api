---
name: clock-fixed-in-tests
description: Em testes que precisam de Clock, usar ClockFixed de src/shared/adapters/clock-fixed.ts — nunca construir objeto literal com today()
metadata:
  type: feedback
---

Usar `ClockFixed(date)` importado de `#src/shared/adapters/clock-fixed.ts` sempre que um teste precisar de um `Clock`.

**Why:** `PlainDate` é um branded type (`Brand<{year,month,day}, 'PlainDate'>`). Construir `{ year, month, day }` inline não satisfaz o tipo — `today()` precisa retornar `PlainDate` com o `[__brand]` property. O `ClockFixed` usa `PlainDate.fromDate(at)` internamente, que produz o branded corretamente.

**How to apply:** Em qualquer arquivo de teste que injeta `clock: Clock`, importar `ClockFixed` e usar `ClockFixed(new Date('...'))`.
