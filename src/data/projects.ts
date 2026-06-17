export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  slug: string;
  title: string;
  tag: string;
  year: string;
  /** one-line summary for lists */
  summary: string;
  /** full intro paragraph for the detail page */
  description: string;
  problem: string;
  approach: string;
  stack: string[];
  highlights: string[];
  links: ProjectLink[];
}

export const projects: Project[] = [
  {
    slug: 'multicloud-data-pipelines',
    title: 'Multicloud data pipelines',
    tag: 'Pipelines',
    year: '2024',
    summary: 'Ingestion-to-warehouse flows across cloud providers with orchestration, testing, and lineage.',
    description:
      'A reference architecture for running the same data pipeline across AWS, Azure, and GCP — so the platform, not the provider, owns the workflow.',
    problem:
      'Teams get locked into one cloud’s managed tooling, making migration painful and multi-provider strategies impractical.',
    approach:
      'Provider-agnostic ingestion and transformation, orchestrated centrally, with data-quality tests and lineage so every run is observable and reproducible.',
    stack: ['Python', 'Airflow', 'Terraform', 'AWS', 'Azure', 'GCP', 'dbt'],
    highlights: [
      'One orchestration layer across three clouds',
      'Infrastructure as code (Terraform) for repeatable environments',
      'Data-quality tests + lineage on every run',
    ],
    links: [{ label: 'View on GitHub', href: 'https://github.com/Carpuro/multicloud-data-pipelines' }],
  },
  {
    slug: 'crypto-analytics-pipeline',
    title: 'Crypto analytics pipeline',
    tag: 'Analytics',
    year: '2024',
    summary: 'Streaming market data into a modeled warehouse with dbt transformations and dashboards.',
    description:
      'An end-to-end analytics pipeline that turns raw crypto market feeds into modeled, queryable, decision-ready data.',
    problem:
      'Market data arrives fast and messy; without modeling and tests it is impossible to trust or analyze.',
    approach:
      'Streaming ingestion into a warehouse, dbt models for transformation and testing, and dashboards on top of the modeled marts.',
    stack: ['Python', 'dbt', 'BigQuery', 'SQL'],
    highlights: [
      'Streaming ingestion of market feeds',
      'dbt modeling, tests, and documentation',
      'Decision-ready dashboards over modeled marts',
    ],
    links: [{ label: 'View on GitHub', href: 'https://github.com/Carpuro/crypto-analytics-pipeline' }],
  },
  {
    slug: 'ai-automation-risk-jalisco',
    title: 'AI automation risk — Jalisco',
    tag: 'Research',
    year: '2025',
    summary: 'A two-axis occupational-exposure model over Mexican labor microdata, built end to end.',
    description:
      'Master’s research modeling how AI and robotics expose occupations in Jalisco, Mexico — separating cognitive (LLM) from embodied (robotics) automation and projecting risk to 2030.',
    problem:
      'Most automation-risk work collapses AI into a single score and transplants U.S. data without testing it on the local labor market.',
    approach:
      'Two purpose-built exposure indices (cognitive + embodied) over ENOE/IMSS/Census microdata, validated against external benchmarks, then projected across scenarios.',
    stack: ['Python', 'PySpark', 'SQL Server', 'scikit-learn', 'pandas'],
    highlights: [
      'Two-axis exposure model (cognitive vs embodied)',
      'Built on Mexican microdata (ENOE · IMSS · Census)',
      'Scenario projections for Jalisco, 2025–2030',
    ],
    links: [{ label: 'View on GitHub', href: 'https://github.com/Carpuro/ai-automation-risk-jalisco' }],
  },
  {
    slug: 'inventory-ai-dashboard',
    title: 'Inventory & risk dashboard',
    tag: 'BI',
    year: '2025',
    summary: 'Sales trends, a risk matrix, and an executive decision layer over operational data.',
    description:
      'An interactive inventory-analysis dashboard that turns operational data into sales trends, a risk matrix, and a clear executive decision layer.',
    problem:
      'Operational inventory data is rich but rarely surfaced in a form managers can act on.',
    approach:
      'Aggregate operational data into trend views and a risk matrix, then add an executive summary that recommends decisions.',
    stack: ['Python', 'Data analysis', 'Visualization'],
    highlights: [
      'Sales-trend analysis',
      'Risk matrix for prioritization',
      'Executive decision section',
    ],
    links: [{ label: 'Open live demo', href: '/proyectos/topicos-selectos/' }],
  },
  {
    slug: 'marginacion-pca',
    title: 'Municipal marginalization (PCA)',
    tag: 'Data viz',
    year: '2024',
    summary: 'A marginalization index for Mexican municipalities built with PCA on census indicators.',
    description:
      'An index of municipal marginalization for Mexico, built with Principal Component Analysis over 2020 census indicators and rendered as an interactive map.',
    problem:
      'Marginalization is multidimensional; a single comparable score requires reducing many correlated indicators.',
    approach:
      'PCA over 2020 census indicators to derive a composite index, validated and visualized as an interactive municipal choropleth.',
    stack: ['Python', 'PCA', 'pandas', 'Visualization'],
    highlights: [
      'PCA over 2020 census indicators',
      'Composite, comparable municipal index',
      'Interactive choropleth map',
    ],
    links: [{ label: 'Open live demo', href: '/proyectos/marginacion/' }],
  },
];
