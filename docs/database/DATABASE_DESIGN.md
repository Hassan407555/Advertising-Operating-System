# Database Design

Version: 1.0 (MVP)

---

# Purpose

The database is the central source of truth for the Advertising Operating System. It stores all business entities, relationships, configurations, reports, and audit information required to manage advertising campaigns across multiple organizations and brands.

The design follows a relational model using PostgreSQL and is optimized for scalability, maintainability, and data integrity.

---

# Database Design Principles

## 1. Multi-Tenant Architecture

The platform is a SaaS application where multiple organizations share the same database while their data remains logically isolated.

Every business entity belongs to an Organization directly or indirectly.

```
Organization
    │
    ├── Users
    ├── Brands
    ├── Integrations
    └── Reports
```

---

## 2. UUID Primary Keys

Every table uses UUID as the primary key.

Example

```
id UUID PRIMARY KEY
```

Benefits

- Globally unique
- Secure for public APIs
- Easy to merge data
- Suitable for distributed systems

---

## 3. Audit Fields

Every business table includes

```
id

created_at

updated_at

deleted_at

created_by

updated_by
```

This allows complete audit history.

---

## 4. Soft Delete

Records are never permanently deleted.

Instead

```
deleted_at
```

is populated.

Benefits

- Data recovery
- Historical reporting
- Compliance

---

## 5. Single Responsibility

Every table represents exactly one business entity.

Examples

- organizations
- brands
- products
- campaigns

---

## 6. Referential Integrity

Every relationship uses foreign keys.

Example

```
brand_id

REFERENCES brands(id)
```

---

# Core Tables

## organizations

Purpose

Represents a customer using the platform.

| Column | Type |
|---------|------|
| id | UUID |
| name | VARCHAR |
| slug | VARCHAR |
| logo_url | TEXT |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |
| deleted_at | TIMESTAMP |

---

## users

Purpose

Employees belonging to an organization.

| Column | Type |
|---------|------|
| id | UUID |
| organization_id | UUID |
| first_name | VARCHAR |
| last_name | VARCHAR |
| email | VARCHAR |
| password_hash | TEXT |
| role | ENUM |
| status | ENUM |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

## brands

Purpose

Represents a company or product line owned by an organization.

| Column | Type |
|---------|------|
| id | UUID |
| organization_id | UUID |
| name | VARCHAR |
| website | TEXT |
| default_language | VARCHAR |
| default_currency | VARCHAR |
| created_at | TIMESTAMP |

---

## products

Purpose

Products promoted in advertising campaigns.

| Column | Type |
|---------|------|
| id | UUID |
| brand_id | UUID |
| sku | VARCHAR |
| name | VARCHAR |
| description | TEXT |
| image_url | TEXT |
| price | DECIMAL |
| currency | VARCHAR |
| status | ENUM |
| created_at | TIMESTAMP |

---

## campaigns

Purpose

Advertising campaign.

| Column | Type |
|---------|------|
| id | UUID |
| brand_id | UUID |
| name | VARCHAR |
| objective | ENUM |
| budget | DECIMAL |
| start_date | DATE |
| end_date | DATE |
| status | ENUM |
| created_by | UUID |
| created_at | TIMESTAMP |

Campaign Status

- Draft
- Generating
- Pending Review
- Approved
- Publishing
- Running
- Completed
- Archived
- Generation Failed
- Publish Failed

---

## countries

Stores supported countries.

| Column | Type |
|---------|------|
| id | UUID |
| code | VARCHAR |
| name | VARCHAR |

---

## languages

Stores supported languages.

| Column | Type |
|---------|------|
| id | UUID |
| code | VARCHAR |
| name | VARCHAR |

---

## integrations

Connected third-party platforms.

| Column | Type |
|---------|------|
| id | UUID |
| organization_id | UUID |
| provider | ENUM |
| account_name | VARCHAR |
| access_token | TEXT |
| refresh_token | TEXT |
| expires_at | TIMESTAMP |

---

## campaign_assets

Stores AI-generated assets.

| Column | Type |
|---------|------|
| id | UUID |
| campaign_id | UUID |
| asset_type | ENUM |
| title | TEXT |
| content | TEXT |
| asset_url | TEXT |
| provider | VARCHAR |

---

## campaign_reports

Stores daily performance metrics.

| Column | Type |
|---------|------|
| campaign_id | UUID |
| report_date | DATE |
| impressions | INTEGER |
| clicks | INTEGER |
| spend | DECIMAL |
| purchases | INTEGER |
| revenue | DECIMAL |
| roas | DECIMAL |

---

# Junction Tables

## campaign_products

Purpose

Many Products ↔ Many Campaigns

| campaign_id |
|-------------|
| product_id |

---

## campaign_countries

Purpose

Campaign targeting multiple countries.

| campaign_id |
|-------------|
| country_id |

---

## campaign_languages

Purpose

Campaign translated into multiple languages.

| campaign_id |
|-------------|
| language_id |

---

## brand_users (Future)

Assign users to specific brands.

| brand_id |
|-----------|
| user_id |

---

# Entity Relationships

```
Organization

│

├── Users

│

├── Brands

│      │

│      ├── Products

│      │

│      └── Campaigns

│              │

│              ├── Campaign Products

│              ├── Campaign Countries

│              ├── Campaign Languages

│              ├── Campaign Assets

│              └── Campaign Reports

│

└── Integrations
```

Relationship Summary

- One Organization has many Users.
- One Organization has many Brands.
- One Brand has many Products.
- One Brand has many Campaigns.
- One Campaign has many Assets.
- One Campaign has many Reports.
- One Campaign targets many Countries.
- One Campaign targets many Languages.
- One Campaign promotes many Products.

---

# Indexing Strategy

Indexes improve performance for frequently queried data.

Primary Indexes

```
PRIMARY KEY (id)
```

Unique Indexes

```
users.email

organizations.slug

brands.name
```

Foreign Key Indexes

```
organization_id

brand_id

campaign_id

product_id

country_id

language_id
```

Performance Indexes

```
campaigns.status

campaigns.start_date

campaign_reports.report_date

campaign_reports.campaign_id

products.sku
```

Composite Indexes

```
campaign_reports

(campaign_id, report_date)

campaign_products

(campaign_id, product_id)
```

---

# Naming Conventions

## Tables

Plural

```
organizations

users

brands

products

campaigns
```

---

## Primary Keys

Always

```
id
```

---

## Foreign Keys

Always

```
organization_id

brand_id

campaign_id

product_id
```

---

## Date Fields

```
created_at

updated_at

deleted_at
```

---

## Boolean Fields

```
is_active

is_deleted

is_verified
```

---

## Enum Fields

```
status

role

provider

asset_type
```

---

# Normalization Approach

The schema follows Third Normal Form (3NF).

## First Normal Form (1NF)

Every field stores one value.

Good

```
country = USA
```

Bad

```
country = USA, Canada, Germany
```

---

## Second Normal Form (2NF)

Every non-key attribute depends on the full primary key.

Junction tables contain only relationship data.

---

## Third Normal Form (3NF)

No duplicate information.

Example

Campaign stores

```
brand_id
```

Instead of

```
brand_name
```

The name is retrieved through relationships.

This eliminates redundancy.

---

# Data Integrity Rules

- Every User belongs to one Organization.
- Every Brand belongs to one Organization.
- Every Product belongs to one Brand.
- Every Campaign belongs to one Brand.
- Every Campaign Product must reference valid Product and Campaign records.
- Every Report must belong to an existing Campaign.

---

# Future Tables

Version 2 may introduce

- notifications
- webhooks
- audit_logs
- ai_prompts
- budgets
- invoices
- billing
- organizations_settings
- media_library
- workflows
- workflow_executions
- api_keys
- scheduled_jobs

These tables can be added without affecting the core schema because the database follows a modular design.

---

# Database Summary

The Advertising Operating System database is designed to support:

- Multi-tenant SaaS architecture
- Multiple organizations
- Multiple brands
- Thousands of products
- Millions of campaigns
- AI-generated content
- Multi-country campaigns
- Multi-language campaigns
- Historical reporting
- Future integrations

The schema emphasizes normalization, data integrity, scalability, and maintainability while remaining flexible for future platform growth.