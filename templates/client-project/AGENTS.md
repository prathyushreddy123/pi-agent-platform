# {{PROJECT_NAME}} Agent Instructions

> Complete every `{{PLACEHOLDER}}` before using this file. If a value is not
> applicable, replace it with `Not applicable` and a short reason. Do not guess
> missing commands or operational details.

These project-specific instructions supplement the global agent operating
rules. The global safety, Git, role, approval, and reporting requirements still
apply.

## Project scope

- Purpose: {{PROJECT_PURPOSE}}
- Client/owner: {{CLIENT_OR_OWNER}}
- In scope: {{IN_SCOPE}}
- Out of scope: {{OUT_OF_SCOPE}}

## Repository map

- Application code: `{{APPLICATION_PATH}}`
- Tests: `{{TEST_PATH}}`
- Documentation: `{{DOCUMENTATION_PATH}}`
- Infrastructure or deployment definitions: `{{INFRASTRUCTURE_PATH_OR_NOT_APPLICABLE}}`
- Generated files that must not be edited directly: {{GENERATED_PATHS_OR_NONE}}

## Local development

Document commands exactly as they should be run from the repository root.

- Prerequisites: {{PREREQUISITES}}
- Setup: `{{SETUP_COMMAND}}`
- Run locally: `{{RUN_COMMAND}}`
- Focused tests: `{{FOCUSED_TEST_COMMAND}}`
- Full tests: `{{FULL_TEST_COMMAND}}`
- Lint: `{{LINT_COMMAND_OR_NOT_APPLICABLE}}`
- Type check: `{{TYPECHECK_COMMAND_OR_NOT_APPLICABLE}}`
- Build: `{{BUILD_COMMAND_OR_NOT_APPLICABLE}}`

Never invent a replacement for an incomplete command. Stop and ask for project
setup details instead.

## Architecture and change boundaries

- Primary components: {{PRIMARY_COMPONENTS}}
- Dependency direction or module boundaries: {{ARCHITECTURE_BOUNDARIES}}
- Public interfaces or compatibility requirements: {{COMPATIBILITY_REQUIREMENTS}}
- Areas requiring owner approval before modification: {{RESTRICTED_AREAS}}

## Client data and security

- Data classification: {{DATA_CLASSIFICATION}}
- Approved local/test data source: {{APPROVED_TEST_DATA_SOURCE}}
- Additional protected paths or files: {{PROJECT_PROTECTED_PATHS_OR_NONE}}
- Project-specific credential handling: {{CREDENTIAL_REQUIREMENTS}}
- External systems permitted during local development: {{PERMITTED_EXTERNAL_SYSTEMS_OR_NONE}}

Use synthetic or explicitly approved test data. Do not copy client data,
credentials, configuration, or code into another repository or client context.

## Delivery

- Required checks before handoff: {{REQUIRED_CHECKS}}
- Delivery method: {{DELIVERY_METHOD}}
- Deployment target: {{DEPLOYMENT_TARGET_OR_NOT_APPLICABLE}}
- Rollback procedure: {{ROLLBACK_PROCEDURE_OR_NOT_APPLICABLE}}
- Known limitations: {{KNOWN_LIMITATIONS_OR_NONE}}

A deployment target listed here is documentation, not authorization to deploy.
Production access, migrations, deployments, and destructive operations still
require explicit approval for the specific task.
