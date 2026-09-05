# SafeLedger 2.6.33

SafeLedger 2.6.33 is a workflow/test candidate only. Do not merge this 2.6.x patch to `master`.

## What changed

SafeLedger 2.6.32 implemented the requested wider, padded compact navigation rails and correctly rendered local Activity History icons. Linux and macOS passed the new behavior, but Windows stopped in the new 2.6.32 regression because one assertion compared a multi-line CSS block using LF-only line endings.

The Windows checkout used CRLF line endings, so the literal string did not match even though the CSS contained the correct 15px padding. This was a test-only cross-platform issue.

2.6.33 keeps the exact same application runtime behavior as 2.6.32 and changes only the regression/version metadata:

- The 2.6.32 rail-padding check now uses a whitespace-tolerant regular expression instead of an LF-only multi-line literal.
- The full 2.6.32 behavior gate remains active on later 2.6.x candidates.
- A new 2.6.33 gate protects the cross-platform assertion style.

## Carried-forward UI behavior

- Collapsed Profile, Vault Item, and Asset rails are 104px wide.
- Collapsed columns retain the same 15px outer padding as expanded columns.
- Collapsed navigation rows retain the same 9px horizontal item padding as expanded rows.
- Collapsed wallet artwork is centered with no expanded-mode right margin.
- `SafeLedger opened` uses a locally drawn power icon.
- `SafeLedger unlocked` uses a locally drawn open padlock.
- The login button keeps its separate person-style local artwork.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Validation target

Run the full Windows Portable, Linux AppImage, and native Apple Silicon workflows including regression, Electron crypto smoke, real GUI smoke, and packaging before hands-on approval.
