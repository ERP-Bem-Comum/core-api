# Como Gerenciar Rotas na Tabela de Roteamento da VPC

## Disponibilidade limitada

O gerenciamento de Tabelas de Roteamento está disponível a partir da **CLI** e do **Terraform** na região br-se1. O suporte no Console e na região br-ne1 está previsto para uma próxima versão.

A **Tabela de Roteamento** de uma VPC permite definir caminhos específicos para o tráfego de rede, determinando para onde os pacotes devem ser encaminhados com base no CIDR de destino. Com ela, você tem controle centralizado sobre o fluxo de comunicação entre sub-redes, serviços gerenciados e recursos externos, sem depender de configurações manuais em cada instância.

Cada rota define dois elementos principais:

* **Destino (`cidr_destination`):** O bloco de endereços IP de destino do tráfego (ex: `172.20.0.0/16`).
* **Próximo salto (`port_id`):** A porta de rede (VNIC) da VM ou appliance que irá receber e encaminhar esse tráfego.

---

## Casos de Uso

A criação de rotas customizadas é indicada para arquiteturas que exigem controle granular do tráfego, como:

* **Arquiteturas Multi-tenant com VPN Site-to-Site:** Direcionar o tráfego de cada tenant para a VM de firewall responsável pela VPN correspondente, sem depender de configuração manual em cada instância.
* **Acesso externo para Serviços Gerenciados (DBaaS):** Como serviços gerenciados não permitem acesso ao sistema operacional, a rota na VPC é o único mecanismo para direcionar o tráfego desses serviços por um gateway ou firewall.
* **Segmentação de Tráfego por Camada:** Separar o fluxo de produção, staging e desenvolvimento, garantindo que cada ambiente siga seu próprio caminho de rede.
* **Appliances Virtuais (Firewalls e Proxies):** Forçar que todo tráfego de uma sub-rede passe por uma VM intermediária para inspeção ou filtragem antes de sair para a internet.
* **Comunicação entre Sub-redes na Mesma VPC:** Habilitar o roteamento direto entre sub-redes de uma mesma VPC ou zonas de disponibilidade distintas.

---

## Pré-requisitos

1. **Uma VPC existente** com ao menos uma sub-rede configurada.
2. **Uma Porta (VNIC) criada** na VPC, que será usada como próximo salto (`port_id`).
3. **CLI MGC** instalada e autenticada, **ou** o **Provider Terraform para MGC** configurado.

### Obtendo o Port ID

```bash
mgc network vpcs ports list --vpc-id="[ID_DA_SUA_VPC]"
```

---

## Operações Disponíveis

### Criando uma Rota

```bash
mgc network vpcs route-table routes create [ID_DA_SUA_VPC] \
  --cidr-destination="172.20.0.0/16" \
  --port-id="[ID_DA_PORTA_NEXT_HOP]" \
  --description="Rota para rede interna do tenant A"
```

**Parâmetros do comando:**

| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `[vpc-id]` | ✅ Sim | ID da VPC onde a rota será criada. |
| `--cidr-destination` | ✅ Sim | Bloco CIDR de destino do tráfego (ex: `172.20.0.0/16`). |
| `--port-id` | ✅ Sim | ID da porta (VNIC) que atuará como próximo salto. |
| `--description` | ❌ Não | Texto livre para identificar a finalidade da rota. |

#### Resultado Esperado

```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "pending"
}
```

### Listando Rotas da VPC

```bash
mgc network vpcs route-table routes list --vpc-id="[ID_DA_SUA_VPC]"
```

**Filtrando e ordenando:**

```bash
mgc network vpcs route-table routes list --vpc-id="[ID_DA_SUA_VPC]" --zone="a"
mgc network vpcs route-table routes list --vpc-id="[ID_DA_SUA_VPC]" --sort="cidr_destination:asc"
mgc network vpcs route-table routes list --vpc-id="[ID_DA_SUA_VPC]" --page=2 --items-per-page=20
```

| Parâmetro | Descrição |
|-----------|-----------|
| `--zone` | Filtra rotas por zona de disponibilidade (ex: `a`, `b`). |
| `--sort` | Ordena os resultados. Campos válidos: `id`, `port_id`, `description`, `cidr_destination`, `type`, `status`. |
| `--page` | Número da página (padrão: `1`, mínimo: `1`). |
| `--items-per-page` | Quantidade de itens por página (padrão: `10`, máximo: `100`). |

### Consultando uma Rota Específica

```bash
mgc network vpcs route-table routes get \
  --vpc-id="[ID_DA_SUA_VPC]" \
  --route-id="[ID_DA_ROTA]"
```

**Exemplo de resposta:**

```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "vpc_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "port_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "cidr_destination": "172.20.0.0/16",
  "description": "Rota para rede interna do tenant A",
  "next_hop": "10.10.20.53",
  "type": "default",
  "status": "created"
}
```

### Excluindo uma Rota

```bash
mgc network vpcs route-table routes delete \
  --vpc-id="[ID_DA_SUA_VPC]" \
  --route-id="[ID_DA_ROTA]"
```

---

## Ciclo de Vida de uma Rota

| Status | Descrição |
|--------|-----------|
| `pending` | A rota foi aceita e está aguardando processamento. |
| `processing` | A rota está sendo provisionada na infraestrutura. |
| `created` | A rota está ativa e o tráfego já está sendo roteado. |
| `error` | Ocorreu uma falha durante o provisionamento. Verifique os parâmetros e tente novamente. |
| `deleting` | A rota está em processo de exclusão. |
| `deleted` | A rota foi removida com sucesso. |

---

## Exemplo Completo: Arquitetura com Firewall Virtual

```bash
# 1. Obtenha o ID da VPC
mgc network vpcs list

# 2. Identifique a porta da VM de firewall
mgc network vpcs ports list --vpc-id="vpc-xxxxxxxx"

# 3. Crie a rota apontando para a porta do firewall
mgc network vpcs route-table routes create "vpc-xxxxxxxx" \
  --cidr-destination="10.100.0.0/24" \
  --port-id="port-xxxxxxxx" \
  --description="Tráfego on-premise via firewall virtual"

# 4. Confirme que a rota está ativa
mgc network vpcs route-table routes list --vpc-id="vpc-xxxxxxxx"
```

---

## Próximos Passos

* Consulte o guia de **[Gerenciamento de Rotas via Terraform](manage-routing-table-terraform.md)** para automatizar o provisionamento como código (IaC).
* Para configurar a interface de rede (VNIC) usada como próximo salto, veja **[Como Adicionar e Configurar uma Nova Interface de Rede](additional-vnic.md)**.
