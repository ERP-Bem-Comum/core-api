# W0 (RED) — CTR-CLI-SUBIR-DOCUMENTO-CATEGORIA

**Skill:** tdd-strategist · **Data:** 2026-05-27 · **Resultado:** 🔴 RED (3 fail / 1 pass — esperado).

## Arquivo

`tests/cli/contracts.cli.subir-documento-categoria.test.ts` (novo, E2E driver memory).

## Mapa CA → teste

| CA | Teste | Estado W0 | Motivo |
| :-- | :-- | :--: | :-- |
| CA1 | cria documento com categoria `signed_contract`, exit 0 | 🔴 fail | flag inexistente → `❌ Flag desconhecida (--categoria)`, exit 64 |
| CA2 | categoria inválida → exit 64 + lista válidas | 🔴 fail | hoje exit 64 mas por "Flag desconhecida", não por validação do enum (stderr não cita `signed_contract`) |
| CA3 | **regressão** — sem `--categoria` → default `other` | 🟢 pass | comportamento atual já cria `other`; guarda deve permanecer verde no W1 |
| CA4 | `allowedFlags` inclui `categoria` | 🔴 fail | `allowedFlags = parent-id,parent-tipo,doc-id,user-id,help,h` |

```
node --test contracts.cli.subir-documento-categoria.test.ts → tests 4 · pass 1 · fail 3
```

## Próximo passo (W1)

- `ALLOWED += 'categoria'`.
- Ler `flags['categoria']` (default `'other'`); validar contra os 8 `DocumentCategory` (set);
  inválida → stderr listando as válidas + exit 64.
- Passar a categoria validada a `Document.create` (substituir o `'other'` hardcoded em `:113`).
- CA3 (regressão) deve continuar verde.
