# Queries Recomendadas

Livros em **PORTUGUÊS**. Termos consagrados (INVEST, MoSCoW) em inglês.

> **Citação literal:** use a tool `Grep` do Claude Code para buscar nos livros copiados em `handbook/reference/skills-base/requirements/`. Cite SEMPRE com `file_path:line_number`.

| Tópico                     | Comando                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Elicitação                 | `Grep("elicitação", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`              |
| Funcional vs não-funcional | `Grep("funcional não-funcional", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)` |
| Validação                  | `Grep("validação", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`               |
| Rastreabilidade            | `Grep("rastreabilidade", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`         |
| Gerenciamento de mudança   | `Grep("mudança escopo", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`          |
| INVEST                     | `Grep("INVEST", "handbook/reference/skills-base/requirements/historias-de-usuario.md", output_mode="content", -n)`                         |
| Critérios de aceitação     | `Grep("critério aceitação", "handbook/reference/skills-base/requirements/historias-de-usuario.md", output_mode="content", -n)`             |
| Priorização (MoSCoW/WSJF)  | `Grep("priorização MoSCoW", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`      |
