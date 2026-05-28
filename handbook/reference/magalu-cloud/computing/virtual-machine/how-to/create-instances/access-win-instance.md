# Acessar instância Windows

Este documento fornece orientações para acessar remotamente uma máquina Windows usando o protocolo RDP e [Remmina](https://remmina.org/).

## Pré-requisitos

Você já deve ter uma instância Windows. Se não possuir, consulte [Criar uma instância Windows](create-win-instance.md).

## Habilitando porta

A porta _3389_ deve estar habilitada para permitir acesso remoto via RDP ao Windows Server.

Para habilitar a porta:

1. Acesse sua instância no painel do serviço de nuvem
2. Navegue até os Detalhes da instância
3. Na seção "Rede", localize "Grupos de Segurança"
4. Clique em "Adicionar regra"
5. Configure a nova regra:
   - Clique em "Avançado"
   - Selecione "TCP" como protocolo
   - Escolha "Ingress" como direção
   - Defina a porta como "3389"
   - Especifique IP de origem como "0.0.0.0"
   - Clique em "Adicionar regra"

## Remote Desktop Connection

Para usuários Windows:

1. Abra "Menu Iniciar" e digite "Conexão de Área de Trabalho Remota"
2. Insira o IP da máquina Windows e clique "Conectar"
3. Quando solicitado, insira as credenciais:
   - Nome de usuário: **admin**
   - Senha: consulte a senha gerada automaticamente no portal

## Remmina (Linux)

Para usuários Linux, instale via terminal:

```
sudo apt-get install remmina
```

### Configurando Remmina

1. Abra o Remmina em sua máquina Linux
2. Clique em "Conexão" > "Nova conexão"
3. Selecione "RDP" como protocolo
4. No campo "Servidor", digite o IP ou nome do computador remoto
5. Nome de usuário: **admin**
6. Senha: consulte a senha gerada no portal
7. Preencha o nome da sessão, se desejar
8. Clique em "Salvar"

Sua conexão será salva na tela inicial. Para conectar, clique duas vezes na entrada.
