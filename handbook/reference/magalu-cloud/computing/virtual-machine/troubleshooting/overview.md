# Visão Geral

Durante o ciclo de vida de uma VM, ela pode passar por diferentes states (como `new`, `error`, `running`, `stopped`, `suspended`, `deleted`) e status (como `creating`, `retyping`, `rebooting`, `creating_error_capacity`, `creating_network_error`, dentre outros). Saiba mais sobre status e states na MGC clicando [aqui](../concepts/status-and-states.md).

Os status `creating_error_*` ou `creating_*_error` indicam que o processo de provisionamento da VM foi concluído com erro.

Essa seção de _Troubleshooting_ reúne as principais formas de identificar e entender problemas que podem ocorrer durante o ciclo de vida de uma Máquina Virtual (VM) na Magalu Cloud.
Os exemplos são baseados nos valores retornados pela API de Virtual Machines, na CLI (mgc) e no comportamento do provider Terraform.

> Os nomes exatos dos _status_ e rótulos podem variar entre API, Console, CLI e Terraform. Por isso, esta documentação organiza os erros por **categoria**, usando exemplos apenas como referência.

A fonte principal de diagnóstico é sempre o campo `error.message` retornado pela API e exibido pela CLI e Terraform.

## Como os erros aparecem nas ferramentas

### API

A API retorna campos importantes para diagnóstico:

*   `state` – estado geral da VM
*   `status` – etapa da operação (pode variar)
*   `error.slug` – mensagem curta que resume o tipo de falha
*   `error.message` – mensagem humana e detalhada

Exemplo:

```json
{
  "state": "new",
  "status": "creating_error_capacity",
  "error": {
    "slug": "create_instance.capacity.error",
    "message": "An error occurred due to a lack of available capacity..."
  }
}
```

### CLI

Como a criação é assíncrona, na CLI o erro aparece no comando:

```
mgc vm instances get <id>
```

Exemplo:

```
> mgc vm instances get ca123e4e-56a7-890e-1e23-4bb567adf8c9
availability_zone: br-se1-a
created_at: "2025-11-14T17:47:52Z"
error:
    message: An error occurred due to a lack of available capacity for GPU/DP instances. Please try again later or contact support for assistance.
    slug: create_instance.capacity.error
id: ca123e4e-56a7-890e-1e23-4bb567adf8c9
image:
    id:  d1d234e5-ad6b-7e89-b123-e45bb678901f
     name: cloud-ubuntu-24.04 LTS
    platform: linux
machine_type:
    disk: 100
    id: 1c234a56-7cc8-9b0e-123c-45b6a789c012
    name: L40x1-DP8-64-100
    ram: 65536
    vcpus: 8
name: example
network:
    interfaces:
    - associated_public_ipv4: 201.23.69.4
      id: 1b234c56-b789-0b12-b374-5fb678d901d2
      ip_addresses:
          private_ipv4: 123.45.6.7
          public_ipv6: 1234:56:7ea8:c9f0::12
      name: port-example
      primary: true
      security_groups:
      - 12a3fadd-b45f-6b7c-a890-123ee456789a
    vpc:
        id: b12e3fe4-b567-8901-23a4-567e8cf90cfb
        name: vpc_default
ssh_key_name: my-key
state: new
status: creating_error_capacity
updated_at: "2025-11-14T17:48:11Z"
```

### Terraform

O Terraform não mostra state nem status, apenas a mensagem detalhada:

```
mgc_virtual_machine_instances.example: Still creating... [00m20s elapsed]
╷
│ Error: An unexpected error occurred
│
│   with mgc_virtual_machine_instances.example,
│   on main.tf line 15, in resource "mgc_virtual_machine_instances" "example":
│   15: resource "mgc_virtual_machine_instances" "example" {
│
│ An error occurred due to a lack of available capacity for GPU/DP instances. Please try again later or
│ contact support for assistance.
```
