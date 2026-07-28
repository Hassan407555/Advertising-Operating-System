# AI Meta Ads Studio

## Project Context — Single Source of Truth

> **CONSTITUTION (LOCKED)**
>
> This document is the constitution of the project.
>
> Do **not** modify `PROJECT_CONTEXT.md` during normal development.
> Any architectural or product changes require **explicit approval** before this document is updated.
>
> When implementing features, follow this blueprint. If a request conflicts with this document, stop and ask.

---

# 1. PRODUCT OVERVIEW

## Product Name (Working)

**AI Meta Ads Studio**

## Purpose

This project is a **portfolio-quality SaaS application**.

It is **not** an enterprise advertising operating system.

It is **not** a multi-platform advertising platform.

It solves **one problem** extremely well:

> Generate high-quality Meta Ads campaigns for Shopify products using AI.

## Mission

Enable a marketer to:

1. Connect a Shopify store
2. Pick a product
3. Answer a short AI interview
4. Receive a complete Meta Ads campaign draft via Gemini
5. Review, edit, and save that draft

## Product Philosophy

* One problem, solved deeply
* Simplicity over extensibility
* Backend First
* API First
* Modular where it helps clarity — not for hypothetical scale
* Multi-Tenant (organizations)
* Multi-Store (Shopify stores within an organization)
* Production-Ready Code
* Clean & Maintainable Design

---

# 2. CORE WORKFLOW

```text
Login
    ↓
Organization
    ↓
Connect Shopify Store
    ↓
Sync Products
    ↓
Configure Meta Advertising
    ↓
Products
    ↓
Advertise Product
    ↓
AI Interview
    ↓
Gemini Campaign Generation
    ↓
Review Campaign
    ↓
Save Draft
    ↓
(Optional Future) Publish to Meta
```

This end-to-end path is the product. Every feature must serve it.

---

# 3. SUPPORTED PLATFORMS

**Only:**

* Shopify
* Meta Ads

**Explicitly out of scope forever (for this product):**

* Google Ads
* TikTok Ads
* LinkedIn Ads
* Pinterest
* Snapchat
* Any multi-platform advertising roadmap

Do not add abstractions, enums, UI, or docs that imply other ad platforms.

---

# 4. AI PROVIDER

Use the **Gemini API**.

Gemini is the reasoning engine only.

We are **not**:

* Building our own AI model
* Fine-tuning models
* Building RAG
* Building embeddings
* Building AI memory

Do not introduce vector stores, knowledge bases, or custom model training.

---

# 5. SUPPORTED CAMPAIGN TYPES

Generate Meta campaigns for **only**:

* Image Ads
* Carousel Ads
* Video Ads

Nothing else.

---

# 6. AI INPUTS

The AI uses four input sources:

### 1. Shopify Product Data

* Title
* Description
* Images
* Variants
* Inventory
* Pricing

### 2. Existing Analytics / Performance Data

Already available in the application. Examples:

* Revenue
* ROAS
* Spend
* CTR
* CPC
* CPM
* Orders
* Conversions

### 3. Store Information

* Brand
* Currency
* Advertising configuration (Meta destination IDs)

### 4. User Interview Answers

* Objective
* Budget
* Country
* Audience
* Offer
* Ad Type

---

# 7. AI OUTPUT

The AI generates a complete Meta campaign as **structured JSON**.

### Image Ads

* Campaign Name
* Objective
* Audience
* Budget
* Headlines
* Primary Text
* Description
* CTA
* Creative Brief

### Carousel Ads

* Campaign
* Audience
* Budget
* Card Titles
* Card Descriptions
* CTA
* Card Order
* Carousel Strategy

### Video Ads

* Campaign
* Audience
* Budget
* Hook
* Video Script
* Storyboard
* Shot List
* CTA

### Media rules

* Prefer Shopify product images and existing uploaded assets.
* For video: generate script, storyboard, and shot list only.
* Do **not** build AI image generation or AI video generation.

---

# 8. COMPLETED MODULES

| Module | Status |
|---|---|
| Authentication | ✓ Completed |
| Organizations | ✓ Completed |
| Shopify Integration | ✓ Completed |
| Products | ✓ Completed |
| Analytics & Performance | ✓ Completed |
| Active Store | ✓ Completed |
| Advertising Configuration | ✓ Completed |
| AI Session | ✓ Completed |
| AI Campaign Entry | ✓ Completed |

These modules are the foundation. Build the remaining roadmap on top of them — do not rebuild them.

---

# 9. REMAINING ROADMAP

Execute **one phase at a time**. Do not pull later work forward without explicit approval.

## Phase 5 — AI Interview

* Structured interview
* Adaptive questions by ad type
* Save answers to the AI session

## Phase 6 — Gemini Campaign Generator

* Build the prompt
* Combine product + analytics + interview
* Generate Meta campaign JSON via Gemini

## Phase 7 — Campaign Review

* Display the generated campaign
* Allow editing
* Validate before save

## Phase 8 — Campaign History

* Saved drafts
* Previous generations

## Phase 9 — Dashboard Polish

* Products
* Campaigns generated
* Existing performance metrics

## Phase 10 (Optional) — Publish to Meta

* Create Campaign
* Create Ad Set
* Create Ads

**Publishing notes:**

* No synchronization engine
* No optimization engine
* One-way create only

---

# 10. LOCKED PRODUCT DECISIONS

## 10.1 Active Store

The user selects an **active Shopify store** at session level (same idea as active organization).

```text
Organization
    ↓
Select Store
    ↓
Products / Analytics / AI / Campaigns
```

Everything after store selection is scoped to that store.

If a feature operates on products, campaigns, analytics, AI, or Meta integration, it **must** require an active store.

## 10.2 Campaign → Store Relationship

Every campaign belongs to **exactly one Shopify store**.

```text
Organization → Shopify Store → Products → Campaigns
```

## 10.3 Advertising Configuration

The store owns its Meta advertising destination:

```text
Shopify Store
    ↓
Advertising Configuration
    ↓
Meta Business (ID)
Ad Account (ID)
Facebook Page (ID)
Instagram (ID)
Pixel (ID, optional)
Catalog (ID, optional)
```

Persist **relationship IDs only**. Do not treat Meta display names as source of truth.

Users are not asked to pick a Meta ad account on every AI run.

## 10.4 Store Readiness (COMPUTED — never stored)

A store is **advertising-ready** when:

* Shopify Connected
* Products Synced
* Meta Connected
* Ad Account Selected

**Store readiness is always computed. Never persist it as a database flag.**

AI workflows must verify readiness before campaign generation.

## 10.5 Draft Storage

Do **not** create a separate draft document model.

Use existing campaign entities:

```text
Campaign (Draft) → Ad Sets (Draft) → Ads (Draft) → Creative (Draft)
```

AI output lands in the same data model publishing will use later.

## 10.6 AI Interview UX

Do **not** build a free-form chatbot.

Build a **guided conversational wizard** with clear steps.

Ask only what is necessary for the selected ad type.

Examples:

* **Image Ad** — Country, Language, Budget, Goal
* **Carousel Ad** — Number of cards, Highlight products?
* **Video Ad** — Preferred duration, Style, Tone

## 10.7 Review Flow (Simple)

```text
Generate → Review → Edit (optional) → Save Draft
```

Human review is required before any future publish step.

No multi-person approval chains. No enterprise collaboration workflows.

## 10.8 Permissions (V1)

| Role | Generate drafts | Approve / Save | Everything else |
|---|---|---|---|
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | As existing admin policy |
| Member | Yes | No | Limited as existing member policy |

## 10.9 Primary Navigation

```text
Dashboard
Products
Campaigns
Analytics
Advertising Configuration
Settings
```

---

# 11. WHAT THE AI SHOULD AND SHOULD NOT DO

## AI SHOULD

* Run a guided, adaptive interview
* Use Shopify product data, analytics, store info, and interview answers
* Call Gemini to produce structured Meta campaign JSON
* Create draft campaigns in existing entities
* Support Image, Carousel, and Video ad types only

## AI SHOULD NOT

* Publish automatically
* Modify live / published campaigns
* Delete campaigns
* Spend budget without approval
* Generate fake analytics
* Call Meta publish APIs before Phase 10
* Bypass human review
* Invent multi-platform campaigns

---

# 12. EXPLICITLY OUT OF SCOPE

Do **not** design, stub, or implement:

* AI Manager Registry
* Product Analyzer Manager
* Marketing Strategist Manager
* Creative Planner Manager
* Review Manager
* Publisher Manager (as a complex subsystem — Phase 10 is a simple Meta create flow only)
* Workflow Engine
* Prompt Versioning
* AI Memory
* Multi-step Approval
* Enterprise Collaboration
* Multi-platform Roadmap
* AI Optimization Engine
* RAG / embeddings / vector search
* Fine-tuned models
* Store Knowledge layers
* Synchronization with Meta after publish
* Campaign optimization / automated scaling

These were considered and intentionally rejected for this product.

---

# 13. PROJECT GUARDRAILS

1. **Every feature must directly help users create better Meta Ads campaigns.**

2. **Do not introduce enterprise architecture unless explicitly requested.**

3. **Prefer simplicity over extensibility.**

4. **Do not add features for future possibilities.**  
   Build only what the current product requires.

5. **Every new module should improve the end-to-end experience of:**

```text
Shopify Product
    ↓
AI Interview
    ↓
Gemini
    ↓
Meta Campaign
    ↓
Review
    ↓
Save Draft
```

If a change does not strengthen that path, it does not belong in this product.

---

# 14. DEVELOPMENT PRINCIPLES

Every change must:

* Follow existing project structure and conventions
* Prefer simple orchestration of existing services over parallel systems
* Enforce organization isolation
* Enforce active-store isolation for products, campaigns, analytics, and AI work
* Keep AI-generated entities in Draft until the user saves / approves
* Build one feature at a time
* Fully test each feature before moving to the next
* Include proper validation and error handling

---

# 15. DEVELOPMENT WORKFLOW (MANDATORY)

For every feature, before writing code:

1. Explain the implementation plan.
2. List the files that will change.
3. Explain why each file changes.
4. Wait for approval if the plan is non-trivial or architectural.
5. Implement **only** that feature.
6. Provide testing steps.
7. Stop and wait for approval before starting the next feature.

Do not make broad, unreviewed changes across unrelated modules.

Do not modify this constitution document unless explicitly asked.

---

# 16. SUCCESS CRITERIA (CURRENT PRODUCT)

The product succeeds when a user can:

1. Log in and select an organization.
2. Select an active Shopify store.
3. Complete Advertising Configuration (Meta relationship IDs).
4. Browse products for that store.
5. Click **Advertise Product** when the store is advertising-ready.
6. Complete the guided AI interview (adaptive by ad type).
7. Receive a Gemini-generated Meta campaign as structured JSON.
8. Review and edit the campaign.
9. Save it as a draft.
10. See store-scoped products, campaigns, and analytics correctly.

Publishing to Meta is optional and comes last (Phase 10).

---

> **RE-LOCKED**
>
> After this approved rewrite, `PROJECT_CONTEXT.md` is locked again.
> Do not modify it during normal development without explicit approval.
