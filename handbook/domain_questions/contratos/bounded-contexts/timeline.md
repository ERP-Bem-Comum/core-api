# 🧩 Bounded Context: Memória Operacional (Timeline)

## 1. Papel do Contexto no Mapa
Este é um **Supporting Domain**. Sua principal missão é atuar como uma "caixa-preta" de avião para os contratos. Ele não decide regras de valor, mas registra tudo o que acontece (eventos) e guarda as provas (documentos). Ele transforma o histórico, antes inexistente, em uma trilha **append-only** (apenas inclusão).

## 2. Atores
* **Auditor**: Principal consumidor. Utiliza a Timeline para verificar o histórico de conformidade.
* **Operador**: Visualiza a cronologia para entender a evolução do contrato.
* **Gestor**: Alimenta a timeline indiretamente ao operar contratos e aditivos.

## 3. Agregados e Entidades
```ts
interface EventoTimeline {
  id: EventoID;
  contratoId: ContratoID;
  tipoEvento: TipoEvento; // Criacao, Aditivo, Upload, Homologacao
  descricao: string;
  timestamp: Date;
  autor: UsuarioRef;
  metadata: JSON; // Detalhes do que mudou (ex: valor_anterior -> valor_novo)
}

interface Documento {
  id: ArquivoID;
  nomeOriginal: string;
  categoria: CategoriaDoc; // Contrato Mae, Aditivo, Distrato
  hashIntegridade: string;
  urlStorage: string;
  dataUpload: Date;
}
```

> **Raciocínio**: A Timeline não é uma tabela de log genérica, mas uma entidade de domínio que agrupa Eventos e Documentos vinculados a um contrato específico para contar uma história.

## 4. Value Objects e Enums

* **TipoEvento**: `CONTRATO_CRIADO`, `ADITIVO_REGISTRADO`, `ADITIVO_HOMOLOGADO`, `DOCUMENTO_ANEXADO`, `STATUS_ALTERADO`.
* **CategoriaDoc**: `CONTRATO_MAE`, `ADITIVO`, `OFICIO`, `DISTRATO`.

## 5. Comandos / Casos de Uso Principais

### Registrar Evento na Timeline
* **Quem chama**: Sistema (via eventos de outros contextos).
* **Pré-condições**: Um evento de domínio válido deve ter ocorrido.
* **Efeitos**: Adiciona um novo marco imutável na trilha do contrato.
* **Evento publicado**: N/A (Consumidor final).

### Armazenar Documento
* **Quem chama**: Gestor (via interface de Contratos ou Aditivos).
* **Pré-condições**: O arquivo deve passar pela validação de integridade.
* **Efeitos**: Gera uma referência única e segura no storage, vinculando-a ao Contrato.
* **Evento publicado**: `DocumentoDisponibilizado`.

## 6. Eventos de Domínio

| Evento | Gatilho | Descrição |
| :---- | :---- | :---- |
| TimelineAtualizada | Qualquer inclusão de marco | Indica que a história do contrato tem um novo capítulo. |
| TentativaDeExclusaoDetectada | Comando de deleção | Dispara alerta se alguém tentar apagar um registro da timeline. |

## 7. Máquinas de Estado (Visibilidade)

Diferente dos outros contextos, aqui o estado é uma **Lista Linear Acumulativa**:

1. [Data T0] Contrato Mãe Cadastrado (Evento + PDF).
2. [Data T1] Aditivo de Prazo Registrado (Evento).
3. [Data T2] Documento de Aditivo Assinado (Upload).
4. [Data T3] Aditivo salvo/registrado (Evento + Recálculo).

## 8. Invariantes e Regras de Negócio

* **R1 (Imutabilidade)**: Um evento registrado na Timeline **nunca** pode ser editado ou excluído. Erros são corrigidos com um "Evento de Retificação".
* **R2 (Rastreabilidade)**: Todo evento deve obrigatoriamente conter o ID do usuário que realizou a ação.
* **R3 (Integridade Documental)**: Nenhum documento pode ser "substituído". Caso um novo arquivo seja enviado, ele entra como uma nova versão, mantendo a versão anterior no histórico.

## 9. Fluxo Exemplar ("Filminho")

Um Auditor abre o contrato `001-2024`. Em vez de ver apenas o valor atual, ele vê uma linha do tempo. Ele percebe que em 10/03 o valor era X, e em 15/04 o Gestor "Carlos" homologou um aditivo que elevou para Y. Ele clica no ícone de "olho" exatamente naquele ponto da linha do tempo e o PDF assinado abre instantaneamente. O Auditor confirma que a governança foi seguida.

## 10. Glossário Específico

* **Append-only**: Modelo de dados onde apenas inserções são permitidas, proibindo atualizações (updates) ou deleções (deletes) de registros existentes.
* **Timeline**: A representação visual e lógica da jornada de vida do contrato.
