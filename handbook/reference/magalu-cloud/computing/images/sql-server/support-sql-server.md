# Suporte para Imagens SQL Server

## O que a Magalu Cloud oferece

Ao utilizar uma imagem SQL Server na Magalu Cloud, você recebe:

✅ **Imagem pré-configurada**:
- Sistema operacional (Windows ou Linux) com o SQL Server instalado.
- Configuração padrão do SQL Server para facilitar a inicialização.

✅ **Infraestrutura de nuvem**:
- Criação e execução de máquinas virtuais (VMs).
- Rede e conectividade básica da VM.
- Acesso às configurações Security Groups.
- Suporte para problemas de provisionamento da VM.

✅ **Acesso administrativo**:
- O usuário recebe controle total sobre a VM.
- Permissão para configurar e gerenciar o SQL Server conforme necessário.

---

## O que NÃO está incluído no suporte

❌ **Administração do SQL Server**:
- A Magalu Cloud não gerencia o banco de dados SQL Server.
- Não realizamos ajustes de configuração, otimização ou troubleshooting interno do SQL Server.
- Ajustes de performance, criação de usuários e permissões são responsabilidade do usuário.

❌ **Backup e recuperação de dados**:
- O usuário é responsável por configurar e garantir a segurança dos backups.
- A Magalu Cloud não realiza backups automáticos dos bancos de dados.

❌ **Suporte a aplicações ou consultas SQL**:
- A Magalu Cloud não oferece suporte a queries SQL, stored procedures ou debugging de aplicações conectadas ao SQL Server.

---

## Responsabilidades do Usuário

Ao utilizar uma imagem SQL Server na Magalu Cloud, o usuário deve:

- Gerenciar e manter o SQL Server (incluindo atualizações e patches).
- Configurar e monitorar a segurança do banco de dados.
- Criar e gerenciar backups para evitar perda de dados.
- Realizar troubleshooting interno do SQL Server caso ocorram erros na aplicação ou banco.
- Configurar corretamente Security Groups para permitir conexões externas, se necessário.

---

## Casos de Suporte

| Cenário | Magalu Cloud dá suporte? |
|---------|-------------------------|
| A VM não inicia corretamente | ✅ Sim |
| Acesso RDP/SSH não funciona | ✅ Sim |
| SQL Server está lento ou com erro interno | ❌ Não |
| Como criar um backup do SQL Server? | ❌ Não |
| Como restaurar um banco de dados? | ❌ Não |
| Problema de conexão devido a Security Groups | ✅ Sim |
| Como alterar permissões no SQL Server? | ❌ Não |
| SQL Server parou de funcionar após atualização interna | ❌ Não |
