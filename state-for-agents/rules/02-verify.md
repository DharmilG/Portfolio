# Rule 02 — Verify before every commit (inviolable)

1. `npx tsc --noEmit` must exit 0.
2. Runtime proof per file kind: lib → node script vs local Supabase
   (`127.0.0.1:54321`); UI → `npm run dev` smoke + browser look;
   migrations → applied by `supabase db reset` with zero errors.
3. Temp artifacts (`.tmp-check/`, `tsconfig.tsbuildinfo`) deleted before commit.
4. Tracker commits additionally pass the TRACKER_GUIDE validation
   (unique ids, counts match, done ⇒ log + verified, tip ancestor of HEAD).

Good: typecheck + live anon/admin query returning 0 rows, nil error.
Bad: committing on "it looks right" / leaving .tmp-check/ tracked.
