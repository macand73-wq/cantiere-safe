# Storia delle credenziali nel repository

Commits `f429f67` through HEAD (25 of 30) carry a Supabase project URL and anon key,
in `app.js` up to `420267f` and in `old/app.js` after that. **That key was rotated
months ago and is inert**, so this is a historical artifact, not an exposure.

`old/` was deleted from the tree rather than scrubbed from history: rewriting 25 of 30
commits to remove a dead string would break every existing clone for no security gain,
and `origin` (`macand73-wq/cantiere-safe`) is not ours to force-push. Do not "clean up"
this history without a reason better than tidiness, and never without the repo owner's
agreement.

The anon key is public by design in any case, it ships to every browser. Its safety
rests entirely on row-level security, not on the key staying secret. The owner reports
RLS is active on all tables (2026-09-17); there are no migrations in this repo, so
that is worth confirming in the dashboard rather than assuming.

Because history was left intact, the old implementation is still fully retrievable:

```
git show 88e7cd4:old/app.js > old-app.js   # inspect
git checkout 88e7cd4 -- old/               # restore
git log --follow -- old/app.js             # full lineage, back to v1.1 at 7411a9c
```

`--follow` traces it through the rename, so every version from `7411a9c` (v1.1)
onwards is reachable. Deleting it forward-only rather than rewriting history was the
point: the owner keeps the historical copy.
