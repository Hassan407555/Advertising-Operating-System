# System Architecture

## Version

1.0 (MVP)

---

# Purpose

The Advertising Operating System is designed using a layered architecture that separates presentation, business logic, data storage, automation, and external integrations.

The primary goals are:

- Scalability
- Maintainability
- Modularity
- Security
- High Availability
- Easy integration with third-party services

---

# High-Level Architecture

```text
                                    +-----------------------+
                                    |     Web Browser       |
                                    | (Marketing Manager)   |
                                    +-----------+-----------+
                                                |
                                                |
                                          HTTPS / REST
                                                |
                                                ▼
                                +-------------------------------+
                                |        Frontend (Next.js)     |
                                |-------------------------------|
                                | Dashboard                     |
                                | Campaign Management           |
                                | Products                      |
                                | Reports                       |
                                | Authentication                |
                                +---------------+---------------+
                                                |
                                                |
                                          REST API
                                                |
                                                ▼
                         +----------------------------------------------+
                         |          Backend API (NestJS)                |
                         |----------------------------------------------|
                         | Authentication                               |
                         | Authorization                                |
                         | Business Logic                               |
                         | Validation                                   |
                         | API Endpoints                                |
                         | Workflow Trigger                             |
                         | Reporting                                    |
                         +------+-------------------+-------------------+
                                |                   |
                                |                   |
                                ▼                   ▼
                    +-------------------+    +----------------------+
                    | PostgreSQL        |    |      Redis           |
                    |-------------------|    |----------------------|
                    | Organizations     |    | Cache                |
                    | Brands            |    | Sessions             |
                    | Products          |    | Queue Data           |
                    | Campaigns         |    | Temporary Storage    |
                    | Reports           |    +-----------+----------+
                    | Logs              |                |
                    +---------+---------+                |
                              |                          |
                              |                          |
                              ▼                          ▼
                     +-----------------------------------------+
                     |          n8n Automation Engine          |
                     |-----------------------------------------|
                     | AI Copy Generation                      |
                     | Translation                             |
                     | Creative Generation                     |
                     | Campaign Publishing                     |
                     | Scheduled Reporting                     |
                     | Notifications                           |
                     +-----------+-----------------------------+
                                 |
               +-----------------+------------------+
               |                 |                  |
               ▼                 ▼                  ▼
        +-------------+   +---------------+   +----------------+
        | AI Service  |   | Shopify API   |   | Advertising APIs|
        |-------------|   |---------------|   |----------------|
        | Gemini      |   | Products      |   | Meta Ads       |
        | OpenAI      |   | Orders        |   | TikTok Ads     |
        | Claude      |   | Inventory     |   | Google Ads     |
        +-------------+   +---------------+   +----------------+
```

---

# Architecture Layers

## 1. Presentation Layer

Technology

- Next.js
- React
- TypeScript

Responsibilities

- User Interface
- Dashboard
- Campaign Management
- Product Management
- Reports
- Login
- Authentication UI
- Forms
- Notifications

The frontend never accesses the database directly.

It communicates only with the Backend API.

---

## 2. Application Layer

Technology

- NestJS

Responsibilities

- Authentication
- Authorization
- Business Rules
- Validation
- REST API
- Error Handling
- Logging
- Trigger Automation
- Database Operations

This layer is the brain of the application.

Every request passes through the backend.

---

## 3. Data Layer

Technology

- PostgreSQL
- Prisma ORM

Responsibilities

Store all business data including:

- Organizations
- Users
- Brands
- Products
- Campaigns
- Campaign Assets
- Reports
- Settings
- Audit Logs

PostgreSQL is the Single Source of Truth.

---

## 4. Cache Layer

Technology

- Redis

Responsibilities

- Cache frequently accessed data
- Session Management
- Queue Storage
- Temporary Tokens
- Rate Limiting

Redis improves performance by reducing unnecessary database queries.

---

## 5. Automation Layer

Technology

- n8n

Responsibilities

- AI Copy Generation
- Translation
- Creative Generation
- Campaign Publishing
- Scheduled Reports
- Notifications
- Background Jobs

Important:

Business Logic should NOT live inside n8n.

n8n only orchestrates workflows.

---

## 6. AI Layer

Possible Providers

- Gemini
- OpenAI
- Claude

Responsibilities

- Generate Headlines
- Generate Descriptions
- Generate CTAs
- Translate Copy
- Summarize Reports
- Generate Creative Prompts

The backend communicates with AI through a common interface so providers can be changed easily.

---

## 7. External Integrations

Examples

Shopify

- Products
- Inventory
- Orders

Advertising Platforms

- Meta Ads
- TikTok Ads
- Google Ads

Communication occurs via secure APIs.

---

# Request Flow Example

Example:

Marketing Manager creates a campaign.

```text
User

↓

Frontend

↓

POST /campaigns

↓

Backend Validation

↓

Save Campaign

↓

PostgreSQL

↓

Trigger n8n Workflow

↓

AI Copy Generation

↓

Translation

↓

Creative Generation

↓

Update Campaign

↓

Frontend Refresh

↓

User Sees Generated Campaign
```

---

# Campaign Publishing Flow

```text
Marketing Manager

↓

Approve Campaign

↓

Backend

↓

Trigger Publish Workflow

↓

n8n

↓

Meta API

↓

TikTok API

↓

Google API

↓

Campaign IDs Returned

↓

Save IDs in Database

↓

Status = Running
```

---

# Reporting Flow

```text
Scheduler

↓

n8n

↓

Advertising APIs

↓

Collect Metrics

↓

Backend

↓

Save Reports

↓

Dashboard Updated
```

---

# Technology Stack

| Layer | Technology | Purpose |
|---------|------------|---------|
| Frontend | Next.js | Web Application |
| UI | React | User Interface |
| Language | TypeScript | Type Safety |
| Backend | NestJS | REST API |
| ORM | Prisma | Database Access |
| Database | PostgreSQL | Persistent Storage |
| Cache | Redis | Performance |
| Automation | n8n | Workflow Automation |
| AI | Gemini / OpenAI / Claude | AI Services |
| Authentication | JWT + Refresh Token | Security |
| Storage | Amazon S3 / Cloudflare R2 | Assets |
| Containerization | Docker | Deployment |
| Reverse Proxy | Nginx | Routing |
| Monitoring | Grafana + Prometheus | Metrics |
| Logging | Winston | Application Logs |
| Version Control | GitHub | Source Code |
| CI/CD | GitHub Actions | Deployment |

---

# Design Principles

## 1. Single Responsibility Principle (SRP)

Each module performs one well-defined responsibility.

Examples

Frontend

Responsible only for presentation.

Backend

Responsible only for business logic.

Database

Responsible only for persistent storage.

n8n

Responsible only for workflow automation.

---

## 2. Separation of Concerns

Every layer has a clear purpose.

Presentation

↓

Business Logic

↓

Data

↓

Automation

↓

External APIs

No layer should perform another layer's responsibilities.

---

## 3. Backend as the Source of Truth

All application data must pass through the backend.

The frontend never:

- Writes directly to PostgreSQL
- Calls Meta APIs directly
- Calls Shopify APIs directly

This improves security and consistency.

---

## 4. Loose Coupling

Each component communicates through interfaces.

Examples

Backend

↓

AI Interface

↓

Gemini

or

↓

OpenAI

Switching providers should require minimal code changes.

---

## 5. High Cohesion

Related functionality should remain together.

Example

Campaign Module

- Create Campaign
- Update Campaign
- Delete Campaign
- Publish Campaign

All campaign logic remains inside the Campaign Module.

---

## 6. Scalability

The system should support:

- Hundreds of Organizations
- Thousands of Brands
- Millions of Campaigns
- Multiple AI Providers
- Multiple Advertising Platforms

without changing the architecture.

---

## 7. Security

All APIs require authentication.

Sensitive data is encrypted.

Secrets are stored securely.

All actions are logged.

Role-based access control (RBAC) is enforced.

---

## 8. Observability

The platform should provide:

- Structured Logs
- Error Tracking
- Metrics
- Health Checks
- Audit Logs

to simplify debugging and monitoring.

---

# Future Architecture

Future versions may include:

- Microservices
- Event Bus
- RabbitMQ
- Kafka
- WebSockets
- Mobile Application
- AI Recommendation Engine
- Auto Budget Optimization

These additions can be introduced without major changes because the system follows modular architecture principles.

---

# Architecture Summary

The Advertising Operating System follows a layered architecture where:

- Next.js provides the user interface.
- NestJS implements business logic and APIs.
- PostgreSQL stores all persistent data.
- Redis improves performance through caching and temporary storage.
- n8n orchestrates automation workflows.
- AI providers generate content and translations.
- External APIs connect the platform with Shopify and advertising platforms.

This architecture ensures scalability, maintainability, extensibility, and clear separation of responsibilities while supporting future growth.