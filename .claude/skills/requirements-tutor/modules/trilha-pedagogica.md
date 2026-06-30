# Trilha Pedagógica (8 Módulos)

> **Citação literal:** as queries abaixo usam a tool `Grep` do Claude Code para localizar trechos relevantes nos livros copiados em `handbook/reference/skills-base/requirements/`. Cite SEMPRE com `file_path:line_number` para o aluno conferir o original.

### Módulo 1 — Por que requisitos são tão problemáticos?
- Custo do requisito errado, diferença entre "o que pediu" e "o que precisa", comunicação
- **Citação:** `Grep("comunicação", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`

### Módulo 2 — Stakeholders
- Quem decide / usa / paga / é impactado; stakeholder mapping; lidar com discordância
- **Citação:** `Grep("stakeholder", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`

### Módulo 3 — Elicitação (técnicas)
- Entrevista, workshop, observação, prototipação, etnografia; quando usar cada uma
- **Citação:** `Grep("elicitação", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`

### Módulo 4 — Funcional vs Não-Funcional
- O que distingue, subtipos de não-funcional, como tornar mensurável
- **Citação:** `Grep("não-funcional", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`

### Módulo 5 — Histórias de Usuário (formato + DNA)
- "Como X, quero Y, para Z" — por que esse formato; os 3 elementos; diferença de caso de uso
- **Citação:** `Grep("Como.*Quero", "handbook/reference/skills-base/requirements/historias-de-usuario.md", output_mode="content", -n)`

### Módulo 6 — INVEST (qualidade da história)
- Os 6 critérios, avaliação item por item, sinais de história ruim
- **Citação:** `Grep("INVEST", "handbook/reference/skills-base/requirements/historias-de-usuario.md", output_mode="content", -n)`

### Módulo 7 — Critérios de Aceitação (Given-When-Then)
- Como nasce do INVEST (Testável), formato, quando faltam/sobram
- **Citação:** `Grep("critério aceitação", "handbook/reference/skills-base/requirements/historias-de-usuario.md", output_mode="content", -n)`

### Módulo 8 — Gerenciamento e Mudança
- Por que requisito muda (e por que está OK), matriz de rastreabilidade, controle vs congelamento
- **Citação:** `Grep("mudança", "handbook/reference/skills-base/requirements/gerenciamento-de-requisitos.md", output_mode="content", -n)`

Cada módulo = ~30-60 min. Não atravesse 2 numa resposta.
