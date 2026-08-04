---
paths:
  - 'package.json'
  - 'pnpm-workspace.yaml'
  - 'Dockerfile*'
  - '.npmrc'
  - 'compose*.yaml'
verify:
  - claim: 'os composes da raiz são três, e a rule carrega em todos'
    glob: 'compose*.yaml'
    expect:
      - 'compose.ci.yaml'
      - 'compose.etl.yaml'
      - 'compose.yaml'
---

Estes arquivos carregam **decisão de segurança**, não configuração incidental. A política nasceu de um incidente real: o comprometimento do `axios` em março/2026 ([ADR-0011](../../handbook/architecture/adr/0011-supply-chain-hardening.md)).

As quatro settings de quarentena e a concordância de versão do pnpm entre `packageManager`, `engines.pnpm` e `ENV PNPM_VERSION` são cobradas por `tests/cleanup/supply-chain-settings.test.ts`. A lista de libs banidas do ADR-0011 §4 é enforced por `@typescript-eslint/no-restricted-imports`, com a mensagem do ADR dentro do erro. Nenhuma das duas se repete aqui.

> ⚠️ **Cite [ADR-0029](../../handbook/architecture/adr/0029-pnpm-11-supply-chain-defaults.md), não o ADR-0012.** O 0012 está **Superseded** desde 2026-05-30 — a escolha do pnpm continua válida, mas a norma vigente (major 11 + defaults) é o 0029.

- **Setting de supply-chain não se afrouxa para destravar install.** As quatro de `pnpm-workspace.yaml` são mantidas explícitas mesmo coincidindo com o default do pnpm 11, porque explícito é auditável em diff de PR — e `trustPolicy: no-downgrade` é literalmente o vetor usado no caso `axios`. Se uma dependência recém-publicada travar a resolução, a saída é `minimumReleaseAgeExclude` **por pacote**; desligar a setting troca um bloqueio de minutos por uma janela permanente.

- **Dependência nova se justifica no PR, antes do merge** ([ADR-0011](../../handbook/architecture/adr/0011-supply-chain-hardening.md) §5): por que **esta** lib e não a alternativa — inclusive "implementar interno"; mantenedor com 2FA, atividade recente, bus factor; última publicação dentro de 6 meses. Antes disso, verificar se o **Node 24 já resolve**: `fetch` global, `crypto.randomUUID()`, `crypto.subtle`, `node --env-file`, `structuredClone`, `node --watch`, `node:test`. Cada dep removida é superfície de ataque a menos.

- **Ferramenta de teste nunca vira dependência de produção.** `@usebruno/cli` é `devDependency` pinada; o `src/` não a conhece. A exceção de supply-chain que ela exige é **cirúrgica, por versão**, no espírito do `undici-types@6.21.0` — não afrouxar a política global para acomodar uma ferramenta.

- **PBE (MagaluCloud) não recebe dado real** ([ADR-0021](../../handbook/architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md)). Ao editar config de deploy, `compose*.yaml` ou connection string de homologação: **sem** dump do legado, **sem** dado real ou pessoal, **sem** integração Bradesco real — só sandbox e dataset sintético. Produção e dado pessoal vivem na AWS (`sa-east-1`, residência BR). Esta restrição é de LGPD e **não tem enforcement mecânico**: depende de quem edita.

> **Dívida aberta — "dep crítica" nunca foi definida.** O ADR-0011 §3 manda pinar versão exata "se for dep crítica" e não diz o que é crítica. Resultado medido: **7 das 19 dependências de produção usam `^`**, e entre elas estão `jose` (assina e verifica JWT), `mysql2` (driver de banco), `@aws-sdk/client-s3` (cliente único de storage — ADR-0019), `nodemailer` e `resend` (envio em produção). `fastify`, `drizzle-orm` e `zod` foram pinadas. Não é norma vigente — é lacuna registrada, e por isso não virou gate: nasceria vermelho. A saída proposta pelo inventário de decisões é definir crítica **por função** (o que assina, o que fala com banco, o que sai pela rede), não por nome — critério por nome envelhece a cada dependência nova.

Lockfile, settings e corepack: [`pnpm-workspace-expert`](../agents/pnpm-workspace-expert.md) · risco de dependência: [`security-backend-expert`](../agents/security-backend-expert.md).
