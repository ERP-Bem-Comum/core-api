# Anexar uma NIC a uma instância

Para integrar uma interface de rede a uma máquina virtual, execute este comando CLI:

```
mgc virtual-machines instances network-interface --instance.id="0377d966-4a2d-485f-81b9-37273ba26471" --network.interface.id="0138757f-032c-4699-899c-a268cc477710"
```

## Pré-requisitos

Você deve possuir uma NIC previamente criada no serviço Network.

## Parâmetros Necessários

| Parâmetro | Tipo | Função | Obrigatório |
|-----------|------|--------|------------|
| instance.id | string | Identificador da instância | Sim |
| network.interface.id | string | Identificador da interface de rede | Sim |

**Nota:** Esta funcionalidade será disponibilizada no console em breve, estando atualmente acessível apenas através da interface de linha de comando.
