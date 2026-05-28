# Alterar tipo de volume

Alterar o tipo de Volume permite sejam alteradas as ofertas de IOPS do seu volume sem a necessidade de criar um novo Volume e copiar dados entre os tipos de volumes.

Para alterar o tipo de um volume, execute os passos abaixo.

## Pré-requisitos

- O volume deve estar no estado disponível (available)
- O volume não deve estar anexado a nenhuma instância
- O volume não deve possuir instant snapshots vinculados a ele

## Por Block Storage

👣 _Inicio > Menu > Block Storage_

1. Ao final do grid de listagem de VMs clicar no ícone de menu
2. No menu, clicar em "Alterar Quantidade de IOPS"
3. Na tela de Alteração de Quantidade de IOPS, clique na quantidade de IOPS desejada
4. Clique em "Salvar Modificações"

## Flags do Comando

| Nome | Tipo | Descrição | Obrigatório |
|------|------|-----------|------------|
| id | string | O id do Volume | Yes |
| new-type | string | O nome ou id do novo tipo de volume | Yes |
| new-type.id | string | O id do novo tipo de volume | No |
| new-type.name | string | O nome do novo tipo de volume | No |

### Exemplo de Comando

```bash
mgc block-storage volumes retype --id "ccea5ec2-851a-4c76-b8dd-dd53a025c96e" new-type.name "cloud_nvme10k"
```

> **Nota:** Acesse o documento para saber mais sobre quais Tipos de volumes disponíveis.
