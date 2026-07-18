# Business Process

## Purpose

The Advertising Operating System enables marketing teams to create, review, publish, and monitor advertising campaigns across multiple brands, products, countries, and advertising platforms from a single centralized platform.

The system reduces repetitive manual work by combining AI, workflow automation, and human approval before publishing campaigns.

---

# Campaign Lifecycle

```
Draft
   ↓
Generating Assets
   ↓
Pending Review
   ↓
Approved
   ↓
Publishing
   ↓
Running
   ↓
Completed
   ↓
Archived
```

If any step fails:

```
Generating
      ↓
Generation Failed

Publishing
      ↓
Publish Failed
```

Users can retry the failed step without recreating the campaign.

---

# Actors

| Actor | Responsibility |
|--------|----------------|
| Organization Owner | Manage organization, brands, users, integrations and system settings |
| Marketing Manager | Create campaigns, review AI content, approve campaigns and monitor performance |
| AI Service | Generate ad copy, headlines, descriptions and CTAs |
| Translation Service | Translate generated content into selected languages |
| Creative Service | Generate advertising creatives using templates |
| Automation Engine | Execute workflows and publish campaigns |
| Advertising Platforms | Receive campaigns (Meta, Google, TikTok) |
| Reporting Service | Collect campaign performance metrics |

---

# Business Process

## Step 1 — Campaign Planning

The Marketing Manager decides to launch a new advertising campaign for a specific brand.

The manager defines:

- Brand
- Products
- Countries
- Languages
- Promotion
- Campaign Dates
- Budget

The campaign is saved as **Draft**.

---

## Step 2 — Content Generation

Once the campaign is ready, the manager starts content generation.

The system automatically:

- Retrieves product information
- Retrieves promotion details
- Retrieves target countries
- Retrieves supported languages

The AI service generates:

- Headlines
- Primary Text
- Descriptions
- Call-to-Actions

---

## Step 3 — Translation

If multiple countries are selected, the Translation Service automatically translates all marketing content into the required languages.

---

## Step 4 — Creative Generation

The Creative Service creates advertising creatives using:

- Product Images
- Brand Assets
- Templates
- Generated Marketing Copy

Generated creatives are attached to the campaign.

---

## Step 5 — Review & Approval

The Marketing Manager reviews:

- AI Copy
- Translations
- Creatives

The manager can:

- Approve
- Edit
- Reject
- Regenerate

Only approved campaigns continue to the next stage.

---

## Step 6 — Campaign Publishing

After approval, the Automation Engine publishes the campaign to connected advertising platforms.

Example:

- Meta Ads
- Google Ads
- TikTok Ads

The platform creates:

- Campaign
- Ad Sets
- Ads

Status changes to **Publishing**.

Once successful:

Status becomes **Running**.

---

## Step 7 — Campaign Monitoring

While campaigns are active, the Reporting Service periodically collects:

- Spend
- Impressions
- Clicks
- CTR
- CPC
- CPA
- Purchases
- Revenue
- ROAS

The dashboard updates automatically.

---

## Step 8 — Campaign Completion

When the campaign end date is reached, the system marks the campaign as **Completed**.

Historical performance remains available for reporting.

---

## Step 9 — Campaign Archive

Completed campaigns can be archived.

Archived campaigns:

- Cannot be edited
- Remain searchable
- Continue to appear in reports

---

# Exception Handling

## AI Generation Failure

If AI content generation fails:

Campaign Status:

Generation Failed

The Marketing Manager may retry the generation process.

---

## Publishing Failure

If any advertising platform rejects the campaign:

Campaign Status:

Publish Failed

The user can:

- Correct the issue
- Retry publishing

---

## Reporting Failure

If reporting data cannot be retrieved:

The campaign continues running while the system retries data synchronization.

---

# Success Criteria

A campaign is considered successful when:

- AI content is generated successfully
- Required translations are completed
- Creatives are generated
- Marketing Manager approves the campaign
- Campaign is published successfully
- Performance metrics are continuously synchronized
- Campaign completes without critical failures
