# Visão Geral

No gerenciamento de acesso a recursos em sistemas de armazenamento de objetos, existem quatro componentes principais: **Buckets Públicos e Privados**, **ACL (Access Control List)**, **Bucket Policy** e **CORS (Cross-Origin Resource Sharing)**.

Cada um desses mecanismos tem suas características e níveis de controle sobre quem pode acessar ou modificar os dados.

## 1. Buckets Públicos e Privados

A configuração de buckets como públicos ou privados é a forma mais básica de controle de acesso.

> Mesmo com um bucket configurado como público, isso permite apenas a **listagem** dos objetos.

- **Buckets Públicos**: qualquer pessoa com acesso à URL poderá listar todos os objetos no bucket.
- **Buckets Privados**: apenas o proprietário do bucket e usuários autorizados terão acesso ao conteúdo.

## 2. ACL (Access Control List)

As **ACLs** oferecem um controle mais granular em comparação com a simples configuração de buckets públicos ou privados. Com as ACLs, é possível definir permissões específicas para diferentes usuários ou grupos em nível de objeto ou bucket.

**Vantagens**:

- Permite controlar quem pode ler, escrever ou excluir dados de maneira específica.
- Ideal para cenários em que diferentes usuários precisam de diferentes níveis de acesso.

## 3. Bucket Policy

As **Bucket Policies** fornecem um nível ainda mais abrangente de controle de acesso. Elas permitem definir regras complexas de permissão que se aplicam a um bucket inteiro.

**Vantagens**:

- Oferece flexibilidade e controle avançado, permitindo a criação de políticas específicas que atendem a requisitos de segurança complexos.
- Ideal para gerenciamento de acesso em larga escala em ambientes organizacionais.

## 4. CORS (Cross-Origin Resource Sharing)

O **CORS** não define permissões de acesso aos dados, mas atua como um mecanismo **complementar** que controla como os navegadores tratam requisições entre domínios (_cross-origin_) em aplicações web.

**Função**:

- Permitir ou restringir requisições feitas por navegadores de outros domínios (ex: `app.exemplo.com` acessando o seu bucket).

**Vantagens**:

- Necessário para aplicações frontend que interagem com o bucket via navegador.
- Permite configurar quais métodos HTTP e cabeçalhos podem ser utilizados nessas requisições.

**Importante**:

- O CORS **não concede acesso**.
- Mesmo com uma configuração válida de CORS, o acesso será negado caso não exista permissão via **Bucket Policy** ou **ACL**.
- Deve ser usado **em conjunto** com os demais mecanismos de controle para funcionar corretamente em ambientes web.

## Ordem de Grandeza

A eficácia e a complexidade dos mecanismos de controle de acesso podem ser entendidas pela seguinte ordem de grandeza:

1. **Bucket Policy**: fornece o maior nível de controle e flexibilidade.
2. **ACL**: oferece controle granular, mas com limitações em comparação com as políticas de bucket.
3. **Buckets Públicos e Privados**: abordagem mais simples, adequada para cenários menos complexos.

**E o CORS?**

O CORS não controla permissões, por isso não entra na hierarquia acima. Ele atua como um **mecanismo complementar**, informando ao navegador **quais origens externas** podem realizar requisições ao bucket.

Mesmo com CORS permitido, o acesso será negado caso as permissões (via **Policy** ou **ACL**) não estejam corretamente configuradas.

## Considerações

Ao gerenciar o acesso a dados em sistemas de armazenamento, é crucial entender as diferentes opções disponíveis e suas implicações.

A escolha entre usar buckets públicos/privados, ACLs ou Bucket Policies deve ser baseada nas necessidades específicas de segurança e acesso da sua organização.

A implementação correta desses mecanismos garantirá:

- A proteção e a integridade dos dados.
- A compatibilidade com aplicações web modernas (via CORS).
- A conformidade com regulamentações e políticas internas de segurança.
