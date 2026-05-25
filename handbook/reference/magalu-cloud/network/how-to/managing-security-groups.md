# Gerenciamento de Grupos de Segurança nas suas VMs

## Visão Geral

Agora você pode gerenciar os grupos de segurança associados às interfaces de rede das suas Máquinas Virtuais (VMs) de forma mais consistente e intuitiva diretamente pelo console. Esta funcionalidade permite adicionar e remover grupos de segurança na interface de rede principal (NIC) de cada VM, oferecendo maior controle e flexibilidade na configuração de segurança.

## Benefícios

* **Controle Flexível**: Adicione ou remova múltiplos grupos de segurança na interface de rede principal de cada VM diretamente pelo console, sem a necessidade de usar a linha de comando.
* **Visibilidade Completa**: Visualize todos os grupos de segurança associados às interfaces de rede adicionais, garantindo maior transparência e controle sobre a segurança das suas VMs.
* **Facilidade de Uso**: Simplifique o gerenciamento das regras de segurança das suas VMs através de uma interface gráfica intuitiva.

A gestão das interfaces adicionais (NICs) continua disponível exclusivamente via CLI.

## Como Configurar

### Acessando o Console

1. **Login**: Acesse o Console da Magalu Cloud e faça login com suas credenciais.
2. **Navegação**: Vá para a seção de **Virtual Machines**

### Gerenciando Grupos de Segurança na Interface Principal

1. **Selecione a VM**: Clique na VM cuja interface de rede principal você deseja configurar.
2. **Acesse as Configurações de Rede**: Dentro dos detalhes da instância, vá para a aba ou seção de **Rede**.
3. **Visualize os Grupos de Segurança**: Na interface de rede principal (NIC), você verá a lista de grupos de segurança atualmente associados.
4. **Adicionar Grupo de Segurança**:
   * Clique em **Adicionar Grupo de Segurança**.
   * Selecione o grupo de segurança desejado a partir da lista disponível.
   * Confirme a adição clicando em **Salvar** ou **Aplicar**.
5. **Remover Grupo de Segurança**:
   * Identifique o grupo de segurança que deseja remover na lista.
   * Clique em **Remover** ou no ícone de lixeira ao lado do grupo.
   * Confirme a remoção quando solicitado.

### Visualizando Grupos de Segurança em Interfaces Adicionais

Embora a gestão das interfaces adicionais seja feita via CLI, você pode visualizar os grupos de segurança associados a essas interfaces diretamente no console:

1. **Interfaces Adicionais**: Na mesma seção de **Rede**, localize as interfaces adicionais listadas abaixo da interface principal.
2. **Verificar Grupos Associados**: Para cada interface adicional, verifique os grupos de segurança associados exibidos.

## Próximos Passos

* **Aprenda Mais**: Para gerenciar as interfaces adicionais via CLI, consulte a documentação detalhada sobre comandos de referência de rede.
* **Suporte**: Se você tiver dúvidas ou precisar de assistência, entre em contato com o suporte técnico.
