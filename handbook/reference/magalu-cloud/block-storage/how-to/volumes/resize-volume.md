# Redimensionar o volume

Para redimensionar um volume, execute os passos abaixo.

> O redimensionamento de volume só é possível incrementalmente, ou seja, aumentando o seu tamanho.

## Pré-requisitos

- O volume deve estar no estado disponível (available)
- O volume não deve estar anexado a nenhuma instância
- O novo tamanho do volume precisa ser maior ou igual ao volume existente

## Console

1. Ao final do grid de listagem de Volumes clicar no ícone de menu
2. No menu, clicar em "Redimensionar Volume"
3. Na tela de Redimensionamento de volume, clique na quantidade de armazenamento desejada
4. Clique em "Salvar Modificações"

## CLI

| Nome | Tipo | Descrição | Obrigatório |
|------|------|-----------|-------------|
| id | string | O id do Volume | Sim |
| size | string | O novo tamanho do Volume em GiB | Sim |

```bash
mgc block-storage volumes extend --id "ccea5ec2-851a-4c76-b8dd-dd53a025c96e" --size 20
```
