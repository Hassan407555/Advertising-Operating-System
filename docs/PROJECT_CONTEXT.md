# Advertising Operating System

========================================
1. PROJECT OVERVIEW
========================================

Vision

Mission

Product Philosophy

Core Pillars

Target Users

Competitive Advantage

========================================
2. BUSINESS GOALS
========================================

What problem are we solving?

Why users will use us instead of Ads Manager

Long-term roadmap

Version 1 Scope

Version 2 Scope

========================================
3. TECH STACK
========================================

Backend
- NestJS
- TypeScript
- Prisma ORM

Frontend
- Next.js (Planned)

Database
- PostgreSQL

Authentication
- JWT
- Refresh Tokens

AI
- OpenAI
- AI Studio (Planned)

Queues
- BullMQ (Planned)

Storage
- S3 Compatible Storage (Planned)

Infrastructure
- Docker
- Railway / AWS (Planned)

========================================
4. PROJECT ARCHITECTURE
========================================

Complete folder tree

Important folders

Module architecture

Naming conventions

Dependency rules

========================================
5. DATABASE ARCHITECTURE
========================================

ER Diagram (Text)

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
Ad
    │
Creative

Model relationships

Current Prisma models

Upcoming models

Soft delete strategy

Optimistic locking

========================================
6. MODULE STANDARDS
========================================

Every module contains:

dto/

constants/

mapper/

service/

controller/

module/

Validation

Swagger

Pagination

Audit Logging

Organization Isolation

Soft Delete

Optimistic Locking

Prisma Transactions

========================================
7. AUTHENTICATION & AUTHORIZATION
========================================

JWT Flow

Roles

Permissions

CurrentUser Decorator

Guards

========================================
8. API STANDARDS
========================================

Response format

Pagination format

Sorting

Filtering

Search

Errors

Organization isolation

Optimistic locking

Audit logging

========================================
9. COMPLETED MODULES
========================================

✅ Auth

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

========================================
10. CURRENT PROJECT TREE
========================================

apps/api/src/modules/

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

...

========================================
11. CURRENT PRISMA MODELS
========================================

Organization

User

Membership

Invitation

AuditLog

PlatformConnection

PlatformCredential

AdAccount

Campaign

AdSet

Creative

...

========================================
12. CURRENT API ENDPOINTS
========================================

Campaigns

GET

GET :id

POST

PATCH

DELETE

Ad Sets

GET

GET :id

POST

PATCH

DELETE

Supported Query Parameters

- page
- limit
- search
- status
- campaignId
- isActive
- sortBy
- sortOrder

Creatives

GET

POST

PATCH

DELETE

...

========================================
13. DEVELOPMENT WORKFLOW
========================================

1. Build one module at a time

2. One file at a time

3. Compile after every file

4. Fix compilation errors immediately

5. Test every endpoint

6. Verify database changes

7. Verify audit logging

8. Verify organization isolation

9. Verify optimistic locking

10. Continue to next module

Never skip compilation.

Never skip endpoint testing.

========================================
14. ROADMAP
========================================

Completed

✅ Authentication

✅ Organizations

✅ Memberships

✅ Invitations

✅ Audit Logs

✅ Platform Connections

✅ Platform Credentials

✅ Ad Accounts

✅ Campaigns

✅ Ad Sets

✅ Creatives

Current

Ads Module

Next

Analytics

Reporting

Future

AI Studio

Automation

Campaign Generator

Chat Assistant

========================================
15. AI ROADMAP
========================================

Campaign Generator

AI Studio

Automation

Chat Assistant

Optimization

========================================
16. CHANGE HISTORY
========================================

Latest Module Completed

Ad Sets

Completed Features

✅ CRUD

✅ Pagination

✅ Search

✅ Filtering

✅ Sorting

✅ Soft Delete

✅ Optimistic Locking

✅ Organization Isolation

✅ Audit Logging

Database Changes

Generated and applied Prisma migration:

add_missing_audit_actions

Resolved Issue

PostgreSQL AuditAction enum was missing new values.

Generated a new Prisma migration to synchronize the database with schema.prisma.

New APIs

GET    /api/ad-sets

GET    /api/ad-sets/:id

POST   /api/ad-sets

PATCH  /api/ad-sets/:id

DELETE /api/ad-sets/:id

========================================
17. AI ASSISTANT INSTRUCTIONS
========================================

If you're helping with this project:

1. Never change existing architecture.

2. Follow Campaign module style.

3. Follow Creatives module style.

4. Enterprise code only.

5. One file at a time.

6. Never skip compile step.

7. Every endpoint requires:

- Organization isolation
- Audit logging
- Swagger
- DTO validation
- Soft delete
- Optimistic locking

8. Always follow Prisma best practices.

9. Always use Prisma transactions for write operations.

10. Never generate pseudo code.

11. Production-ready code only.

========================================
ARCHITECTURAL DECISIONS
========================================

Decision #001

Organization isolation is enforced in every service.

Reason:

Multi-tenant SaaS.

----------------------------------------

Decision #002

Soft delete is mandatory.

Reason:

Auditability.

----------------------------------------

Decision #003

Optimistic locking uses the version field.

Reason:

Prevent concurrent updates.

----------------------------------------

Decision #004

Every module follows:

DTO

↓

Mapper

↓

Service

↓

Controller

↓

Module

Reason:

Consistency.

----------------------------------------

Decision #005

All write operations use Prisma Transactions.

Reason:

Atomicity and consistency.

----------------------------------------

Decision #006

Every CRUD action writes an Audit Log.

Reason:

Enterprise-grade traceability.

----------------------------------------

Decision #007

Every module is fully tested before starting the next module.

Reason:

Prevent technical debt and ensure production readiness.