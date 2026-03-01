# Rekindle Ingestion Specs (v1)

## Purpose
This spec pack defines how Rekindle should build and operate ingestion as an ongoing business capability, not a one-time launch script.

It covers:

- Why ingestion matters to product and business outcomes
- What Studio users will experience
- How the system should be designed technically
- How quality improves over time
- How to run it safely and reliably
- How to phase implementation

## Document Map

1. `01_vision_and_business_case.md`
2. `02_studio_user_workflow.md`
3. `03_system_architecture.md`
4. `04_data_model_and_contracts.md`
5. `05_source_intelligence_and_strategy.md`
6. `06_extraction_quality_and_learning_loop.md`
7. `07_orchestration_scheduling_and_reliability.md`
8. `08_governance_safety_and_compliance.md`
9. `09_metrics_kpis_and_experiments.md`
10. `10_implementation_plan.md`
11. `11_decisions_and_open_questions.md`
12. `12_interfaces_and_commands.md`
13. `13_execution_backlog.md`
14. `14_environment_and_secrets_contract.md`
15. `15_operations_runbook.md`
16. `16_quarterly_governance_review_operation.md`
17. `17_system_usage_guide.md`

## Scope Boundaries

- In scope:
  - Source discovery and source onboarding
  - Strategy selection for scraping/extraction
  - Durable ingestion storage
  - Studio inbox review and manual promotion to drafts
  - Feedback loop for quality improvements
  - Multi-source scheduling and operational reliability

- Out of scope:
  - Fully autonomous publishing to production ideas
  - One-click ingestion from unvetted sources with no governance controls
  - Legal policy overrides (these specs assume legal review gates exist)

## Current State Note

Rekindle already has:

- Durable ingestion tables (`ingest_runs`, `ingest_pages`, `ingest_candidates`, `ingest_candidate_traits`, `ingest_sync_log`)
- Studio Ingestion Inbox route and manual actions (reject, needs work, promote)
- Initial `rak` source module

These specs define the target operating model and next implementation steps from this baseline.
