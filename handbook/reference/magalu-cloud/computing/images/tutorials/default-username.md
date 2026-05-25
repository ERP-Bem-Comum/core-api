# Usuário padrão (default username) para acesso SSH em VMs Linux

Toda VM Linux criada a partir de uma imagem na **Magalu Cloud** possui um **usuário padrão do sistema (default username)**.

Esse usuário é definido pela própria imagem e é o que deve ser utilizado para conexão via **SSH**, juntamente com sua chave privada.

## 🔐 Comportamento padrão de segurança

Por padrão:

* Login via **senha** encontra-se desabilitado
* **Root login** está desabilitado
* O acesso é feito via **chave SSH + usuário padrão**

## 📍 Onde visualizar o usuário padrão no Console

1. Acesse o **Console da Magalu Cloud**
2. Vá em: **Início → Virtual Machines**
3. Clique na VM desejada
4. Na tela de detalhes, localize o campo: **→ Usuário padrão para acesso SSH**

Esse campo informa exatamente qual usuário deve ser utilizado no comando `ssh`.

## 📋 Tabela 1 — Usuários padrão por imagem

| Imagem | Versão | Usuário padrão SSH |
|--------|--------|-------------------|
| Ubuntu | 22.04 LTS | ubuntu |
| Ubuntu | 24.04 LTS | ubuntu |
| SQL Server Enterprise 2022 | Linux | sql |
| Debian | 12 | debian |
| Debian | 13 LTS | debian |
| Oracle Linux | 8 | cloud-user |
| Oracle Linux | 9 | cloud-user |
| Oracle Linux | 10 | cloud-user |
| Rocky Linux | 9 | rocky |
| Rocky Linux | 10 | rocky |
| Fedora | 42 | fedora |
| Fedora | 44 | fedora |
| OpenSUSE | 15.5 | opensuse |
| OpenSUSE | 15.6 | opensuse |

> **Nota:** Para instâncias Windows, consulte: [https://docs.magalu.cloud/docs/computing/virtual-machine/how-to/instances/access-win-instance](https://docs.magalu.cloud/docs/computing/virtual-machine/how-to/instances/access-win-instance)

## Como usar o usuário padrão na prática

Após identificar o usuário padrão no Console ou na tabela apresentada acima, conecte-se assim:

```
ssh -i /caminho/sua-chave.pem USUARIO@IP_PUBLICO
```

### Exemplo (Ubuntu)

```
ssh -i ~/.ssh/minha-chave.pem ubuntu@201.23.78.128
```

### Casos de uso comuns

#### Caso 1 — "Criei uma VM e preciso acessar via SSH"

* Crie a VM com uma chave SSH associada
* Copie o IP público da VM
* Consulte no Console o Usuário padrão para acesso SSH
* Execute o comando ssh utilizando o usuário correto

#### Caso 2 — "Quero dar acesso para outra pessoa sem compartilhar meu usuário"

❌ Não utilize o usuário padrão como usuário compartilhado.

O recomendado é:

* Acessar a VM com o usuário padrão
* Criar um novo usuário (ex.: maria, dev1, suporte)
* Adicionar a chave pública dessa pessoa em ~/.ssh/authorized_keys
* Opcional: conceder permissão sudo de forma controlada

## 👤 Criar um novo usuário com acesso SSH

### Passo 1 — Gerar um par de chaves SSH (na máquina do usuário)

```
ssh-keygen -t ed25519 -f ~/.ssh/id_novo_usuario
```

Isso irá gerar:

* id_novo_usuario → chave privada (não compartilhar)
* id_novo_usuario.pub → chave pública (será usada na VM)

### Passo 2 — Conectar na VM com o usuário padrão

```
ssh -i ~/.ssh/minha-chave.pem ubuntu@IP_PUBLICO
```

### Passo 3 — Criar o novo usuário

**Ubuntu / Debian**

```
sudo adduser novo_usuario --disabled-password
```

**Rocky / Fedora / openSUSE / Oracle Linux**

```
sudo adduser novo_usuario
```

### Passo 4 — Criar diretório .ssh para o usuário

```
sudo mkdir /home/novo_usuario/.ssh
sudo chmod 700 /home/novo_usuario/.ssh
```

### Passo 5 — Adicionar a chave pública

```
sudo nano /home/novo_usuario/.ssh/authorized_keys
```

Cole a chave pública em uma única linha.

```
sudo chmod 600 /home/novo_usuario/.ssh/authorized_keys
sudo chown -R novo_usuario:novo_usuario /home/novo_usuario/.ssh
```

### Passo 6 — Testar acesso

```
ssh -i ~/.ssh/id_novo_usuario novo_usuario@IP_PUBLICO
```

## 🗑 Remover um usuário

Remover usuário e diretório home:

```
sudo userdel -r novo_usuario
```

Manter diretório home:

```
sudo userdel novo_usuario
```

## 🔒 Boas práticas de segurança

> ❌ Não compartilhe chaves privadas
> ❌ Não use o usuário padrão para múltiplas pessoas
> ✅ Utilize usuários individuais
> ✅ Controle de acesso via chaves SSH
> ✅ Revogue usuários quando não forem mais necessários
