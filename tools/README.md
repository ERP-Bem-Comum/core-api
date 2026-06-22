# tools/

Programas auxiliares **autônomos e compilados**, com runtime próprio separado do core-api (Node/TS).

| Programa           | Linguagem                   | Propósito                                                                                                                                 |
| ------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `deadman-emitter/` | Go (`go.mod`, `Dockerfile`) | Dead-man's switch (épico #67): emite pings para o S3 (1 objeto por ping, SigV4 via stdlib). Build e deploy independentes do backend Node. |

> Automação de dev/CI **interpretada** (TypeScript + bash) vive em
> [`../scripts/`](../scripts/README.md), não aqui. `tools/` é só para programas compilados/deployáveis.
