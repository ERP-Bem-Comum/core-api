[← Voltar ao Módulo Contratos](./README.md)

# 🧩 Bounded Context: Memória Operacional (Timeline)

> **Status:** vigente | **Última revisão:** 2026-04-28

---

## 1. Papel do Contexto no Mapa

Este é um **Supporting Domain**. Sua principal missão é atuar como uma "caixa-preta de avião" para os contratos. Não decide regras de valor, mas **registra tudo o que acontece (eventos)** e **guarda as provas (documentos)**. Transforma o histórico, antes inexistente, em uma trilha **append-only**.

## 2. Atores

- **Auditor** — Principal consumidor. Verifica histórico de conformidade.
- **Operador** — Visualiza cronologia para entender a evolução do contrato.
- **Gestor** — Alimenta a timeline indiretamente ao operar contratos e aditivos.

## 3. Agregados e Entidades

```ts
interface EventoTimeline {
  id: EventoID;
  contratoId: ContratoID;
  tipoEvento: TipoEvento; // CONTRATO_CRIADO, ADITIVO_HOMOLOGADO, etc.
  descricao: string;
  timestamp: Date;
  autor: UsuarioRef;
  metadata: JSON; // Detalhes do que mudou
}

interface Documento {
  id: ArquivoID;
  nomeOriginal: string;
  categoria: CategoriaDoc; // CONTRATO_MAE, ADITIVO, OFICIO, DISTRATO
  hashIntegridade: string; // SHA-256
  storageKey: string;      // referência opaca no storage
  dataUpload: Date;
  versaoDocumento: number;
  statusDocumento: StatusDocumento; // ativo, substituido, excluido_logicamente
}
```

> **Raciocínio:** A Timeline não é uma tabela de log genérica. É uma entidade de domínio que agrupa Eventos e Documentos vinculados a um contrato específico para contar uma história.

## 4. Value Objects e Enums

- **TipoEvento** — `CONTRATO_CRIADO`, `ADITIVO_REGISTRADO`, `ADITIVO_HOMOLOGADO`, `DOCUMENTO_ANEXADO`, `STATUS_ALTERADO`.
- **CategoriaDoc** — `CONTRATO_MAE`, `ADITIVO`, `OFICIO`, `DISTRATO`.
- **StatusDocumento** — `ativo`, `substituido`, `excluido_logicamente`.

## 5. Comandos / Casos de Uso Principais

### Registrar Evento na Timeline
- **Quem chama:** Sistema (via eventos de outros contextos).
- **Pré-condições:** Evento de domínio válido ocorreu.
- **Efeitos:** Adiciona novo marco imutável na trilha do contrato.
- **Evento publicado:** N/A (consumidor final).

### Armazenar Documento
- **Quem chama:** Gestor (via interface de Contratos ou Aditivos).
- **Pré-condições:** Arquivo passa pela validação de integridade (hash).
- **Efeitos:** Gera referência única e segura no storage, vinculando ao Contrato.
- **Evento publicado:** `DocumentoDisponibilizado`.

### Excluir Documento (Lógica)
- **Quem chama:** Gestor ou Administrador.
- **Pré-condições:** Justificativa preenchida.
- **Efeitos:** Marca documento como `excluido_logicamente`; preserva o registro.
- **Evento publicado:** `DocumentoExcluidoLogicamente`.

## 6. Eventos de Domínio

| Evento | Gatilho | Descrição |
| :--- | :--- | :--- |
| `TimelineAtualizada` | Qualquer inclusão de marco | A história do contrato tem novo capítulo. |
| `DocumentoDisponibilizado` | Upload bem-sucedido com hash validado | Nova evidência anexada e disponível. |
| `DocumentoExcluidoLogicamente` | Exclusão com justificativa | Registro permanece para auditoria. |
| `TentativaDeExclusaoDetectada` | Comando de deleção física | Alerta de violação de política. |

## 7. Modelo de Estado

Diferente dos outros contextos, aqui o estado é uma **Lista Linear Acumulativa**:

```
[T0] Contrato Mãe Cadastrado (Evento + PDF)
[T1] Aditivo Registrado (Evento)
[T2] Documento de Aditivo Assinado (Upload)
[T3] Aditivo Homologado (Evento + Recálculo)
[T4] Estado Atualizado (Evento sistema)
```

## 8. Invariantes e Regras de Negócio

- **R1 (Imutabilidade)** — Evento registrado **nunca** pode ser editado ou excluído. Erros são corrigidos com **Evento de Retificação**.
- **R2 (Rastreabilidade)** — Todo evento deve conter o ID do usuário que realizou a ação.
- **R3 (Integridade Documental)** — Documentos não são "substituídos" — entram como nova versão, mantendo a anterior.
- **R4 (Hash obrigatório)** — Todo arquivo armazenado tem hash SHA-256 calculado e persistido.
- **R5 (Retenção)** — Documentos têm `retencaoAte` configurável por categoria; nunca é apagado fisicamente antes desse prazo.

## 9. Fluxo Exemplar ("Filminho")

Auditor abre o contrato `001/2026`. Vê uma linha do tempo: 10/03 valor era X; 15/04 Gestor "Carlos" homologou aditivo elevando para Y. Clica no ícone "olho" naquele ponto e o PDF assinado abre instantaneamente. Auditor confirma que governança foi seguida.

## 10. Glossário Específico

- **Append-only** — Modelo de dados onde apenas inserções são permitidas; updates/deletes proibidos.
- **Timeline** — Representação visual e lógica da jornada de vida do contrato.
- **Evento de Retificação** — Novo evento que corrige a interpretação de um anterior, sem apagá-lo.
