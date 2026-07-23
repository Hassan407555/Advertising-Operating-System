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

Frontend

Database

Authentication

AI

Queues

Storage

Infrastructure

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

ER Diagram (text)

Model relationships

Current Prisma models

Upcoming models

Soft delete strategy

Optimistic locking

========================================
6. MODULE STANDARDS
========================================

Every module must contain

dto/

constants/

mapper/

service/

controller/

module/

Validation

Swagger

Pagination

Audit logging

Organization isolation

========================================
7. AUTHENTICATION & AUTHORIZATION
========================================

JWT Flow

Roles

Permissions

CurrentUser decorator

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

========================================
9. COMPLETED MODULES
========================================

Auth

Organizations

Users

Memberships

Invitations

Audit Logs

Platform Connections

Platform Credentials

Ad Accounts

Campaigns

Creatives

========================================
10. CURRENT PROJECT TREE
========================================

apps/api/src/modules/

auth/

organizations/

campaigns/

creatives/

...

========================================
11. CURRENT PRISMA MODELS
========================================

Organization

User

Membership

Invitation

PlatformConnection

PlatformCredential

AdAccount

Campaign

Creative

...

========================================
12. CURRENT API ENDPOINTS
========================================

Campaigns

GET

POST

PATCH

DELETE

Creatives

GET

POST

PATCH

DELETE

...

========================================
13. DEVELOPMENT WORKFLOW
========================================

One file at a time

Compile

Test

Continue

Never skip compilation

========================================
14. ROADMAP
========================================

Completed

Current

Next

Future

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

Latest module completed

Important architecture changes

New APIs

Database changes

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

7. Every endpoint requires

- Organization isolation
- Audit logging
- Swagger
- DTO Validation

8. Always follow Prisma best practices.

9. Never generate pseudo code.

10. Production-ready code only.

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

Optimistic locking uses version field.

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