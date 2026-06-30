# Importação de Imagens Customizadas

## Visão Geral

A Magalu Cloud oferece funcionalidade para adicionar suas próprias imagens de máquinas virtuais Linux. O processo depende do cloud-init, que gerencia configuração automática de rede, hostname e chaves SSH.

## Pré-requisitos Obrigatórios

### PRÉ-REQUISITOS DE ARQUIVO DA IMAGEM:

- **Formato QCOW2:** Imagem deve estar no formato QCOW2 (QEMU Copy-On-Write), otimizado para virtualização. Se em outro formato (`.vmdk`, `.vhd`, `.raw`), converta usando:

```
qemu-img convert -f <formato-origem> -O qcow2 <arquivo-origem> <arquivo-destino>.qcow2
```

- **Tamanho máximo:** Não pode ultrapassar 25GB
- **Upload para bucket MGC:** Faça upload da imagem `.qcow2` para Object Storage da MGC
- **URL pré-assinada:** Gere URL com prazo de expiração maior que 12 horas
- **Arquitetura suportada:** Apenas x86/64

### PRÉ-REQUISITOS DE CONFIGURAÇÃO DA IMAGEM:

- **Agente de inicialização:** Instale e habilite `cloud-init` para configuração automática
- **Servidor SSH:** Instale `openssh-server` com inicialização automática
- **Particionamento e redimensionamento:** Configure para expansão automática de partição e sistema de arquivos
- **Chaves SSH:** Acesso exclusivamente via chave SSH; cloud-init injeta chave pública em `~/.ssh/authorized_keys`
- **Configuração de rede:**
  - Remova endereços MAC fixos para evitar conflitos
  - Configure DHCP obrigatório para obtenção automática de IP
  - Desabilite firewall interno, use grupos de segurança da Magalu Cloud

## Parâmetros de Configuração

### Campos Obrigatórios

| Campo | Descrição | Formato | Exemplo |
|-------|-----------|---------|---------|
| `name` | Nome único da imagem | String (1-255 caracteres) | `"minha-imagem-nginx"` |
| `url` | URL HTTPS do arquivo `.qcow2` | String (URL HTTPS válida) | `"https://bucket.mgc.com/imagem.qcow2"` |
| `platform` | Sistema operacional | `"linux"` | `"linux"` |
| `license` | Tipo de licença | `"unlicensed"` | `"unlicensed"` |
| `architecture` | Arquitetura da imagem | `"x86/64"` | `"x86/64"` |
| `requirements.vcpu` | vCPUs mínimas | Inteiro > 0 | `4` |
| `requirements.ram` | RAM mínima em GB | Inteiro > 0 | `8` |
| `requirements.disk` | Espaço em disco mínimo em GB | Inteiro > 0 | `100` |

### Campos Opcionais

| Campo | Descrição | Formato | Padrão |
|-------|-----------|---------|--------|
| `description` | Descrição da imagem | String (1-200 caracteres) | — |
| `version` | Versão da imagem | String | — |
| `uefi` | Utiliza UEFI para boot | Boolean | `false` |

## Status da Imagem

| Status | Descrição |
|--------|-----------|
| `importing` | A imagem está sendo importada |
| `active` | A imagem está ativa e pronta para uso |
| `deleting` | A imagem está em processo de deleção |
| `deleted` | A imagem foi deletada |

## Como Usar

### Via CLI (Command Line Interface)

```
mgc vm images custom create \
  --name "minha-imagem-nginx" \
  --url "https://meu-bucket.magalu.cloud/minha-imagem.qcow2" \
  --platform linux \
  --architecture x86/64 \
  --license unlicensed \
  --version 1.0 \
  --description "Imagem customizada com NGINX e PostgreSQL" \
  --uefi \
  --requirements.disk 100 \
  --requirements.ram 8 \
  --requirements.vcpu 4
```

## Exemplo Prático de Importação de Imagem Customizada

Criar imagem customizada com Linux, 4 vCPUs mínimas, 8 GB RAM e 100 GB disco:

```
mgc vm images custom create \
  --name "ubuntu-customizada" \
  --url "https://meu-bucket.mgc.com/ubuntu-custom.qcow2" \
  --platform linux \
  --architecture x86/64 \
  --license unlicensed \
  --description "Ubuntu 22.04 com configurações personalizadas" \
  --uefi \
  --requirements.vcpu 4 \
  --requirements.ram 8 \
  --requirements.disk 100
```

## Principais Erros e Como Mitigá-los

| Erro Comum | Causa Provável | Mitigação |
|-----------|-----------------|-----------|
| Upload falha / timeout | Imagem grande / conexão instável | Reduzir imagem, dividir em partes, validar conectividade |
| Formato inválido | Arquivo não em QCOW2 | Converter com `qemu-img convert` |
| Falha no primeiro boot | Drivers faltando, SO "hardenizado" ou config incorreta | Testar em sandbox, manter SO vanilla, garantir cloud-init |
| Imagem lenta | Software pesado, dados persistentes | Reduzir imagem com SO + pacotes mínimos |
| Erro de credenciais SSH | Senhas/chaves em `~/.ssh/authorized_keys` | Remover arquivos `~/.ssh/authorized_keys` de usuários |
| Limite de tamanho excedido | Arquivo maior que suportado | Reduzir tamanho de disco virtual, excluir dados desnecessários |
| Erros no Cloud-init | Configuração apontando para datasources não suportados | Remover arquivo de configuração antes de gerar imagem |
| Image name already exists | Nome duplicado | Nome deve ser único dentro do tenant |
| Invalid characters in name | Caracteres especiais no nome | Usar apenas letras, números, traços ou underscores |
