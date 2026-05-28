# Criar instância Linux

## Visão Geral

Para criar uma instância Linux na Magalu Cloud, você pode usar o Console, CLI ou o gerador de comandos. O processo envolve selecionar região, imagem do sistema operacional, tipo de instância, configurações de rede e chave SSH.

## Passos no Console

1. Acesse Virtual Machines e clique em "Criar instância"
2. Escolha a região mais próxima dos usuários da sua aplicação
3. Selecione uma imagem e versão do SO desejado
4. Defina o tipo de instância (vCPUs, RAM, disco local)
5. Opcionalmente, atribua um IPv4 público (IPv6 é gerado automaticamente)
6. Insira ou selecione uma chave SSH existente
7. Defina o nome da instância (apenas minúsculas, hífen, underline e números)

## Comandos CLI

### Por Nome

```
mgc virtual-machines instances create --name="name_instance" --machine-type.name="type_instance" --image.name="image_name" --ssh-key-name="ssh_key_name"
```

### Por ID

```
mgc virtual-machines instances create --name="name-instance-1" --machine-type.id="45d57c50-61d3-46fc-992e-77f5605dd561" --image.id="57b93394-a161-4b32-8262-52a6f4148837" --ssh-key-name="ssh_key_name"
```

## Flags Obrigatórias

| Flag | Tipo | Descrição |
|------|------|-----------|
| `--name` | string | Nome da instância (1-255 caracteres) |
| `--image` | object | Nome ou ID da imagem |
| `--machine-type` | object | Tipo de instância (BV ou DP) |
| `--ssh-key-name` | string | Chave SSH para acesso |

## Notas Importantes

- "Associar um IPv4 Público à instância serve para exposição de serviços na Internet conforme estiver configurado no Security Group relacionado a ela"
- O gerador de comando facilita a criação com seleção visual de imagens e tipos de máquina disponíveis
