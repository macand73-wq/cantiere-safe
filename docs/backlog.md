# Backlog

Open product work after the rebuild. The former app-defect list is obsolete:
the rewrite replaced that code. These items came from the project owner's status
report and a CSE reviewer's improvement notes; they still need prioritisation
with the owner.

Legend: U = user request, ranked by value in the original review.

## Open

### U2. Progressive inspection numbering
A per-account sequence (e.g. 2026/001) printed on the report, so reports can be
referenced in correspondence.

### U3. Companies present during the inspection
Record the firms working on site, not only the client company.

### U4. Compliance levels
The checklist answers are SI/NO/NA. The reviewer asked for graded conformity
(for example compliant, compliant with observations, non-compliant) so the
report reflects severity.

### U5. On-site prescriptions and signature
Record prescriptions issued during the inspection and capture a signature on
the device. The legal value of a grafometric signature is an open question for
the owner, not a technical decision.

### U6. Coordination between companies
A section for multi-company sites (coordination measures, interference). Scope
depends on whether the product targets RSPP only or also CSE.

### U7. Deeper and customizable checklists
Templates are currently data in the frontend. Editing/adding templates per
account is the second half of this request and was deliberately left out of the
rebuild.

### U8. Structured records, privacy and consent
GDPR obligations are product requirements, not features: privacy notice, legal
basis, data controller, retention and deletion. Inspections can contain
personal data and photos of people.

### Offline-first (phase 2)
IndexedDB write queue and sync with conflict handling. The form already
recovers drafts and pending photos locally, but there is no offline write queue
or server sync yet.

## Blocked / waiting

- **Production deployment.** Needs the owner's decision on who administers the
  Hetzner server over time.
- **Google OAuth.** Code path exists; no Google client credentials configured,
  so sign-in is unverified.
- **SMTP.** Required for password reset and email verification emails.
- **Licensing.** No license chosen yet.
