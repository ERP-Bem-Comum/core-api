# tools/

Programas auxiliares **autônomos e compilados**, com runtime próprio separado do core-api (Node/TS).

**Nenhum programa vive aqui hoje.** O único que existia, `deadman-emitter/` (Go), foi removido em
2026-08-17 junto com o resto do dead-man's switch: ele funcionava, mas nunca foi implantado, então
nunca emitiu um ping — ver [`ADR-0042`](../context/decisions/ADR-0042.yaml) e a
[inquiry 0030](../handbook/inquiries/0030-deadman-switch-nunca-vigiou.md).

O diretório permanece porque a convenção abaixo segue valendo para o próximo utilitário compilado.

> Automação de dev/CI **interpretada** (TypeScript + bash) vive em
> [`../scripts/`](../scripts/README.md), não aqui. `tools/` é só para programas compilados/deployáveis.
