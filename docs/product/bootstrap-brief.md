# ExoKortex — Initial Codebase & Documentation Bootstrap Brief

> Founding brief for ExoKortex (originally drafted as "Portfolio Agent"). Kept as written apart from the product name. Where the implementation departs from it, the ADRs in `docs/decisions/` record why.


You are the principal software architect and senior backend engineer responsible for bootstrapping a production-oriented open-source SaaS project called **ExoKortex**.

## 1. Product Vision

Build a generic SaaS platform that continuously monitors a user's software/AI project repositories, detects meaningful changes, understands those changes using the user's own LLM API, compares them against the user's portfolio, asks for approval when a genuinely new project is detected, and can automatically update the user's portfolio repository.

The system must eventually support:

- GitHub
- Hugging Face
- Kaggle
- Google Colab / Google Drive
- Additional repository/project platforms through a pluggable provider architecture

The system must be generic enough that developers from the wider technical community can connect their own accounts and portfolios.

The product must use a **Bring Your Own LLM (BYOLLM/BYOK)** model.

The SaaS itself must not pay for user LLM inference.

Users should be able to configure an OpenAI-compatible API provider such as:

- xAI
- OpenAI
- OpenRouter
- Groq
- Together
- Fireworks
- self-hosted OpenAI-compatible endpoints

The initial implementation should be designed to operate on free/low-cost infrastructure.

---

# 2. Core Product Workflow

The intended final workflow is:

```text
Scheduler
    ↓
Portfolio Orchestrator
    ↓
Discover repositories
    ↓
Detect changes since previous revision
    ↓
Scout
    ↓
Analyst
    ↓
Curator
    ↓
┌──────────────────────────────────────┐
│ Existing project                     │
│                                      │
│ → update if meaningful               │
└──────────────────────────────────────┘

OR

┌──────────────────────────────────────┐
│ New project                          │
│                                      │
│ → ask user for approval              │
└──────────────────────────────────────┘

Approval
    ↓
Portfolio Engineer
    ↓
Modify portfolio repository
    ↓
Run tests/build
    ↓
Create branch/commit/PR
    ↓
Merge according to policy
    ↓
Existing CI/CD deploys portfolio
    ↓
Deployment/health verification
```

The final system must be asynchronous and recoverable.

A user should not need to keep the website or application open for the workflow to execute.

---

# 3. Agent Architecture

There are exactly four primary logical agents.

## 3.1 Portfolio Scout

Responsibility:

- discover repository changes
- inspect revisions
- identify meaningful changes
- ignore obvious noise
- provide initial evidence

Scout must NOT:

- modify repositories
- modify portfolios
- approve projects
- deploy anything

---

## 3.2 Portfolio Analyst

Responsibility:

- deeply understand a repository/project
- inspect README
- inspect source tree
- inspect changed files
- inspect commit history
- inspect package manifests
- determine architecture and technologies
- determine project purpose
- provide evidence
- determine relationships between repositories

Analyst must NOT:

- approve portfolio changes
- modify production
- modify repositories

---

## 3.3 Portfolio Curator

Responsibility:

Compare discovered projects against the user's canonical portfolio project registry.

Possible classifications:

```text
UNCHANGED
UPDATED_PROJECT
NEW_PROJECT
IGNORE
```

Curator must be able to request additional information from Analyst/Scout when evidence is insufficient.

Example:

```text
Curator
    ↓
"Is repository X actually the same project as portfolio project Y?"
    ↓
Analyst
    ↓
evidence
    ↓
Curator
```

Do not implement this as uncontrolled natural-language agent-to-agent conversation.

Use explicit orchestrator/tool calls.

The Curator must have a bounded investigation budget, initially:

```text
max_followup_requests = 5
```

Curator must NEVER automatically approve a NEW_PROJECT.

---

## 3.4 Portfolio Engineer

Responsibility:

- implement approved portfolio changes
- inspect the portfolio repository
- determine its architecture
- locate canonical project data
- modify the minimum required files
- preserve existing design
- run tests
- run production build
- inspect Git diff
- create branch
- commit changes
- push
- create PR
- merge according to configured policy
- verify CI
- verify deployment/website health

Do NOT create a separate Release Engineer agent.

Deployment is part of Portfolio Engineer's responsibility, but actual production deployment should preferably happen through the user's existing CI/CD system.

The system should NOT require the SaaS to own Vercel/AWS/Netlify/etc. deployment credentials unless absolutely necessary.

Preferred flow:

```text
Portfolio Engineer
    ↓
Git change
    ↓
PR/merge
    ↓
User's existing CI/CD
    ↓
deployment
```

---

# 4. Orchestrator

The Orchestrator is NOT an LLM agent.

It is deterministic application code.

Responsibilities:

- schedule jobs
- maintain state
- invoke agents
- provide tools
- enforce permissions
- manage retries
- manage timeouts
- persist workflow state
- handle approvals
- enforce idempotency
- recover failed jobs
- coordinate deployments
- maintain audit history

The LLM should reason.

The Orchestrator should control.

Never allow the LLM to become the source of truth.

---

# 5. Recommended Initial Technology Stack

Use:

```text
Frontend:
React / Next.js

Backend:
Cloudflare Workers

Database:
Cloudflare D1

Queue:
Cloudflare Queues

Object storage:
Cloudflare R2

Authentication:
Clerk

Email:
Resend

Bot protection:
Cloudflare Turnstile

LLM:
User-provided OpenAI-compatible API

Repository integration:
GitHub App

CI/CD:
GitHub Actions

Primary language:
TypeScript
```

Do NOT introduce:

- Kubernetes
- Kafka
- Redis
- AWS infrastructure
- dedicated VMs
- paid databases
- paid LLM inference

unless a later documented requirement justifies them.

The project should target a near-zero-cost/free-tier MVP.

---

# 6. Repository Structure

Create the following monorepo structure:

```text
exokortex/
│
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
├── .gitignore
├── .env.example
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
│
├── apps/
│   ├── web/
│   │   ├── README.md
│   │   └── ...
│   │
│   └── worker/
│       ├── README.md
│       └── ...
│
├── packages/
│   ├── core/
│   ├── database/
│   ├── agents/
│   ├── orchestrator/
│   ├── llm/
│   ├── source-providers/
│   ├── github/
│   ├── mcp/
│   ├── portfolio/
│   ├── jobs/
│   ├── security/
│   └── shared/
│
├── migrations/
│
├── docs/
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── system-context.md
│   │   ├── agent-architecture.md
│   │   ├── data-flow.md
│   │   ├── reliability.md
│   │   └── security.md
│   │
│   ├── agents/
│   │   ├── scout.md
│   │   ├── analyst.md
│   │   ├── curator.md
│   │   └── portfolio-engineer.md
│   │
│   ├── integrations/
│   │   ├── github.md
│   │   ├── huggingface.md
│   │   ├── kaggle.md
│   │   └── google.md
│   │
│   ├── product/
│   │   ├── vision.md
│   │   ├── roadmap.md
│   │   ├── user-flow.md
│   │   └── free-tier-strategy.md
│   │
│   ├── development/
│   │   ├── local-development.md
│   │   ├── testing.md
│   │   └── deployment.md
│   │
│   └── decisions/
│       └── README.md
│
└── scripts/
    ├── setup.ts
    └── ...
```

Do not blindly create empty files for every future component.

Create useful initial documentation with actual content.

---

# 7. Architecture Principles

Document and enforce these principles.

## Principle 1 — Database is source of truth

Agent memory is NOT the source of truth.

D1 stores:

- users
- integrations
- repositories
- revisions
- projects
- changes
- jobs
- approvals
- deployments
- agent runs

---

## Principle 2 — Queue is not the database

Cloudflare Queue messages are transient job delivery.

Persistent job state belongs in D1.

```text
D1 = durable state
Queue = execution trigger
```

---

## Principle 3 — Idempotency everywhere

Repeated execution must not duplicate:

- projects
- change events
- approvals
- commits
- deployments

Use stable IDs and unique constraints.

---

## Principle 4 — Least privilege

Each agent gets only the tools it needs.

Scout gets read-only discovery tools.

Analyst gets read-only repository investigation tools.

Curator gets portfolio read tools and Analyst investigation tools.

Portfolio Engineer gets write tools only for the portfolio repository.

---

## Principle 5 — Never expose credentials to LLMs

LLMs should never receive:

- GitHub access tokens
- OAuth refresh tokens
- API keys
- encryption keys
- deployment secrets

LLMs interact with controlled tools.

---

## Principle 6 — User approval is asynchronous

Never keep an agent execution alive while waiting for user approval.

Instead:

```text
Curator
 ↓
PENDING_APPROVAL
 ↓
workflow pauses
 ↓
user approves later
 ↓
new job
 ↓
Portfolio Engineer
```

---

## Principle 7 — Existing CI/CD owns production deployment

The SaaS should modify the portfolio repository.

The portfolio's existing deployment pipeline should deploy it.

---

# 8. Multi-Tenant Design

The product must be multi-tenant from day one.

Every user-owned record must be associated with:

```text
user_id / tenant_id
```

Never create globally shared project state that could mix users.

At minimum support:

```text
users
connections
repositories
portfolio_projects
project_sources
change_events
jobs
approvals
agent_runs
deployments
llm_configs
```

Document the tenant isolation strategy.

---

# 9. Database Schema

Create initial D1 migrations for:

## users

```text
id
email
timezone
status
created_at
updated_at
```

## llm_configs

```text
id
user_id
provider
base_url
model
encrypted_api_key
created_at
updated_at
```

## connections

```text
id
user_id
provider
external_user_id
encrypted_credentials
status
created_at
updated_at
```

## repositories

```text
id
user_id
connection_id
external_id
name
url
default_branch
role
last_revision
last_scanned_at
excluded
created_at
updated_at
```

Repository role must support:

```text
SOURCE
PORTFOLIO
EXCLUDED
```

## portfolio_projects

```text
id
user_id
slug
name
description
technologies_json
links_json
status
created_at
updated_at
```

## project_sources

```text
project_id
repository_id
```

This allows multiple repositories to represent one portfolio project.

Example:

```text
FindMyMobile
 ├── repo-A
 ├── repo-B
 └── repo-C
```

## change_events

```text
id
user_id
repository_id
from_revision
to_revision
type
significance
summary
status
created_at
processed_at
```

## jobs

```text
id
user_id
type
payload_json
status
attempts
next_run_at
locked_at
created_at
updated_at
```

## approvals

```text
id
user_id
project_id
change_event_id
action
status
reason
created_at
resolved_at
```

## agent_runs

```text
id
user_id
agent_name
input_reference
output_reference
status
attempts
started_at
completed_at
error
```

## deployments

```text
id
user_id
portfolio_project_id
commit_sha
status
deployment_url
created_at
completed_at
```

---

# 10. Source Provider Abstraction

Create a generic interface:

```typescript
interface SourceProvider {
  discoverRepositories(connection: Connection): Promise<Repository[]>;
  getLatestRevision(repository: Repository): Promise<Revision>;
  getChanges(
    repository: Repository,
    fromRevision: string,
    toRevision: string
  ): Promise<RepositoryChange[]>;
  getFile(
    repository: Repository,
    path: string,
    revision?: string
  ): Promise<FileContent>;
  searchRepository(
    repository: Repository,
    query: string
  ): Promise<SearchResult[]>;
}
```

Implement the first provider:

```text
GitHubProvider
```

Create placeholders/interfaces for:

```text
HuggingFaceProvider
KaggleProvider
GoogleProvider
```

Do not implement fake integrations.

Clearly mark future providers as TODO.

---

# 11. GitHub Integration

Implement GitHub as the first real integration.

Use a GitHub App.

Support:

```text
repository discovery
default branch discovery
latest commit/revision
commit changes
changed files
repository files
pull requests
GitHub Actions status
webhooks
```

Prefer selected-repository installation rather than automatically requesting all repositories.

Document required GitHub App permissions.

Use webhook signature validation.

---

# 12. Portfolio Repository

During onboarding the user explicitly selects:

```text
portfolio repository
```

Store it with:

```text
role = PORTFOLIO
```

The portfolio repository must never be considered a candidate project.

Add multiple safeguards:

1. Explicit repository role
2. Repository ID exclusion
3. Repository URL exclusion
4. Semantic portfolio detection
5. Agent prompt rule

---

# 13. Portfolio Discovery

The system must inspect a portfolio repository and determine:

```text
framework
build system
project data location
project schema
project component
test command
build command
deployment configuration
```

Example detected structure:

```json
{
  "framework": "NEXT_JS",
  "projectDataPath": "src/data/projects.ts",
  "testCommand": "npm test",
  "buildCommand": "npm run build"
}
```

Persist this information so the Engineer does not rediscover it every time.

---

# 14. Portfolio Data Strategy

Prefer data-driven portfolios.

Support structures such as:

```text
JSON
YAML
TypeScript data
Markdown
MDX
```

The Engineer should prefer modifying project data instead of redesigning UI components.

The product must not require users to adopt a particular frontend framework.

---

# 15. LLM Provider Abstraction

Create:

```typescript
interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
}
```

Create an OpenAI-compatible implementation.

Configuration:

```text
provider
baseUrl
apiKey
model
```

Examples:

```text
xAI
https://api.x.ai/v1
grok-4.6
```

or:

```text
OpenAI
https://api.openai.com/v1
...
```

Do not hardcode provider-specific assumptions into agents.

---

# 16. BYOK Security

LLM API keys must:

- never reach frontend logs
- never reach agent prompts
- never appear in logs
- never be stored plaintext
- never be returned through API responses
- never be committed to Git

Use application-level encryption for stored credentials.

Use Cloudflare Worker secrets for encryption keys.

Document key rotation.

---

# 17. Agent Tool Model

Define explicit tools.

### Scout tools

```text
listRepositories
getRepositoryMetadata
getLatestRevision
getChanges
```

### Analyst tools

```text
getFile
getDiff
getCommit
searchRepository
listDirectory
getReadme
getManifest
```

### Curator tools

```text
getPortfolioProjects
getProjectSources
getRepositoryEvidence
askAnalyst
```

### Engineer tools

```text
readPortfolioFile
writePortfolioFile
listPortfolioFiles

runTests
runBuild
getGitDiff

createBranch
commit
push
createPullRequest

getCIStatus
getDeploymentStatus
healthCheck
```

Never give all tools to all agents.

---

# 18. Agent-to-Agent Communication

Do not implement free-form agent conversations.

Use orchestrator-mediated calls.

Example:

```text
Curator
 ↓
askAnalyst(repositoryId, question)
 ↓
Orchestrator
 ↓
Analyst
 ↓
structured response
 ↓
Orchestrator
 ↓
Curator
```

Persist this interaction as an `agent_run`.

Maximum follow-up requests:

```text
5
```

---

# 19. Agent Prompts

Create these files:

```text
docs/agents/scout.md
docs/agents/analyst.md
docs/agents/curator.md
docs/agents/portfolio-engineer.md
```

Also create runtime copies:

```text
packages/agents/prompts/
```

The prompts must explicitly enforce:

### Scout

- discovery only
- no modifications
- ignore noise
- portfolio repo is not a project

### Analyst

- evidence-driven analysis
- repository investigation
- no portfolio decisions

### Curator

- compare against canonical project registry
- classify NEW / UPDATED / IGNORE / UNCHANGED
- may ask Analyst for more evidence
- never auto-approve NEW_PROJECT

### Engineer

- only implement approved changes
- preserve architecture/design
- minimal file modifications
- test/build before Git operations
- never force push
- never commit secrets
- deployment through existing CI/CD

---

# 20. Workflow State Machine

Implement explicit states.

```text
SCAN_PENDING
SCANNING
SCOUTING
ANALYZING
CURATING

PENDING_APPROVAL

ENGINEERING
VALIDATING
WAITING_FOR_CI
VERIFYING

COMPLETED
FAILED
```

Transitions must be deterministic.

Persist every transition.

---

# 21. Retry Strategy

Initial policy:

```text
Scout: 3 attempts
Analyst: 3 attempts
Curator: 3 attempts
Engineer: 2 attempts
```

Use exponential backoff.

Never retry indefinitely.

After maximum attempts:

```text
FAILED
```

and notify the user where appropriate.

---

# 22. Reliability Requirements

Implement:

```text
idempotency
retries
timeouts
dead-letter handling
job recovery
periodic reconciliation
state persistence
audit logging
```

The system must recover if:

- Worker crashes
- queue message is lost
- LLM request times out
- GitHub API fails
- user takes days to approve
- GitHub Actions fails
- deployment fails

---

# 23. Scheduling

Implement one global scheduler.

Do NOT create one cron schedule per user.

Scheduler:

```text
periodically find users/jobs where next_run_at <= now
```

Spread jobs over time.

Default:

```text
weekly
```

Allow user-configurable:

```text
weekly
biweekly
monthly
```

Do not initially support aggressive schedules that increase free-tier usage significantly.

---

# 24. Initial Free-Tier Constraints

Implement configurable limits:

```text
maxRepositories = 100
maxPortfolioProjects = 200
maxCuratorFollowups = 5
maxEngineerAttempts = 2
scanFrequency = weekly
```

Do not hardcode limits throughout the codebase.

Create a feature/limits configuration module.

---

# 25. Notifications

Implement email notifications for:

```text
new project detected
approval required
workflow failed
portfolio update completed
deployment failed
connection expired
```

Do not send "nothing changed" notifications.

---

# 26. Frontend

Create a minimal but production-quality dashboard.

Pages:

```text
/login
/dashboard
/repositories
/projects
/approvals
/activity
/connections
/ai
/settings
```

Dashboard should display:

```text
repository count
portfolio project count
last scan
next scan
pending approvals
recent activity
system status
```

Do not spend significant effort on visual polish yet.

Focus on functionality and architecture.

---

# 27. Onboarding

Create this flow:

```text
Sign up
 ↓
Connect GitHub
 ↓
Select repositories
 ↓
Select portfolio repository
 ↓
Configure LLM
 ↓
Test LLM
 ↓
Initial portfolio discovery
 ↓
Review detected projects
 ↓
Bootstrap baseline
 ↓
Activate weekly monitoring
```

Initial bootstrap MUST establish the baseline without treating every historical repository as a new project.

---

# 28. Initial Bootstrap Mode

The first scan must:

```text
discover repositories
store current revisions
identify portfolio repository
identify existing portfolio projects
create repository/project mappings
```

It must NOT automatically create dozens of new project approvals from historical repositories.

Existing portfolio projects should be mapped to their repositories.

---

# 29. Testing Strategy

Create tests for:

### Unit tests

- repository state comparison
- revision detection
- project matching
- portfolio exclusion
- job state transitions
- retry logic
- idempotency

### Integration tests

- GitHub provider
- D1 repository layer
- LLM provider
- approval workflow

### Agent tests

Use fixed fixtures:

```text
new project
existing project update
README-only change
dependency update
portfolio repository
fork
multi-repository project
ambiguous project
```

Do not rely only on live LLM tests.

---

# 30. Security Documentation

Create `docs/architecture/security.md`.

Document:

```text
tenant isolation
credential encryption
GitHub permissions
LLM key handling
MCP/tool permissions
webhook validation
CSRF protection
rate limiting
audit logs
secret management
data deletion
account disconnect
```

Explicitly state:

> User credentials are never provided directly to LLM agents.

---

# 31. Privacy

Create an initial privacy model.

The system may store:

```text
repository metadata
repository URLs
revision identifiers
portfolio metadata
agent analysis
workflow history
```

The system should avoid storing entire repositories unless required.

Large artifacts should have retention policies.

Provide a user operation to:

```text
disconnect integration
delete stored credentials
delete workflow history
delete account data
```

Document data retention.

---

# 32. Documentation to Create

Generate meaningful initial versions of:

```text
README.md
CONTRIBUTING.md
SECURITY.md
CODE_OF_CONDUCT.md
CHANGELOG.md

docs/product/vision.md
docs/product/roadmap.md
docs/product/user-flow.md
docs/product/free-tier-strategy.md

docs/architecture/overview.md
docs/architecture/system-context.md
docs/architecture/agent-architecture.md
docs/architecture/data-flow.md
docs/architecture/reliability.md
docs/architecture/security.md

docs/agents/scout.md
docs/agents/analyst.md
docs/agents/curator.md
docs/agents/portfolio-engineer.md

docs/integrations/github.md
docs/integrations/huggingface.md
docs/integrations/kaggle.md
docs/integrations/google.md

docs/development/local-development.md
docs/development/testing.md
docs/development/deployment.md

docs/decisions/README.md
```

Do not fill future integrations with fake implementation details.

Clearly mark:

```text
Implemented
Planned
Not implemented
```

---

# 33. Architecture Decision Records

Create ADRs for important decisions.

Initial ADRs:

```text
ADR-001 — Serverless Architecture
ADR-002 — BYO LLM
ADR-003 — D1 as Source of Truth
ADR-004 — Queue as Job Delivery
ADR-005 — Four-Agent Architecture
ADR-006 — Portfolio Repository Isolation
ADR-007 — Existing CI/CD Owns Deployment
ADR-008 — GitHub App Instead of Personal Access Tokens
ADR-009 — Multi-Tenant Architecture
```

Each ADR should contain:

```text
Context
Decision
Alternatives considered
Consequences
Status
```

---

# 34. Product Roadmap

Create a roadmap with:

## Phase 0

Infrastructure bootstrap

## Phase 1

GitHub scanning

## Phase 2

LLM abstraction

## Phase 3

Scout + Analyst

## Phase 4

Curator + approval

## Phase 5

Portfolio Engineer

## Phase 6

Reliability

## Phase 7

Hugging Face/Kaggle/Google

## Phase 8

Public beta

## Phase 9

Additional integrations

Do not build billing initially.

---

# 35. Open Source Strategy

Assume this may become an open-source project.

Keep:

```text
core business logic
provider interfaces
agent contracts
workflow engine
```

modular.

Never commit:

```text
API keys
OAuth secrets
GitHub private keys
production credentials
personal portfolio data
```

Provide:

```text
.env.example
```

with placeholders only.

---

# 36. Local Development

Create:

```text
docker-compose.yml
```

for local development where appropriate.

Document:

```text
Node.js version
pnpm version
Wrangler setup
D1 local database
environment variables
GitHub App local webhook setup
LLM configuration
test commands
development server
```

Use local mocks for external integrations where possible.

---

# 37. Observability

Implement structured logs.

Every workflow should have:

```text
tenantId
jobId
workflowId
agentRunId
repositoryId
```

Never log secrets.

Create basic metrics:

```text
scans
repositories scanned
changes detected
LLM calls
agent failures
approvals
engineering runs
deployments
deployment failures
```

---

# 38. Cost Controls

Document the target:

> The MVP should operate at approximately $0 infrastructure cost while within free-tier limits.

The system should optimize for:

```text
few LLM calls
few queue messages
minimal D1 writes
webhook-first detection
weekly reconciliation
small evidence payloads
no full repository storage
```

The user's LLM API consumption is explicitly their responsibility.

---

# 39. Important Non-Goals for Initial Version

Do NOT implement:

```text
billing
subscriptions
team collaboration
mobile app
native desktop app
multiple portfolio websites per user
advanced analytics
AI-generated portfolio redesigns
autonomous portfolio deletion
autonomous repository deletion
automatic credential rotation
complex workflow builder
```

These may be future features.

---

# 40. Initial Phase Boundary

After generating the architecture and documentation, implement ONLY the first vertical slice:

```text
User
 ↓
GitHub connection
 ↓
Discover repositories
 ↓
Persist repositories
 ↓
Persist latest revision
 ↓
Run scan
 ↓
Detect revision changes
 ↓
Persist change event
```

Do NOT implement the full AI pipeline yet.

The purpose of the first milestone is to establish a reliable deterministic foundation.

---

# 41. Initial Acceptance Criteria

The initial codebase is successful if:

1. The project installs locally.
2. The Worker starts locally.
3. The frontend starts locally.
4. D1 migrations execute successfully.
5. A user can authenticate.
6. A GitHub connection can be initiated.
7. Repositories can be discovered.
8. Repository default branches are detected.
9. Latest revisions are stored.
10. A second scan detects only actual changes.
11. Repeated scans are idempotent.
12. Portfolio repositories can be explicitly marked.
13. Portfolio repositories are excluded from project discovery.
14. All secrets are environment-based.
15. Tests pass.
16. Documentation explains the architecture and local setup.

---

# 42. Engineering Quality Requirements

Write production-quality code.

Prefer:

```text
small modules
strong types
explicit interfaces
dependency inversion
structured errors
validated inputs
deterministic state transitions
idempotent operations
testable services
```

Avoid:

```text
god classes
global state
magic strings
hardcoded credentials
provider-specific logic in core
LLM-generated business logic without validation
```

---

# 43. Do Not Overengineer

The project should NOT initially introduce:

```text
Kubernetes
microservices
Kafka
Redis
event sourcing
CQRS everywhere
complex workflow engines
vector databases
```

The architecture should remain:

```text
Cloudflare Worker
+
D1
+
Queue
+
R2
+
GitHub
+
LLM
```

until actual scale requires more.

---

# 44. Final Deliverables

At the end of this bootstrap task, provide:

### Code

- monorepo structure
- package configuration
- Worker application
- frontend application
- D1 migrations
- domain models
- GitHub provider skeleton
- source-provider interfaces
- job model
- orchestrator skeleton
- environment configuration
- test setup

### Documentation

All documentation listed above.

### Developer experience

Provide:

```text
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
```

or equivalent simple commands.

Create a clear root README containing:

```text
What is ExoKortex?
Architecture
Features
Current status
Local setup
Environment variables
Development commands
Roadmap
Contribution guide
Security
```

---

# 45. Important Instruction

Do not pretend that features are implemented when they are only planned.

Every feature in documentation must be clearly classified as:

```text
IMPLEMENTED
PARTIALLY IMPLEMENTED
PLANNED
```

Do not create fake API integrations or placeholder implementations that appear functional.

If a design decision is ambiguous, document the ambiguity in an ADR rather than silently making a major architectural assumption.

Before finishing, inspect the generated repository structure and ensure that the architecture is internally consistent.

The resulting repository should be a **clean foundation for a production-grade, multi-tenant, open-source SaaS**, not a throwaway prototype.