# W0 — Testes (config-direct, sem RED)

Mudança **exclusivamente de config** (flag de runtime em `package.json#scripts`).
CLAUDE.md permite config ir direto; não há API nova para um teste RED exercitar.

A rede de segurança é a **suíte existente** (`pnpm test`) permanecer verde após a
mudança (CA3). Baseline antes da edição: 1156 pass / 0 fail.

Outcome registrado como GREEN (baseline capturado verde), não RED — fail-first não
se aplica a flag de execução.
