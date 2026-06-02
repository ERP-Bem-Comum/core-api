# Queries Recomendadas

> **Citação literal:** use a tool `Grep` do Claude Code para buscar nos livros copiados em `handbook/reference/skills-base/requirements/`. Cite SEMPRE com `file_path:line_number`.

| Tópico                            | Comando                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Por que INVEST tem 6              | `Grep("INVEST", "handbook/reference/skills-base/requirements/historias-de-usuario.md", output_mode="content", -n)`                       |
| Origem do conceito de história    | `Grep("definição história", "handbook/reference/skills-base/requirements/historias-de-usuario.md", output_mode="content", -n)`           |
| Funcional vs não-funcional (raiz) | `Grep("não-funcional", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`         |
| Validação vs verificação          | `Grep("validação verificação", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)` |
| Rastreabilidade (defesa)          | `Grep("rastreabilidade", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`       |
| Gerenciamento de mudança          | `Grep("mudança escopo", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`        |
