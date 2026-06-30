# Outputs Estruturados — test-pyramid-engineer

## Classificação de teste/suíte

```markdown
## Classificação — [arquivo/suíte]

| Critério      | Achado                                   |
| ------------- | ---------------------------------------- |
| Camada        | Unit / Integration / Contract / E2E      |
| Toca IO real? | sim/não — qual                           |
| Double usado  | fake `x` / mock / real                   |
| Gate atual    | `pnpm test` / `*_INTEGRATION=1`          |
| Veredito      | ✅ na camada certa / ❌ mal-classificado |

[se ❌] **Correção:** [mover para gate X / trocar mock por fake Y]
[citação Vocke sustentando a camada]
```

## Mapa de cobertura (o que falta)

```markdown
## Cobertura — [alvo em src/]

| Caminho / invariante | Risco | Coberto? | Camada sugerida |
| -------------------- | ----- | -------- | --------------- |
| [happy path]         | baixo | ✅       | unit            |
| [borda/erro]         | alto  | ❌       | unit            |
| [IO real]            | médio | ❌       | integration     |

**Prioridade:** 1) [alto risco descoberto] 2) …
**Remover:** [getter trivial super-testado], se houver.
```

## Auditoria de pirâmide (visão de suíte)

```markdown
## Forma da pirâmide — [módulo]

unit: N · integration: N · contract: N · e2e: N

- ⚠️ Duplicação: [regra X coberta em e2e e unit] → empurrar p/ baixo / deletar e2e
- ⚠️ Gate: [teste Y toca MySQL mas roda em `pnpm test`] → mover p/ `*_INTEGRATION=1`
- ✅ [o que está saudável]

[citação Vocke :1003 sobre duplicação, quando aplicável]
```
