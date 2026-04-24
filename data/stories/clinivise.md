# Clinivise

At Clinivise, my work sat at the intersection of healthcare data, analytics, automation, and internal platform development. The main product I worked on was an ABA analytics platform for provider analytics, payer-rate exploration, and healthcare operations visibility.

The platform was a full-stack React/Next.js application built with TypeScript, Tailwind, Shadcn/Radix UI, React Query, AG Grid, Recharts, D3, and Mapbox. I worked across the frontend, backend-for-frontend APIs, database access patterns, analytics workflows, and AI-assisted insight features.

One important architectural decision was a dual-database model. For core ABA provider analytics, the app used Supabase/PostgreSQL with RPC functions, CTEs, materialized views, and indexes to query roughly 11 million provider records quickly. For much larger Transparency in Coverage payer-rate data, the app routed requests through Next.js API routes into Snowflake and AWS Athena, with Upstash Redis protecting expensive queries through rate limiting.

I also worked on analytics UI patterns such as provider density maps, county/state drilldowns, large AG Grid tables, payer benchmarks, geospatial visualizations, and data workflows involving Zipcodebase/Mapbox geocoding and ETL scripts. The goal was to turn messy healthcare data into fast, usable decision-support tools.

Clinivise strengthened my interest in healthcare automation because it showed how much impact good engineering can have in operationally complex domains. It was not just about building screens; it was about designing systems that made difficult workflows more visible, searchable, and useful.