# Como Gerenciar Rotas na Tabela de Roteamento via Terraform

## Disponibilidade limitada

O gerenciamento de Tabelas de Roteamento está disponível a partir da **CLI** e do **Terraform** na região br-se1. O suporte no Console e na região br-ne1 está previsto para uma próxima versão.

Este guia demonstra como provisionar e gerenciar rotas na **Tabela de Roteamento** de uma VPC da Magalu Cloud utilizando o **Provider Terraform para MGC**.

## Pré-requisito

Certifique-se de que o **Provider Terraform para MGC** está configurado no seu projeto antes de prosseguir. Consulte a [documentação de configuração do provider](https://registry.terraform.io/providers/MagaluCloud/mgc/latest/docs) para os passos iniciais.

---

## Recursos Disponíveis

| Tipo | Nome | Descrição |
|------|------|-----------|
| Resource | `mgc_network_vpcs_route` | Cria e gerencia uma rota na tabela de roteamento da VPC. |
| Data Source | `mgc_network_vpcs_route` | Consulta os detalhes de uma rota existente pelo seu ID. |
| Data Source | `mgc_network_vpcs_routes` | Lista todas as rotas associadas a uma VPC. |

---

## Criando uma Rota

### Configuração Básica

```hcl
resource "mgc_network_vpcs_route" "exemplo" {
  vpc_id           = "seu-vpc-id"
  port_id          = "seu-port-id"
  cidr_destination = "172.20.0.0/16"
  description      = "Rota para rede interna do tenant A"
}
```

### Schema do Recurso

**Argumentos obrigatórios:**

| Argumento | Tipo | Descrição |
|-----------|------|-----------|
| `vpc_id` | `string` | ID da VPC onde esta rota será criada. |
| `port_id` | `string` | ID da porta (VNIC) que atuará como próximo salto. |
| `cidr_destination` | `string` | Bloco CIDR de destino do tráfego. |

**Argumentos opcionais:**

| Argumento | Tipo | Descrição |
|-----------|------|-----------|
| `description` | `string` | Texto descritivo para identificar a finalidade da rota. |

**Atributos somente leitura (computed):**

| Atributo | Tipo | Descrição |
|----------|------|-----------|
| `id` | `string` | ID único da rota gerado pela plataforma. |
| `next_hop` | `string` | Endereço IP privado resolvido a partir da porta informada. |
| `status` | `string` | Status atual da rota (`created`, `processing`, `error`, etc.). |
| `type` | `string` | Tipo da rota, conforme definido pelo serviço de rede. |

### Imutabilidade dos Campos

Todos os campos deste recurso utilizam `RequiresReplace`, o que significa que qualquer alteração nos valores de `vpc_id`, `port_id`, `cidr_destination` ou `description` resultará na **destruição e recriação** da rota.

---

## Exemplo Completo: Referenciando Recursos Existentes

```hcl
data "mgc_network_vpcs" "minha_vpc" {}

data "mgc_network_vpcs_interface" "firewall_port" {
  vpc_id = "seu-vpc-id"
}

resource "mgc_network_vpcs_route" "rota_onpremise" {
  vpc_id           = "seu-vpc-id"
  port_id          = "seu-port-id"
  cidr_destination = "10.100.0.0/24"
  description      = "Tráfego on-premise via firewall virtual"
}

output "rota_id" {
  value = mgc_network_vpcs_route.rota_onpremise.id
}

output "next_hop_ip" {
  description = "Endereço IP do próximo salto resolvido pela plataforma"
  value       = mgc_network_vpcs_route.rota_onpremise.next_hop
}

output "rota_status" {
  value = mgc_network_vpcs_route.rota_onpremise.status
}
```

---

## Exemplo Avançado: Múltiplas Rotas para Arquitetura Multi-tenant

```hcl
locals {
  tenants = {
    tenant_a = {
      cidr        = "192.168.10.0/24"
      port_id     = "port-id-firewall-a"
      description = "Rota tenant A - VPN dedicada"
    }
    tenant_b = {
      cidr        = "192.168.20.0/24"
      port_id     = "port-id-firewall-b"
      description = "Rota tenant B - VPN dedicada"
    }
    tenant_c = {
      cidr        = "192.168.30.0/24"
      port_id     = "port-id-firewall-c"
      description = "Rota tenant C - VPN dedicada"
    }
  }
}

resource "mgc_network_vpcs_route" "rotas_tenants" {
  for_each = local.tenants

  vpc_id           = "seu-vpc-id"
  port_id          = each.value.port_id
  cidr_destination = each.value.cidr
  description      = each.value.description
}

output "rotas_criadas" {
  value = {
    for key, rota in mgc_network_vpcs_route.rotas_tenants :
    key => {
      id       = rota.id
      next_hop = rota.next_hop
      status   = rota.status
    }
  }
}
```

---

## Consultando Rotas com Data Sources

### Consultando uma Rota por ID

```hcl
data "mgc_network_vpcs_route" "existente" {
  id     = mgc_network_vpcs_route.exemplo.id
  vpc_id = mgc_network_vpcs_route.exemplo.vpc_id
}

output "detalhes_rota" {
  value = data.mgc_network_vpcs_route.existente
}
```

### Listando Todas as Rotas de uma VPC

```hcl
data "mgc_network_vpcs_routes" "todas_rotas" {
  vpc_id = "seu-vpc-id"
}

output "lista_rotas" {
  value = data.mgc_network_vpcs_routes.todas_rotas.routes
}
```

---

## Importando Rotas Existentes

```bash
terraform import mgc_network_vpcs_route.minha_rota "seu-vpc-id,seu-route-id"
```

Após o import, execute `terraform plan` para confirmar que o estado local está sincronizado com a infraestrutura real antes de fazer qualquer alteração.

---

## Boas Práticas

* **Use variáveis para IDs:** Evite hardcode de `vpc_id` e `port_id`. Utilize variáveis ou referências a outros recursos Terraform para manter o código reutilizável.
* **Planeje antes de aplicar:** Execute `terraform plan` antes de qualquer `terraform apply`.
* **Atenção ao `RequiresReplace`:** Como todos os campos da rota são imutáveis, alterações geram recriação do recurso.
* **Documente com `description`:** Sempre preencha o campo `description` com informações sobre a finalidade da rota.

---

## Próximos Passos

* Consulte o guia de **[Gerenciamento de Rotas via CLI](manage-vpc-routing-tables.md)** para operações manuais ou scripts pontuais.
* Para entender a configuração da porta usada como próximo salto, veja **[Como Definir um Endereço IP Privado na Criação de VNIC](custom-ip-vnic-create.md)**.
