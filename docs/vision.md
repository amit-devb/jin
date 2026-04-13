# Why Jin

Jin exists because FastAPI backend teams and Data Product Owners need a shared, governed language to ensure data quality—without building bespoke pipelines.

## The Reconciliation Gap

Data Backend teams often build complex FastAPI responses (e.g. nested lists of categories, products, and metrics). Product Owners rely on Excel/CSV files as their source of truth to validate that Data. 

Historically, marrying these two workflows meant:
1. Endlessly writing custom `dict` flattening scripts.
2. Building an entire cron-based ETL pipeline just to diff two numbers.
3. Shipping internal API data to expensive 3rd-party SaaS platforms to check simple KPIs.

## Our Vision

Jin acts as the bridge. A completely **local**, **explainable**, and **model-first** reconciliation engine.

- **Catch Business KPI drift** natively, before downstream customers do.
- **Keep setup adjacent to the response model**, eliminating context rot.
- **Traverse deeply nested schemas automatically**, shifting the burden of flattening from the Developer to Jin's fast Rust engine.
- **Empower POs with a stunning UI**, allowing them to upload truth sets, manage edge cases, and run "Executive Summary" reports.

## The Product Promise

Jin will always strive to provide a SaaS-grade experience while executing completely locally. 

- **Rust-First**: Durable logic, reconciliation processing, and DuckDB IO will always happen in native thread-safe Rust for near-zero API latency impact.
- **PO-First**: Complex configurations must remain accessible to non-technical users. (e.g. using 'Field Aliasing' to convert strict JSON object paths into readable business concepts).
- **Fast Issue Operations**: Incident review must generate actionable insights without ever requiring raw datastore queries.
