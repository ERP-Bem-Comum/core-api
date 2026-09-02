# Prompt para o Claude Code

Cole isto numa sessão de `claude` aberta na raiz do `core-api`, com o `gh` autenticado.
Ajuste o caminho de `TRIAGEM` para onde você descompactou este pacote.

---

Contexto: em 02/09/2026 rodou uma triagem das 160 issues abertas deste repositório, conferindo
cada uma contra o código no `571a14d7`. O resultado está em `TRIAGEM=<caminho>/triagem-core-api`.
Leia `$TRIAGEM/README.md` primeiro — ele explica a estrutura e o que já foi executado.

Três coisas, nesta ordem:

**1. Resgatar os fixes órfãos.** Leia `$TRIAGEM/resgate/RESGATE.md`. A branch
`fix/convenio-legado-879` sumiu do remoto; o commit `1837299e1caaf20c9869f7db10875706f72d3522`
pode ainda estar solto no GitHub. Confira com `bash $TRIAGEM/scripts/00-verificar.sh`. Se o objeto
ainda existir, recupere a branch e empurre; se não, aplique
`$TRIAGEM/resgate/0001-*.patch` sobre a `dev`. Faça o mesmo para a #517 (patches `0002` e `0004`,
os dois juntos — sem o `0004` o teste falha) e a #487 (`0003`). Rode
`node --test --experimental-strip-types 'tests/etl/**/*.test.ts' 'tests/scripts/**/*.test.ts'`
antes de abrir cada PR.

**2. Aplicar as reescritas.** Leia `$TRIAGEM/reescritas/reescritas.md`. Se os 6 títulos do bloco B
estiverem aprovados, rode `bash $TRIAGEM/scripts/01-reescritas.sh --apply`. Se algum título não
convencer, edite `$TRIAGEM/reescritas/titulos.tsv` antes.

**3. Decidir os 8 épicos.** Estão em `$TRIAGEM/dados/issues-classificadas.csv` com `acao=epico`.
Quatro (#481, #480, #479, #478) não têm um único rastro em `src/`, no handbook ou no git log —
são casca de organização. Antes de fechar, confira se algum Project ou Milestone depende deles, e
proponha para onde vai o conteúdo.

Regras: confirme comigo antes de fechar qualquer issue que não esteja marcada como `fechar` ou
`decisao` no CSV. Não confie na evidência do CSV sem reconferir no código — ela foi medida em
02/09 e o repositório andou desde então.
