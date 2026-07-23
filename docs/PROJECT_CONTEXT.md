# Advertising Operating System

---

# 1. PROJECT OVERVIEW

## Vision

Build the world's most intelligent Advertising Operating System that unifies campaign creation, optimization, AI assistance, analytics, automation, and multi-platform advertising into one enterprise SaaS platform.

## Mission

Replace fragmented advertising workflows with a centralized, AI-powered platform capable of managing the complete advertising lifecycle.

## Product Philosophy

- Enterprise First
- AI Native
- Multi Tenant
- Platform Agnostic
- Automation Driven
- Developer Friendly
- Highly Scalable

## Core Pillars

- Organization Management
- Advertising Management
- AI Optimization
- Analytics
- Automation
- Collaboration
- Auditability

## Target Users

- Marketing Agencies
- Brands
- Enterprises
- Media Buyers
- Freelancers
- Advertising Teams

## Competitive Advantage

- AI-assisted campaign management
- Multi-platform architecture
- Enterprise-grade audit logging
- Built-in automation
- Organization isolation
- Modern scalable backend

---

# 2. BUSINESS GOALS

## Problem We Solve

Managing advertising across multiple platforms is fragmented, repetitive, and difficult to scale.

Our platform centralizes:

- Campaign Management
- Creative Management
- Analytics
- Optimization
- AI Recommendations
- Automation

## Why Users Choose Us

- Unified dashboard
- AI-powered optimization
- Enterprise architecture
- Complete audit history
- Multi-platform integrations
- Workflow automation

## Long-Term Roadmap

- AI Studio
- Campaign Generator
- AI Optimization
- Automation Engine
- Reporting
- Budget Optimizer
- Predictive Analytics

## Version 1 Scope

- Authentication
- Organizations
- Platform Connections
- Ad Accounts
- Campaigns
- Ad Sets
- Creatives
- Ads

## Version 2 Scope

- Analytics
- Reporting
- Dashboards
- Automation
- AI Studio
- Recommendations
- Notifications

---

# 3. TECH STACK

## Backend

- NestJS
- TypeScript
- Prisma ORM

## Frontend

- Next.js (Planned)

## Database

- PostgreSQL

## Authentication

- JWT
- Refresh Tokens

## AI

- OpenAI
- AI Studio (Planned)

## Queues

- BullMQ (Planned)

## Storage

- S3 Compatible Storage (Planned)

## Infrastructure

- Docker
- Railway
- AWS (Planned)

---

# 4. PROJECT ARCHITECTURE

## Folder Structure

```
apps/
└── api/
    └── src/
        ├── common/
        ├── infrastructure/
        └── modules/
```

## Module Structure

```
module/

constants/

dto/

mapper/

service.ts

controller.ts

module.ts
```

## Naming Conventions

- PascalCase Classes
- camelCase variables
- kebab-case filenames
- Singular DTOs
- Plural Modules

## Dependency Rules

Controller

↓

Service

↓

Mapper

↓

Prisma

Never bypass the Service layer.

---

# 5. DATABASE ARCHITECTURE

## Entity Relationship

```
Organization
      │
Membership
      │
User
      │
Platform Connection
      │
Platform Credential
      │
Ad Account
      │
Campaign
      │
Ad Set
      │
Creative
      │
Ad
```

## Current Prisma Models

- Organization
- User
- Membership
- Invitation
- AuditLog
- PlatformConnection
- PlatformCredential
- AdAccount
- Campaign
- AdSet
- Creative
- Ad

## Future Models

- Analytics
- Reports
- Insights
- AI Suggestions
- Notifications
- Automation Rules

## Database Standards

- UUID/CUID IDs
- Soft Delete
- Version Field
- CreatedAt
- UpdatedAt
- Multi-Tenant Design

---

# 6. MODULE STANDARDS

Every module contains

```
constants/

dto/

mapper/

service.ts

controller.ts

module.ts
```

Every module includes

- DTO Validation
- Pagination
- Filtering
- Sorting
- Search
- Organization Isolation
- Soft Delete
- Audit Logging
- Optimistic Locking
- Prisma Transactions
- Enterprise Error Handling

---

# 7. AUTHENTICATION & AUTHORIZATION

Implemented

- JWT Authentication
- Refresh Tokens
- CurrentUser Decorator
- JwtAuthGuard
- Organization Isolation

Authorization Strategy

- Organization scoped access
- Role based permissions (planned)

---

# 8. API STANDARDS

## Response

```
success

data

meta
```

## Pagination

- page
- limit
- total
- totalPages
- hasNextPage
- hasPreviousPage

## Query Standards

- search
- page
- limit
- status
- sortBy
- sortOrder

## Enterprise Features

- Organization Isolation
- Soft Delete
- Optimistic Locking
- Audit Logging
- Prisma Transactions

---

# 9. COMPLETED MODULES

✅ Authentication

✅ Organizations

✅ Users

✅ Memberships

✅ Invitations

✅ Audit Logs

✅ Platform Connections

✅ Platform Credentials

✅ Ad Accounts

✅ Campaigns

✅ Ad Sets

✅ Creatives

✅ Ads

---

# 10. CURRENT PROJECT TREE

```
modules/

auth/

organizations/

users/

memberships/

invitations/

audit-logs/

platform-connections/

platform-credentials/

ad-accounts/

campaigns/

ad-sets/

creatives/

ads/
```

---

# 11. CURRENT PRISMA MODELS

- Organization
- User
- Membership
- Invitation
- AuditLog
- PlatformConnection
- PlatformCredential
- AdAccount
- Campaign
- AdSet
- Creative
- Ad

---

# 12. CURRENT API ENDPOINTS

## Campaigns

GET

GET :id

POST

PATCH

DELETE

Query

- page
- limit
- search
- status
- adAccountId
- isActive
- sortBy
- sortOrder

---

## Ad Sets

GET

GET :id

POST

PATCH

DELETE

Query

- page
- limit
- search
- status
- campaignId
- isActive
- sortBy
- sortOrder

---

## Creatives

GET

GET :id

POST

PATCH

DELETE

---

## Ads

GET

GET :id

POST

PATCH

DELETE

Query

- page
- limit
- search
- status
- adSetId
- creativeId
- isActive
- sortBy
- sortOrder

---

# 13. DEVELOPMENT WORKFLOW

1. Build one module at a time.

2. Build one file at a time.

3. Compile after every file.

4. Fix compilation errors immediately.

5. Register the module.

6. Verify dependency injection.

7. Test every endpoint in Postman.

8. Test all query parameters.

9. Test validation.

10. Test optimistic locking.

11. Test soft delete.

12. Verify organization isolation.

13. Verify audit logging.

14. Commit after all tests pass.

15. Move to the next module.

Never skip compilation.

Never skip endpoint testing.

---

# 14. ROADMAP

## Completed

✅ Authentication

✅ Organizations

✅ Users

✅ Memberships

✅ Invitations

✅ Audit Logs

✅ Platform Connections

✅ Platform Credentials

✅ Ad Accounts

✅ Campaigns

✅ Ad Sets

✅ Creatives

✅ Ads

## Current

Analytics Module

## Next

- Reporting
- Dashboards
- AI Studio

## Future

- Automation Engine
- Campaign Generator
- Chat Assistant
- AI Optimization
- Predictive Analytics

---

# 15. AI ROADMAP

- Campaign Generator
- AI Studio
- Automation
- AI Optimization
- Chat Assistant
- Recommendations
- Budget Optimization
- Predictive Analytics

---

# 16. CHANGE HISTORY

## Latest Module Completed

Ads

## Completed Features

✅ CRUD

✅ Pagination

✅ Search

✅ Filtering

✅ Sorting

✅ Soft Delete

✅ Optimistic Locking

✅ Organization Isolation

✅ Audit Logging

✅ Prisma Transactions

✅ Ad Set Ownership Validation

✅ Creative Ownership Validation

✅ Enterprise Error Handling

## API Testing

Successfully tested in Postman

- ✅ Create
- ✅ Get All
- ✅ Get By Id
- ✅ Update
- ✅ Delete
- ✅ Search
- ✅ Filtering
- ✅ Sorting
- ✅ Soft Delete
- ✅ Optimistic Locking
- ✅ Validation
- ✅ Organization Isolation

## New APIs

GET    /api/ads

GET    /api/ads/:id

POST   /api/ads

PATCH  /api/ads/:id

DELETE /api/ads/:id

---

# 17. AI ASSISTANT INSTRUCTIONS

When contributing to this project:

1. Never change the existing architecture.

2. Follow Campaign module standards.

3. Follow Ad Set module standards.

4. Follow Creative module standards.

5. Follow Ads module standards.

6. Enterprise-quality code only.

7. Build one file at a time.

8. Never skip compilation.

9. Every endpoint must include:

- DTO Validation
- Organization Isolation
- Audit Logging
- Soft Delete
- Optimistic Locking
- Prisma Transactions

10. Test every endpoint before marking a module complete.

11. Never move to the next module until the current module passes all Postman tests.

12. Never generate pseudo code.

13. Always produce production-ready code.

---

# ARCHITECTURAL DECISIONS

## Decision #001

Organization isolation is enforced in every service.

Reason

Multi-tenant SaaS.

---

## Decision #002

Soft delete is mandatory.

Reason

Enterprise auditability.

---

## Decision #003

Optimistic locking uses the version field.

Reason

Prevent concurrent updates.

---

## Decision #004

Every module follows

```
DTO

↓

Mapper

↓

Service

↓

Controller

↓

Module
```

Reason

Consistency and maintainability.

---

## Decision #005

All write operations use Prisma Transactions.

Reason

Atomicity and consistency.

---

## Decision #006

Every CRUD action writes an Audit Log.

Reason

Enterprise-grade traceability.

---

## Decision #007

Every module must be fully compiled and tested before development continues.

Reason

Prevent technical debt and maintain production quality.