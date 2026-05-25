# ACL

As **Listas de Controle de Acesso (ACLs)** são mecanismos usados para gerenciar o acesso a objetos e buckets dentro de sistemas de armazenamento de objetos. Elas permitem uma abordagem granular de controle de permissões, possibilitando que administradores definam regras específicas para diferentes usuários ou grupos, com base em suas necessidades de leitura, gravação, modificação ou exclusão de dados.

## O que é ACL e para que serve?

Uma **ACL (Access Control List)**, ou **Lista de Controle de Acesso**, é um conjunto de regras que define quais entidades (usuários, grupos ou sistemas) têm permissão para realizar determinadas ações sobre um recurso, como um bucket ou um objeto dentro de um sistema de armazenamento de objetos. ACLs são amplamente utilizadas para permitir que o acesso a esses recursos seja controlado de maneira granular, assegurando que as permissões sejam configuradas de acordo com as necessidades específicas de segurança e uso.

As ACLs são uma parte fundamental do controle de acesso em sistemas distribuídos e na nuvem, permitindo que administradores definam e ajustem permissões para múltiplos usuários ou serviços de maneira descentralizada. Isso garante que apenas entidades autorizadas possam acessar ou modificar os dados, o que é crucial para manter a segurança e conformidade em ambientes colaborativos ou multiusuário.

## Finalidade das ACLs

A principal finalidade de uma ACL é permitir o controle granular sobre **quem** pode acessar um recurso e **o que** pode ser feito com esse recurso. Isso inclui:

- **Controle de Acesso Refinado**: As ACLs permitem definir permissões específicas, como leitura, gravação ou exclusão, para diferentes usuários ou grupos.
- **Segurança de Dados**: Elas garantem que dados sensíveis sejam acessados ou modificados apenas por entidades autorizadas.
- **Escalabilidade**: Com a implementação correta, as ACLs permitem que o controle de acesso escale em sistemas com grandes volumes de objetos, sem a necessidade de intervenções manuais em cada operação.

## Estrutura de uma ACL

Cada objeto ou bucket pode ter uma ACL associada que define as permissões atribuídas a usuários ou grupos individuais. Essas listas normalmente consistem em:

- **Entidade**: O usuário, grupo ou sistema ao qual a permissão é concedida.
- **Permissão**: A ação que a entidade pode realizar, como leitura ou gravação.
- **Escopo**: Determina se a permissão se aplica a um bucket ou a um objeto específico dentro do bucket.

> Ao configurar a ACL do bucket, observe que as regras não são aplicáveis de forma recursiva, ou seja, não são transmitidas para os objetos contidos no bucket. Para aplicar regras de acesso aos objetos, utilize a ACL para Objetos.

## Componentes comuns de uma ACL

Uma ACL é composta por:

1. **Sujeito**: A entidade para quem a permissão é concedida (usuários, grupos, ou até acessos públicos).
2. **Ação**: O que a entidade pode fazer, como:
   - **Leitura (Read)**: Visualizar os dados de um objeto ou listar objetos dentro de um bucket.
   - **Gravação (Write)**: Modificar ou adicionar novos objetos a um bucket.
   - **Leitura de ACL (Read ACP)**: Permite ao favorecido ler a ACL do bucket ou objeto.
   - **Gravação de ACL (Write ACP)**: Permite ao favorecido gravar a ACL para o bucket ou objeto.
   - **Controle Total (Full Control)**: Permite ao beneficiário todas as permissões, incluindo READ, WRITE, READ_ACP e WRITE_ACP.
3. **Recurso**: O bucket ou objeto ao qual a permissão se aplica.

## Tabela de Permissões

| Tipo de Acesso | Aplicação a Buckets | Aplicação a Objetos |
|---|---|---|
| **public-read** | Qualquer usuário pode listar o conteúdo do bucket. | Qualquer usuário pode acessar e baixar o objeto. |
| **private** | Somente o proprietário tem acesso. | Somente o proprietário tem acesso ao objeto. |
| **write** | Criação de novos objetos; exclusões para proprietários. | Usuários autorizados podem modificar o objeto. |
| **read** | Apenas leitura dos objetos do bucket. | Apenas visualização dos metadados e conteúdo. |
| **read-acp** | Permite ler a ACL do bucket. | Permite ler a ACL do objeto. |
| **write-acp** | Permite gravar a ACL para o bucket. | Permite gravar a ACL para o objeto. |
| **full-control** | Todas as permissões. | Todas as permissões. |

## Práticas Recomendadas para Uso de ACLs

1. **Princípio do Menor Privilégio**: Conceda apenas as permissões necessárias para cada usuário ou grupo, garantindo que o acesso ao sistema seja o mais restrito possível.
2. **Monitoramento de Acesso**: Registre e audite o uso das ACLs para garantir que as permissões sejam aplicadas corretamente e para detectar possíveis falhas de segurança.
3. **Controle de Acesso Baseado em Função (RBAC)**: Além das ACLs, algumas plataformas permitem o uso de RBAC, permitindo o gerenciamento de permissões com base em funções organizacionais, como administradores ou usuários finais.

## Vantagens do Uso de ACLs

- **Controle Granular**: Permite um controle detalhado sobre quem pode acessar ou modificar dados, independentemente de onde o objeto está armazenado.
- **Isolamento de Dados**: Diferentes grupos de usuários podem operar dentro do mesmo sistema de armazenamento sem risco de acesso não autorizado.
- **Flexibilidade**: As permissões podem ser aplicadas tanto no nível de bucket quanto no nível de objeto, garantindo que diferentes dados tenham diferentes níveis de acesso.

## Desafios

- **Gerenciamento Complexo**: O gerenciamento de ACLs em grandes volumes de objetos pode ser desafiador. É recomendável o uso de políticas automatizadas.
- **Manutenção de Segurança**: ACLs mal configuradas podem gerar falhas de segurança, especialmente em permissões públicas.

## Considerações

As ACLs desempenham um papel fundamental no controle de acesso em sistemas de armazenamento de objetos, permitindo que organizações garantam a segurança e a integridade dos dados. Usadas corretamente, elas são uma ferramenta poderosa para gerenciar o acesso a grandes volumes de dados, oferecendo flexibilidade e controle granular.
