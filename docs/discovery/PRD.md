# Advertising OS - Project Blueprint

## Vision

Build a production-ready AI-powered Advertising & Marketing Operating System.

The platform allows agencies, brands, and marketing teams to manage campaigns, products, analytics, AI, and automations from one unified dashboard while integrating with external platforms such as TikTok, Meta, Google, Shopify, OpenAI, Gmail, Slack, and others.

The platform owns the business logic.

External platforms provide data and execution.

---

# Product Goals

- Unified marketing dashboard
- Multi-platform campaign management
- AI-powered marketing assistant
- Workflow automation
- Cross-platform analytics
- Creator & affiliate management
- Enterprise-ready architecture

---

# Technology Stack

## Frontend

- Next.js
- TypeScript
- TailwindCSS
- shadcn/ui
- TanStack Query

## Backend

- NestJS
- Prisma
- PostgreSQL
- JWT Authentication

## Workflow

- n8n

## AI

- OpenAI
- Anthropic
- Gemini

---

# Architecture Principles

## Business First

Features solve business problems.

Never build modules simply because an API exists.

---

## Platform Agnostic

Core entities remain provider-independent.

Examples:

Campaign

Creative

Product

Audience

Ad Account

Provider-specific logic belongs inside adapters.

---

## Source of Truth

PostgreSQL is the source of truth.

External APIs synchronize data into our database.

---

## Execution Engine

NestJS owns business logic.

n8n executes workflows.

---

## AI

AI is integrated throughout the product.

It is not a standalone chatbot.

---

# Development Workflow

Every module follows this order:

1. Requirements
2. Database Design
3. API Design
4. Backend
5. Frontend
6. Integration
7. Testing
8. Review

---

# Current Roadmap

Sprint 1

- User Profile
- Settings
- API Keys
- Dashboard Layout

Sprint 2

- Integration Center

Sprint 3

- Campaign Management

Sprint 4

- Workflow Engine

Sprint 5

- AI Copilot

Sprint 6

- Analytics

Sprint 7

- Reports

Sprint 8

- Creator Management

---

# Code Standards

- Thin Controllers
- Business Logic in Services
- DTO Validation
- Prisma Transactions where required
- Audit important actions
- Strong typing
- Feature-first architecture
- Clean folder structure
- Reusable services
- No duplicated logic

---

# Long-term Goal

Create a commercial-grade Advertising Operating System that can manage multiple marketing platforms while leveraging AI and automation to simplify marketing operations.