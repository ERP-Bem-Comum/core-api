# Visão Geral

O Object Storage da Magalu Cloud é uma solução de armazenamento de objetos em nuvem, **compatível com a API S3**, que se destaca pela sua escalabilidade, segurança e confiabilidade. Este serviço é ideal para atender às diversas necessidades de armazenamento de dados de empresas de todos os portes e setores.

O serviço foi projetado para atender às diversas necessidades de **armazenamento de dados de empresas de todos os portes e setores**, oferecendo desempenho consistente e integração simples com ferramentas e aplicações compatíveis com S3.

## Object Storage vs. Block Storage: Qual escolher?

Ao planejar sua infraestrutura na nuvem, uma das decisões mais importantes é definir como seus dados serão armazenados. Embora ambos ofereçam escalabilidade e segurança, o **Block Storage** e o **Object Storage** servem a propósitos muito diferentes.

Enquanto o armazenamento em bloco é ideal para sistemas que exigem baixa latência e acesso direto ao disco (como bancos de dados), o armazenamento de objetos é a escolha perfeita para grandes volumes de dados não estruturados, como arquivos estáticos, backups e mídias.

## Estrutura do Object Storage

O serviço de Object Storage da Magalu Cloud é estruturado em dois componentes principais: **buckets** e **objetos**.

### Buckets

Buckets são contêineres de armazenamento de alto nível que organizam e agrupam objetos relacionados. Eles fornecem uma estrutura lógica para o armazenamento, facilitando a organização e o acesso eficiente aos dados.

### Objetos

Objetos são unidades de dados armazenadas no serviço de Object Storage. Eles podem incluir arquivos, imagens, vídeos ou documentos, e são identificados por uma chave única dentro de um bucket. Os objetos podem ter tamanhos variados e são armazenados de maneira durável, permitindo acesso e manipulação conforme necessário.

### Pastas (Estrutura Lógica)

Diferente de um sistema de arquivos tradicional (como o do seu computador), o Object Storage utiliza uma estrutura de **armazenamento estático (flat)**. Isso significa que não existem pastas reais ou subdiretórios físicos dentro de um Bucket.

No entanto, para facilitar a organização e a gestão dos seus dados, o Object Storage utiliza o conceito de **prefixos**:

- **Organização por Prefixos**: Quando você visualiza uma "pasta" no console ou via API, o sistema está apenas interpretando o nome do objeto. Por exemplo, em um objeto chamado `fotos/viagem/imagem.jpg`, a sequência `fotos/viagem/` atua como um prefixo que simula uma estrutura de diretórios.

- **Hierarquia Virtual**: Essa organização facilita a filtragem de objetos, a aplicação de políticas de acesso específicas para determinados grupos de arquivos e a navegação visual pelo usuário.

- **Flexibilidade**: Você pode criar quantos níveis de prefixos desejar, permitindo organizar milhões de objetos de forma lógica sem comprometer a performance de acesso.

No Object Storage, as pastas são criadas automaticamente ao enviar um arquivo com um caminho definido no nome, ou podem ser criadas manualmente para organizar a estrutura antes do upload dos dados.

### Recursos Disponíveis

O Object Storage da Magalu Cloud é compatível com o protocolo S3 (Simple Storage Service), oferecendo um conjunto completo de funcionalidades que refletem as capacidades do S3. A seguir, estão detalhadas as funcionalidades disponíveis em nossas regiões:

- **Criação e Gerenciamento de Buckets**: Permite a criação e gestão de buckets para organizar e armazenar objetos conforme suas necessidades específicas. Os usuários podem criar, listar e excluir buckets com facilidade.

- **Upload e Download de Objetos**: Suporte para o upload e download de objetos de qualquer tamanho para e a partir de seus buckets, garantindo uma transferência eficiente de dados. Para configuração de permissões de acesso (ACL-Grantee), consulte a documentação de ACL da AWS CLI.

- **Gerenciamento de Objetos**: Inclui operações para gerenciar objetos, como a cópia entre buckets e a exclusão de objetos. Os usuários têm controle total sobre os objetos armazenados.

- **Versionamento de Objetos**: Oferece suporte ao versionamento, permitindo que os usuários mantenham um histórico de versões anteriores de um objeto. Isso possibilita a restauração de versões anteriores e o rastreamento das alterações ao longo do tempo.

- **Controle de Acesso**: Configuração de políticas de controle de acesso (ACL) para assegurar a segurança e a privacidade dos dados armazenados. As permissões podem ser ajustadas para atender às necessidades específicas de acesso e controle.

- **Criação de URLs Pré-Assinadas**: Permite a geração de URLs pré-assinadas para acessar objetos de forma temporária e segura. Esses URLs possuem uma validade limitada e podem ser compartilhados com terceiros, facilitando o acesso aos objetos sem a necessidade de autenticação adicional.

- **Armazenamento Cold Instant**: Por padrão, novos objetos utilizam a classe de armazenamento "standard", que é adequada para acessos frequentes. No entanto, para muitos casos, o acesso aos objetos armazenados pode ser raro e o principal objetivo é garantir que eles sejam mantidos por longos períodos, ainda que disponíveis para acesso rápido quando necessário.

Exemplos: backups, logs, registros arquivados para cumprimento de legislações.

- **Bucket policy**: São regras de controle de acesso associadas a um bucket de armazenamento, que definem quem pode acessar ou gerenciar os objetos armazenados dentro desse bucket e de que forma. Essas políticas permitem que você controle permissões de forma detalhada, especificando ações permitidas, condições para acesso e usuários ou grupos que têm acesso.

### Benefícios

**Alta Escalabilidade**: O Object Storage da Magalu Cloud é projetado para escalar conforme as necessidades dos clientes. Oferece escalabilidade ilimitada, permitindo que empresas de todos os tamanhos armazenem e gerenciem dados globalmente sem comprometer o desempenho.

- **Alta Disponibilidade**: Com operações de alta disponibilidade em duas regiões brasileiras — Sudeste e Nordeste — o produto garante que os usuários possam acessar e compartilhar seus dados de forma confiável em todo o território nacional e globalmente.

- **Segurança Avançada**: A segurança dos dados é uma prioridade para a Magalu Cloud. O Object Storage oferece criptografia avançada, autenticação por API Key e controles de acesso granulares para proteger os dados contra ameaças internas e externas.

- **Conformidade Regulatória Local**: O armazenamento de dados no Brasil garante que a Magalu Cloud esteja em conformidade com as regulamentações nacionais. Isso assegura que dados críticos que precisam ser armazenados em território brasileiro estejam sempre acessíveis e protegidos conforme as normas locais.

- **Acessibilidade**: A arquitetura flexível e as interfaces intuitivas, tanto via CLI quanto no Console, proporcionam acesso e recuperação de dados de forma rápida e eficiente, oferecendo uma experiência do usuário superior.

- **Alta Confiabilidade**: Com uma infraestrutura robusta, suportada por datacenters de tecnologia de ponta e uma equipe especializada em suporte 24/7, o serviço de Object Storage da Magalu Cloud é uma solução confiável para o armazenamento de dados críticos. O suporte está disponível em português, garantindo um atendimento eficiente em todo o país.

- **Cobrança Transparente**: O modelo de cobrança do Object Storage é baseado na metrificação unitária por GB armazenado e trafegado, com preços competitivos e acessíveis. A cobrança é realizada em reais (R$), sem impostos adicionais. Além disso, o consumo é detalhado e transparente, permitindo aos clientes visualizar claramente os serviços utilizados e os valores correspondentes.
