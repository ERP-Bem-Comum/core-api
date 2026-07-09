# W1 — Implementação GREEN · FIN-READER-TOUNI-GUARD (#389)

**Agente:** `nodejs-runtime-expert` · **Outcome:** GREEN

## Mudança (mínima — YAGNI)

`native-pdf.ts` `parseToUnicode`, guarda de faixa antes de `String.fromCodePoint`:

```ts
const cp = Number.parseInt(p[2], 16);
if (cp > 0x10ffff) continue; // #389 (CWE-248): fail-closed — ignora mapeamento inválido
map.set(Number.parseInt(p[1], 16), String.fromCodePoint(cp));
```

Ignorar o mapeamento (em vez de `try/catch` no `readNative`) é mais cirúrgico: preserva o decode dos
demais `bfchar` válidos e o `?? ''` do `decodeHex` já colapsa o código sem entrada em string vazia.

## Evidência GREEN

Suíte completa do reader: **17/17 pass** (16 CAs pré-existentes + o novo #389). Sem regressão.
