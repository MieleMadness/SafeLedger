# SafeLedger 2.6.121 — Integrated test candidate

Development candidate for hands-on testing; not a published stable release.

This candidate includes the complete 2.6.120 documentation branch (PR #161),
including the updated User Guide and Windows bundled README.pdf, plus the latest
search/accessibility and detail-view lifecycle fixes from PR #162.

- Reject obsolete search responses immediately when the query changes; cancel
  queued work on close; retain modal keyboard focus and restore it on dismissal.
- Add a Close control, explicit search labels, and result/status announcements.
- Prevent delayed Activity History, Vault Overview, and Recovery Binder results
  or errors from replacing a newer screen, including the login screen after lock.
- Expose Activity category selection to assistive technology.
- Run both isolated Chromium regression fixtures through the existing GUI smoke
  check, alongside real application startup and theme/layout verification.
- Include the pinned project-local interface skills, licenses, and review notes.

Encryption, authentication, vault formats, and portable storage behavior remain
unchanged by this update. Windows packaging produces a portable EXE and PDF guide.
Use disposable data when testing backup/restore and interrupted operations.

The Windows workflow must run on the exact 2.6.121 candidate commit; its generated
verification files record the source revision. Passing local tests alone is not
confirmation that hosted packaging finished.
