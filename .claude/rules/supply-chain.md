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

- **Toda `dependencies` tem versão exata; `devDependencies` pode usar faixa.** É a definição de "dep crítica" que o ADR-0011 §3 exigia e nunca deu — e ela saiu de medir, não de opinar: classificando as 19 dependências de produção por **função** (o que assina credencial, fala com banco, sai pela rede ou parseia entrada não confiável), o resultado foi **19 de 19**. Num backend, `dependencies` só carrega o que serve tráfego, então a fronteira crítica coincide com a borda entre os dois blocos do manifesto — e essa não envelhece a cada dependência nova, ao contrário de uma lista de nomes. Cobrada por `tests/cleanup/production-deps-pinned.test.ts`.

  > O `minimumReleaseAge` dá 24h de quarentena, mas com `^` a resolução ainda escolhe sozinha uma versão que ninguém revisou — basta ela envelhecer um dia. O lockfile já fixa a árvore; o que o pin acrescenta é que **subir de versão vira ato deliberado**, visível em diff de PR, que é onde a política do ADR-0011 consegue agir.

Lockfile, settings e corepack: [`pnpm-workspace-expert`](../agents/pnpm-workspace-expert.md) · risco de dependência: [`security-backend-expert`](../agents/security-backend-expert.md).
