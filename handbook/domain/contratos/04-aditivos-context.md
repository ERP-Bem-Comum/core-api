[← Voltar ao Módulo Contratos](./README.md)

# 🧩 Bounded Context: Aditivos e Alterações

> **Status:** vigente | **Última revisão:** 2026-04-28

---

## 1. Papel do Contexto no Mapa

Este é um **Core Domain ⭐**. Sua função é **isolar a complexidade das regras de alteração contratual**. Enquanto Gestão de Contratos mantém o estado atual, este contexto gerencia o "voto de mudança". Garante que um aditivo só impacte o financeiro após a anexação do documento assinado e a homologação formal.

## 2. Atores

- **Gestor** — Cria a proposta de aditivo, anexa o arquivo assinado e executa a homologação.
- **Operador** — Consulta o histórico de aditivos pendentes ou homologados.

## 3. Agregados e Entidades

```ts
interface Aditivo {
  id: AditivoID;
  contratoId: ContratoID; // Referência ao Contrato Mãe
  numeroAditivo: string;  // Ex: AD 01-001/2026
  tipo: TipoAditivo;
  status: StatusAditivo;

  // Dados da Alteração
  valorImpacto: Moeda; // Positivo (Acréscimo) ou Negativo (Supressão)
  novaDataFim: Date | null; // Preenchido apenas se tipo = Prazo
  descricaoAlteracao: string;

  // Comprovação
  arquivoAssinadoRef: ArquivoID | null;
  dataHomologacao: Date | null;
  usuarioHomologacao: UsuarioRef | null;
}
```

> **Raciocínio:** O Aditivo é uma entidade independente que "aponta" para um contrato. Ele carrega consigo a intenção da mudança e a prova documental.

## 4. Value Objects e Enums

- **TipoAditivo:**
  - `Acrescimo` — Aumenta o valor financeiro.
  - `Supressao` — Reduz o valor financeiro.
  - `Prazo` — Altera a vigência temporal.
  - `Variado` — Alterações textuais/cláusulas (sem impacto financeiro ou de prazo).
- **StatusAditivo:** `Pendente` (criado mas sem documento/homologação) → `Homologado` (formalizado e aplicado).

> Estados intermediários como `Rascunho`, `Rejeitado`, `Cancelado` aparecem na Especificação técnica mas no domínio MVP são derivados pela ausência ou presença das condições acima — modelo simplificado para a primeira fase.

## 5. Comandos / Casos de Uso Principais

### Registrar Intenção de Aditivo
- **Quem chama:** Gestor.
- **Pré-condições:** Contrato alvo deve estar `Vigente`.
- **Efeitos:** Cria registro com status `Pendente`.
- **Evento publicado:** `AditivoRegistrado`.

### Anexar Documento Assinado
- **Quem chama:** Gestor.
- **Pré-condições:** Aditivo `Pendente`.
- **Efeitos:** Vincula referência do arquivo.
- **Evento publicado:** `DocumentoAditivoAnexado`.

### Homologar Aditivo
- **Quem chama:** Gestor.
- **Pré-condições:** Documento assinado presente.
- **Efeitos:** Status → `Homologado`; registra data e usuário.
- **Evento publicado:** `AditivoHomologado` (gatilho do recálculo no contexto de Gestão de Contratos).

## 6. Eventos de Domínio

| Evento | Gatilho | Descrição |
| :--- | :--- | :--- |
| `AditivoRegistrado` | Criação no sistema | Alteração em negociação ou preparo. |
| `DocumentoAditivoAnexado` | Upload do PDF assinado | Aditivo passa a ter prova documental. |
| `AditivoHomologado` | Homologação com documento presente | Gatilho principal para atualizar saldo. |

## 7. Invariantes e Regras de Negócio

- **R1 (Bloqueio de Cálculo)** — Aditivo `Pendente` **nunca** soma/subtrai do valor vigente do contrato.
- **R2 (Obrigatoriedade de Arquivo)** — Impossível homologar sem `arquivoAssinadoRef` preenchido.
- **R3 (Integridade de Tipo)** — Se `Acrescimo`, `valorImpacto` deve ser positivo. Se `Supressao`, negativo.
- **R4 (Cronologia)** — Não se pode homologar aditivo com data retroativa ao início do Contrato Mãe.
- **R5 (Numeração)** — Sequencial seguindo o padrão `AD NN-NNN/AAAA` referenciando o contrato pai.

## 8. Fluxo Exemplar ("Filminho")

O Gestor percebe que o contrato `001/2026` precisa de mais R$ 50.000,00. Cria aditivo de **Acréscimo** (`AD 01-001/2026`). Sistema salva como `Pendente` — valor do contrato continua o original. Gestor faz upload do PDF assinado e clica em **Homologar**. Sistema dispara `AditivoHomologado` → contexto de Gestão de Contratos recalcula → emite `EstadoContratualAtualizado` → Timeline registra evento + arquivo → Financeiro atualiza saldo disponível.

## 9. Glossário Específico

- **Acréscimo** — Aumento formal do valor global (ex: ampliação de escopo).
- **Supressão** — Redução formal do valor global (ex: redução de escopo).
- **Homologação** — Ato administrativo que valida o aditivo e torna seus efeitos financeiros reais.
