# Como Usar o Anti Spoofing

O Anti Spoofing é uma configuração de segurança a nível de porta de rede (VNIC) que determina se a porta pode enviar e receber tráfego de endereços IP ou MAC que não são os seus.

A gestão dessa funcionalidade é crucial para dois cenários principais:

* **Proteção Ativada (Padrão):** No modo padrão (`true`), a proteção está ativa. Isso garante que a porta de rede só possa usar os endereços IP a ela atribuídos, bloqueando tentativas de falsificação de identidade (IP spoofing) e garantindo a segurança do ambiente. Esta é a configuração recomendada para a maioria das VMs.

* **Proteção Desativada:** Para casos de uso específicos, como transformar uma VM em um **Firewall**, **Roteador** ou **Gateway NAT**, é necessário que a VM inspecione e encaminhe pacotes de outros endereços. Para permitir essa operação, a proteção Anti Spoofing na porta deve ser desativada (`false`).

## Habilitar ou Desabilitar o Anti Spoofing

> Atualmente, a gestão da funcionalidade de Anti Spoofing está disponível apenas através da **CLI**.

Para gerenciar o Anti Spoofing via CLI, utilize o comando `mgc network ports update`. Você precisará do ID da porta de rede (`port-id`) que deseja modificar.

## Desabilitar Anti Spoofing

Para permitir que sua VM atue como um intermediário de rede, **desabilite** a proteção na porta correspondente usando a flag `--ip-spoofing-guard` com o valor `false`:

```bash
mgc network ports update [port-id] --ip-spoofing-guard=false
```
