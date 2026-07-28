# Deprecated Advertising OS modules

These modules are **not registered** in `AppModule` for AI Meta Ads Studio.

They remain on disk until Phase 10 (Meta Marketing API publishing) is complete
and no unexpected dependency is found. Do not re-enable without an explicit
product decision.

| Module | Path | Former HTTP surface |
|--------|------|---------------------|
| Campaign Generator | `campaign-generator/` | `/api/campaign-generator` |
| Publisher | `publisher/` | `/api/publisher` |
| Synchronization | `synchronization/` | `/api/synchronization` |
| Automation | `automation/` | `/api/automation` |
| AI Copy | `ai-copy/` | `/api/ai-copy` |
| Reporting | `reporting/` | `/api/reports` |
| Media Processing | `media-processing/` | (never wired) |

TikTok providers under publisher/synchronization are out of product scope forever.
