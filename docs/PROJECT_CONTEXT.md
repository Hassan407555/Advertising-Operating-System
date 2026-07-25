

# Advertising Operating System

## Project Roadmap (Portfolio Edition)

---

# 1. PROJECT OVERVIEW

## Vision

Build a modern Advertising Operating System that demonstrates enterprise-grade backend engineering by automating the entire advertising workflow—from product synchronization to AI-powered campaign creation, media processing, publishing, and analytics.

---

## Mission

Create a single platform where marketers can:

* Connect their Shopify store
* Sync products automatically
* Generate complete advertising campaigns
* Optimize media assets
* Publish campaigns to advertising platforms
* Monitor performance through analytics and dashboards

The goal is **not** to replicate Meta Ads Manager or enterprise marketing suites. Instead, the goal is to build a polished, end-to-end portfolio project that showcases strong software architecture, integrations, automation, background processing, and AI capabilities.

---

## Product Philosophy

* Backend First
* API First
* Automation Driven
* AI Assisted
* Modular Architecture
* Multi-Tenant
* Production-Ready Code
* Clean & Maintainable Design

---

# 2. PROJECT GOALS

The project should demonstrate the ability to build:

* Enterprise backend architecture
* Third-party integrations
* OAuth authentication
* Background jobs
* Media processing pipelines
* AI integrations
* Workflow automation
* REST APIs
* Multi-tenant systems
* Scalable module architecture

---

# 3. FINAL USER FLOW

```text
Connect Shopify
        ↓
Sync Products
        ↓
Select Product
        ↓
Choose Countries
        ↓
Choose Platforms
        ↓
Launch Campaign
        ↓
AI generates copy
        ↓
Media optimized
        ↓
Campaign created
        ↓
Published to Meta & TikTok
        ↓
Analytics collected
        ↓
Reports generated
        ↓
Dashboard updated
```

---

# 4. DEVELOPMENT ROADMAP

## Phase 1 — Finish Current Backend

### Module 1 — Analytics

Build:

* Analytics Snapshots
* KPI APIs
* Dashboard Metrics
* Time Series
* Campaign Breakdown
* Ad Set Breakdown
* Ad Breakdown
* Creative Breakdown
* Filtering
* Aggregations

---

### Module 2 — Reporting

Build:

* Report APIs
* Saved Reports
* Scheduled Reports
* CSV Export
* Excel Export
* PDF Export

---

### Module 3 — Dashboards

Build:

* Executive Dashboard
* Campaign Dashboard
* KPI Cards
* Charts
* Performance Widgets
* Summary APIs

---

# Phase 2 — Shopify Integration

Purpose

Connect Shopify and import products for campaign generation.

Build:

* Shopify OAuth
* Store Connection
* Product Sync
* Product Image Sync
* Manual Sync Endpoint
* Optional Product Webhook

Do NOT build:

* Orders
* Customers
* Inventory
* Fulfillment
* Discounts

---

# Phase 3 — Automation Engine

Instead of building a full workflow builder, create a lightweight automation engine.

## Supported Triggers

* New Product
* Manual Launch
* Scheduled Launch

## Supported Actions

* Generate Campaign
* Generate AI Copy
* Process Media
* Publish Campaign
* Send Notification

---

# Phase 4 — Campaign Generator

Input

* Shopify Product
* Target Countries
* Advertising Platforms

Output

Automatically generate:

* Campaign
* Ad Set
* Ads

using the existing modules already built.

---

# Phase 5 — Media Processing

Implement only the features needed for campaign publishing.

Image Processing

* Resize
* Compression
* WebP Conversion

Video Processing

* Thumbnail Generation
* FFmpeg Conversion

Metadata

* Width
* Height
* Duration
* File Size
* MIME Type

---

# Phase 6 — Publisher

Support only two publishing targets.

Platforms

* Meta
* TikTok

Responsibilities

* Prepare payloads
* Validate assets
* Publish campaigns
* Track publishing status
* Handle publishing errors

Design the publisher using adapters so more platforms can be added later.

---

# Phase 7 — AI

Keep AI focused on content generation.

Features

* Generate Ad Copy
* Generate Headlines
* Generate CTAs
* Translate Copy

Do NOT build:

* AI Agents
* Autonomous Optimization
* AI Studio
* AI Chat Assistant

---

# 5. WHAT WE ARE NOT BUILDING

To keep the project focused, we will intentionally exclude:

* Drag-and-drop workflow builder
* Complex automation designer
* Enterprise AI agents
* Budget optimizer
* Predictive analytics
* Recommendation engine
* Multi-region deployment
* Billing system
* Subscription management
* 20+ advertising platforms
* Enterprise DevOps infrastructure

---

# 6. DEVELOPMENT PRINCIPLES

Every module must:

* Follow the existing project architecture.
* Be built one module at a time.
* Be built one file at a time.
* Compile after every file.
* Fix compilation errors immediately.
* Include DTO validation.
* Enforce organization isolation.
* Include proper error handling.
* Use Prisma transactions where appropriate.
* Be tested before moving to the next module.

---

# 7. EXECUTION ORDER (LOCKED)

```text
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
✅ Creative Assets
✅ Ads

🚧 Analytics

⬜ Reporting

⬜ Dashboards

⬜ Shopify Integration

⬜ Automation Engine

⬜ Campaign Generator

⬜ Media Processing

⬜ Publisher (Meta)

⬜ Publisher (TikTok)

⬜ AI Copy Generation

⬜ AI Translation
```

---

# 8. PROJECT COMPLETION CRITERIA

The project is considered complete when a user can:

1. Connect a Shopify store.
2. Synchronize products.
3. Select a product for promotion.
4. Choose target countries.
5. Choose Meta and/or TikTok.
6. Launch a campaign.
7. Have AI generate localized ad copy.
8. Automatically optimize media assets.
9. Automatically create Campaigns, Ad Sets, and Ads.
10. Publish to Meta and TikTok.
11. View campaign performance through Analytics.
12. Export Reports.
13. Monitor everything through Dashboards.

---
