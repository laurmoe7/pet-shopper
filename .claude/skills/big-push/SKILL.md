---
name: big-push
description: Push the session branch live to main. Use only when Lauren says "big push".
---

# Big push

Only on her words "big push". Pushes to `main` with no PR; the Pages workflow tests and deploys.

1. `npm run bigpush` (merges `main`, runs `npm test`, pushes only if green, prints whether `desktop/` changed and the builds in the push). On a merge conflict or failing tests, stop and report; never force.
2. Find the Mini Fumu version: the `desktop.yml` run number = latest release tag (`get_latest_release`, or `actions_list` for "Build the desktop app (Windows)") once the run finishes; the push before it is one less. If the run is still going, say the version is expected, not final.

## Reply format (simple words, one go-through checklist)
- **Version:** Mini Fumu (Windows app) `0.1.NN`, and either "changes `desktop/`: needs the new installer" or "page only: a restart is enough".
- **Everything that went live since the previous push**, not just the last build: group by build number, one plain line each, from `CHANGELOG.md` and the push range.
- New animations by name (only if there are any).
- Anything untested or risky, honestly.
