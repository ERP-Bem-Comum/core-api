# Resgate dos três fixes órfãos — core-api

Verificado em 02/09/2026 contra `571a14d7` (HEAD da `main`, 1.0.0-rc.2).
Os três aplicam **limpo**, sem conflito. Typecheck limpo; 732 testes passando, 0 falhas.

## ⚠️ Urgente: a branch da #879 sumiu do remoto durante esta sessão

Às 19:52 o clone ainda trouxe `origin/fix/convenio-legado-879`. Às 20:40 ela **não existe mais**
na lista de branches do GitHub. O commit `1837299e1caaf20c9869f7db10875706f72d3522` ainda resolve
pela API (objeto solto), mas **nenhuma referência aponta para ele** — o GC do GitHub apaga esses
objetos sem aviso, e aí o único conserto de um bloqueio P1 em produção teria se perdido de vez.

Este diretório tem o commit preservado de três formas: os `.patch`, o `.bundle` e o texto abaixo.

**Recuperar agora:**

```bash
git fetch origin 1837299e1caaf20c9869f7db10875706f72d3522
git branch fix/convenio-legado-879 1837299e1caaf20c9869f7db10875706f72d3522
git push -u origin fix/convenio-legado-879
```

Se o objeto já tiver sido coletado, use o bundle:

```bash
git fetch resgate-3-fixes.bundle 'refs/heads/resgate:refs/heads/resgate-3-fixes'
```

---

## 1. #879 — convênio "LEGADO" trava conta migrada (P1, produção)

Commit `1837299e` (01/09, autoria sua). Aplica sem conflito no HEAD.

- `scripts/etl/financial/mapper.ts` — o ETL para de gravar `convenio: 'LEGADO'` e passa a gravar
  vazio. Vazio é o estado que o domínio já sabe tratar: `checkCedenteRemittanceReadiness` responde
  `cedente-convenio-missing`, que diz ao operador o que preencher e em qual tela.
- `edit-cedente-account.ts` — "já definido" deixa de ser `!== ''` e passa a perguntar à
  `checkCedenteRemittanceReadiness`, a mesma régua que decide se a conta gera remessa. Convênio
  malformado passa a aceitar correção; convênio válido continua recusando a troca (invariante da
  #722 preservado). Uma régua só para o mesmo fato — que é o defeito que a #837 fechou do outro
  lado do módulo.

Resolver isto provavelmente fecha também a **#938** (validar em produção) e destrava a **#873**
(promoção do go-live), que dependem dela.

## 2. #517 — scripts de e2e destroem banco e secrets do dev

Branch apagada na limpeza de 31/07; commit preservado na tag
`archive/fix/e2e-scripts-non-destructive-517` (`e1fca4e6`, 18/08). Aplica limpo 273 commits depois.

Cria `scripts/e2e/_e2e-env.sh` (projeto Docker isolado `core-api-test` + backup/restore de secrets),
faz os quatro smokes passarem por ele e adiciona uma guarda de regressão.

**Precisa da emenda `0004`.** A guarda exige que todo `.sh` de `scripts/e2e/` faça source do helper,
e o `server-env.sh` nasceu depois (`b4d28e7e`, ADR-0068) — ele é `source`ado, não é um smoke. Sem a
emenda o teste falha.

## 3. #487 — plano-filho vira raiz órfã no ETL de Orçamento

Branch apagada; commit na tag `archive/fix/etl-budget-plans-orphan-parent-487` (`23b38277`, 18/08).
Aplica limpo, sem emenda.

---

## Reconstruir as duas branches apagadas

```bash
git fetch origin '+refs/tags/*:refs/tags/*'

git checkout -b fix/e2e-scripts-non-destructive-517 archive/fix/e2e-scripts-non-destructive-517
git rebase dev
git am < 0004-test-e2e-*.patch
git push -u origin fix/e2e-scripts-non-destructive-517

git checkout -b fix/etl-budget-plans-orphan-parent-487 archive/fix/etl-budget-plans-orphan-parent-487
git rebase dev
git push -u origin fix/etl-budget-plans-orphan-parent-487
```

## Alternativa: aplicar os quatro patches de uma vez sobre a dev

```bash
git checkout -b fix/resgate-879-517-487 dev
git am 000*.patch
```
