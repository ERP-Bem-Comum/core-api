import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import clsx from 'clsx';
import type { ReactNode } from 'react';

type Feature = Readonly<{
  emoji: string;
  title: string;
  body: ReactNode;
  to: string;
}>;

const FEATURES: readonly Feature[] = [
  {
    emoji: '🧩',
    title: 'Modular monolith',
    body: 'Um processo Node, módulos isolados por pasta (contracts, auth, financial, notifications) que conversam só por eventos. Cada um extraível como serviço sem refactor traumático.',
    to: '/arquitetura/visao-geral',
  },
  {
    emoji: '🧠',
    title: 'Domínio puro primeiro',
    body: 'Result<T,E> em vez de throw, branded types, discriminated unions e switch exaustivo. O domínio não conhece banco, HTTP nem framework — só regra de negócio.',
    to: '/arquitetura/camadas-e-regras',
  },
  {
    emoji: '🔌',
    title: 'Ports & adapters',
    body: 'Toda dependência externa é um type contract. Cada port tem adapter InMemory (teste) e real (Drizzle/MySQL, S3). O composition root escolhe por driver.',
    to: '/arquitetura/ports-e-adapters',
  },
  {
    emoji: '📜',
    title: 'Decisões rastreáveis',
    body: '28 ADRs imutáveis registram cada escolha — de "por que MySQL" a "por que Fastify na borda". Quando código e ADR divergem, o ADR vence.',
    to: '/decisoes/catalogo',
  },
  {
    emoji: '📦',
    title: 'Módulo Contratos completo',
    body: 'Agregados Contract/Amendment/Document, máquina de estados, eventos via Outbox, borda HTTP /api/v2 e CLI. O primeiro módulo end-to-end.',
    to: '/modulos/contratos',
  },
  {
    emoji: '🏦',
    title: 'Domínio antes do código',
    body: 'Context maps, glossário ubíquo, entrevistas com especialista em DDD e investigação do schema legado. O negócio modelado antes de uma linha de adapter.',
    to: '/modulos/financeiro',
  },
];

function Hero(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', 'heroBanner')}>
      <div className="container">
        <Heading as="h1" className="heroTitle">
          {siteConfig.title}
        </Heading>
        <p className="heroTagline">{siteConfig.tagline}</p>
        <div className="heroButtons">
          <Link className="button button--primary button--lg" to="/comecar">
            Começar →
          </Link>
          <Link className="button button--secondary button--lg" to="/arquitetura/visao-geral">
            Entender a arquitetura
          </Link>
        </div>
        <div className="heroMeta">
          <div>
            <strong>4</strong>módulos
          </div>
          <div>
            <strong>28</strong>ADRs
          </div>
          <div>
            <strong>130+</strong>tickets W0→W3
          </div>
          <div>
            <strong>Node 24</strong>TypeScript 6
          </div>
        </div>
      </div>
    </header>
  );
}

function FeatureGrid(): ReactNode {
  return (
    <section className="features">
      <div className="container">
        <div className="row">
          {FEATURES.map((f) => (
            <div key={f.title} className="col col--4" style={{ marginBottom: '1.5rem' }}>
              <Link
                to={f.to}
                className="featureCard"
                style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
              >
                <div className="featureEmoji">{f.emoji}</div>
                <Heading as="h3">{f.title}</Heading>
                <p>{f.body}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="core-api — o backend por dentro" description={siteConfig.tagline}>
      <Hero />
      <main>
        <FeatureGrid />
      </main>
    </Layout>
  );
}
