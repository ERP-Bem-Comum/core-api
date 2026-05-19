[← Voltar ao Módulo Contratos](./README.md)

# 🔌 Integrações e Fronteiras Externas — Contratos

> **Status:** vigente | **Última revisão:** 2026-04-28

---

## 1. Sistemas e Fronteiras

O Módulo de Contratos não é uma ilha. Ele interage com serviços de infraestrutura e outros módulos de negócio. Para evitar que mudanças nesses sistemas quebrem o cálculo de valor vigente, utilizamos **ACL (Anticorruption Layer)**.

## 2. Mapa de Integrações

| Alvo | Sistema | Como Contratos enxerga | Padrão Utilizado |
| :--- | :--- | :--- | :--- |
| **Financeiro** | Módulo Financeiro (Contas a Pagar) | Consumidor de saldo e teto orçamentário. | ACL |
| **Storage Documental** | S3 / Blob (provedor cloud) | Cofre de arquivos assinado e imutável. | Adapter |
| **Identidade** | Auth / RBAC do ERP | Provedor de perfis (Gestor, Auditor, etc). | Conformist |
| **Auditoria** | Engine de logs (outbox + sink) | Coletor de rastros de segurança. | Published Language |

## 3. Detalhamento das Integrações

### 🏦 Integração Financeira (Contas a Pagar)

Contratos **fornece** o **Estado Vigente** ao Financeiro. **Não** consome regras fiscais ou de retenção.

- **Fluxo:** Quando aditivo é homologado → emite `EstadoContratualAtualizado` → Financeiro atualiza teto disponível para empenho.
- **Isolamento via ACL:** Se o Financeiro exigir campos como "Centro de Custo" ou "Rubrica", a ACL traduz `ContratoID` para os códigos financeiros necessários sem poluir a entidade `Contrato`.
- **Detalhe operacional:** O canal físico é a [outbox em MySQL](../../architecture/04-integration-events.md), não chamada HTTP síncrona.

### 📂 Integração de Storage (Documentação)

Resolve a "gestão documental inexistente" com segurança.

- **Fluxo:** Sistema envia o arquivo, recebe referência única (`storageKey`) e calcula `hashSha256` no upload.
- **Regra:** O domínio de Contratos **não sabe** *onde* o arquivo está guardado, apenas que possui referência válida e imutável.
- **Adapter:** Implementação trocável (S3 da AWS hoje, Cloud Storage do GCP amanhã) sem afetar o domínio.

### 🔑 Integração de Identidade (RBAC)

Conforma-se aos perfis de acesso globais da organização.

| Perfil | Comandos permitidos |
| :--- | :--- |
| **Gestor** | Cadastro, anexo de documentos, homologação de aditivos. |
| **Operador** | Consulta, download, preview. |
| **Auditor** | Leitura irrestrita de Timeline e auditoria. |
| **Administrador** | Parâmetros globais; exclusão lógica de documentos. |

> Apenas Gestor e Administrador podem excluir documentos (`RN-SEG-02`).

## 4. Padrões Aplicados

1. **Anticorruption Layer (ACL)** — Usada no Financeiro para que regras contábeis complexas (retenções, FITID, CNAB) não contaminem a lógica de soma de aditivos.
2. **Open Host Service (OHS)** — Contratos expõe linguagem pública (`EstadoContratualAtualizado`) para que outros módulos consumam o valor vigente de forma padronizada.
3. **Adapter** — Storage encapsulado por interface; troca de provedor cloud é local ao adapter.
4. **Conformist** — RBAC herda perfis do ERP global; Contratos não cria perfis novos.

## 5. Compliance e Conformidade

### LGPD
Documentos podem conter dados pessoais (representantes legais, fiscais, procuradores). Aplicam-se princípios de minimização e necessidade.

- Acesso a documentos respeita perfil RBAC.
- Ambientes não produtivos usam dados anonimizados/mascarados.

### Assinatura Eletrônica
Quando documento for assinado eletronicamente, o sistema armazena hash, versão e evidências de validação compatíveis com Lei 14.063/2020.

## 6. Resumo em 3 frases

> O Módulo de Contratos protege seu núcleo de cálculo contra mudanças em sistemas externos através de tradutores (ACL). Nenhuma falha no Storage ou mudança no Financeiro deve corromper a integridade da Timeline. A comunicação externa é baseada estritamente em eventos de "Estado Atualizado" via outbox.

## 7. Referências

- [`../../architecture/04-integration-events.md`](../../architecture/04-integration-events.md) — Outbox pattern e catálogo de eventos cross-fronteira.
- [`../../architecture/03-data-architecture.md`](../../architecture/03-data-architecture.md) — Database `core` e isolamento.
- [`../../architecture/adr/0014-mysql-database-isolation.md`](../../architecture/adr/0014-mysql-database-isolation.md) — Isolamento por database em MySQL.
- [`../README.md`](../README.md) — Módulo Financeiro (consumidor de `EstadoContratualAtualizado`).
