# 🔌 Contexto de Integração e Fronteiras Externas

## 1. Sistemas e Fronteiras
O Módulo de Contratos não é uma ilha. Ele precisa interagir com serviços de infraestrutura e outros módulos de negócio. Para evitar que mudanças nesses sistemas quebrem o cálculo de valor vigente, utilizamos uma **ACL (Camada de Anti-Corrupção)**.

## 2. Papel do Contexto de Integração
Este contexto atua como um tradutor. Ele converte a linguagem técnica de APIs externas para a **Linguagem Ubíqua** do nosso domínio. Se o sistema de arquivos mudar de fornecedor, ou o Financeiro mudar de nome de campo, apenas este contexto sofre alteração.

## 3. Mapa de Integrações

| Alvo | Sistema | Como o Módulo de Contratos enxerga | Padrão Utilizado |
| :--- | :--- | :--- | :--- |
| **Financeiro** | Contas a Pagar | Um consumidor de saldo e teto orçamentário. | **ACL** |
| **Documentos** | Storage (S3/Blob) | Um cofre de arquivos assinado e imutável. | **Adapter** |
| **Identidade** | Auth / RBAC | O provedor de perfis (Gestor, Auditor, etc). | **Conformist** |
| **Auditoria** | Engine de Logs | Um coletor de rastros de segurança. | **Published Language** |

## 4. Papéis de cada Integração

### 🏦 Integração Financeira (Contas a Pagar)
O Módulo de Contratos fornece o **Estado Vigente**.
* **Fluxo**: Quando um aditivo é homologado, enviamos o novo valor total.
* **Isolamento**: Se o Contas a Pagar exigir campos como "Centro de Custo" ou "Rubrica", a ACL traduz nosso `ContratoID` para os códigos financeiros necessários sem poluir nossa entidade `Contrato`.

### 📂 Integração de Storage (Documentação)
Responsável por garantir que a "gestão inexistente" seja resolvida com segurança.
* **Fluxo**: O sistema envia o arquivo, recebe uma referência única e um `hash` de integridade.
* **Regra**: O domínio de contratos não sabe *onde* o arquivo está guardado, apenas que ele possui uma referência válida e imutável.

### 🔑 Integração de Identidade (RBAC)
O sistema se conforma aos perfis de acesso globais da organização.
* **Gestor**: Permissão para comandos de escrita e homologação.
* **Operador/Auditor**: Permissão restrita a consultas (Read-only).

## 5. Padrões Aplicados
1.  **Anti-Corruption Layer (ACL)**: Usada no Financeiro para que regras contábeis complexas não interfiram na lógica de soma de aditivos.
2.  **Open Host Service (OHS)**: O Módulo de Contratos expõe uma "linguagem pública" para que outros módulos (como o Portal do Cliente) consumam o valor vigente de forma padronizada.

## 6. Resumo em 3 frases
> O Módulo de Contratos protege seu núcleo de cálculo contra mudanças em sistemas externos através de tradutores (ACL). Nenhuma falha no sistema de arquivos ou mudança no financeiro deve corromper a integridade da Timeline. A comunicação externa é baseada estritamente em eventos de "Estado Atualizado".