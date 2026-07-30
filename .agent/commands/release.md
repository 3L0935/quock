# Release flow

**Core principle: a released version is a git TAG, not a branch.** Tags never need syncing — that is what keeps this flow linear: no branch is kept "in sync" with another, and there is no double-merge.

App Store / Play review is slow and asynchronous (days to weeks, sometimes months). This flow lets development never stop while a submitted version sits in review.

## Branches

| Branch | What it is | Work here? |
| --- | --- | --- |
| `develop` | The trunk. ALL ongoing work and ALL external PRs land here (via `feat/*` / `fix/*`). Never frozen. | Yes, via short branches |
| `release/X.Y.Z` | A release line, cut from `develop` to ship one version. It absorbs the review (even months) while `develop` keeps moving. | Only fixes for that release |
| `main` | A marker of what is currently live on the stores. Advanced to the release commit only on approval. | Never — it is only a pointer |
| tag `vX.Y.Z` | The released version. Immutable. | — |

Everything flows one direction: **`feat/*` → `develop` → `release/X.Y.Z` → tag `vX.Y.Z`** (and `main` advances to it).

## Everyday work

One feature/fix → one short branch (`feat/*`, `fix/*`) → PR → `develop`. That is the only place ongoing work goes. `develop` is never frozen, regardless of what is in review. Keep `develop` releasable: large/unfinished features live on their own long branch (e.g. `feat/0.2`) until they are ready to merge.

## Version numbers

SemVer (`MAJOR.MINOR.PATCH`). Pre-1.0: MINOR = feature, PATCH = fix.

The **version bump is the first step of a release**, done on `develop`. Between releases `develop` keeps the last released version as a placeholder — it is not meaningful until you decide to cut the next release. You decide when `develop` becomes the next version; nothing bumps automatically or on a schedule.

`app.json` `expo.version` and `package.json` `version` are bumped together. `ios.buildNumber` / `android.versionCode` are managed remotely by EAS (`appVersionSource: remote`, `production.autoIncrement`) — do NOT bump them by hand.

## Cutting a release (`X.Y.Z`)

1. On `develop`: bump `expo.version` + `package.json` version to `X.Y.Z` (PR `chore(release): X.Y.Z`).
2. Cut `release/X.Y.Z` from `develop`.
3. `eas build --platform ios --profile production` (and `android`) → `eas submit`. One build ships to both App Store and Google Play.
4. `develop` keeps moving the whole time — new features and other work continue.

## During review

- Review fixes land on `release/X.Y.Z`, then rebuild (EAS assigns a new build number, same marketing version) and resubmit.
- **Every fix on a release branch is cherry-picked back to `develop`** so it is never lost:
  ```
  git checkout develop && git cherry-pick <fix-sha>
  ```
  Cherry-pick, not merge: it copies only the fix, not the frozen release state or an old version number. `develop` being ahead is irrelevant — that is exactly why the release branch is separate.
- Google Play runs its own review, usually faster and independent of Apple. A version is "released" once the SLOWER store has it.

## When approved (the only time `main` moves)

1. Merge `release/X.Y.Z` → `main`; `.github/workflows/release.yml` auto-creates the `vX.Y.Z` tag and a GitHub Release on that merge.
2. Delete `release/X.Y.Z` — the tag preserves it.

No sync-back to `develop` is needed: every fix already went there via cherry-pick, and the version bump originated there.

## A patch to a live version while `develop` is on a bigger one

Scenario: `develop` is heading to `0.2.0` (or a big feature lives on `feat/0.2`) and you need to ship `0.1.2` to the live `0.1.x` line.

- Cut `release/0.1.2` from **`main`** (the live line — NOT from `develop`, so you do not drag in unreleased work), bump to `0.1.2`, fix, build, submit.
- Cherry-pick the fix to `develop` so the next big version also carries it.

This is how you ship `0.1.x` patches while building `0.2`: the big version lives on `develop` / `feat/0.2`; patches are release branches cut from the live line.

## The cases, at a glance

| Situation | What you do |
| --- | --- |
| Ongoing work / external contributor | PR → `develop`. Always. One answer. |
| Review takes 3 months | `develop` never freezes — only `release/X.Y.Z` is frozen. Keep merging to `develop`. |
| Store asks for a change on a release | Fix on `release/X.Y.Z` → rebuild → resubmit → cherry-pick the fix to `develop`. |
| Big feature (0.2) while patching 0.1.x | `feat/0.2` off `develop`; patches are `release/0.1.x` cut from the live line (`main`). |
| When does the version bump happen | First step of a release, on `develop`. You decide when. |

## NEVER

- Merge to `main` before the store has approved the build. `main` = what is live.
- Bump the marketing version automatically or on a schedule — it is a deliberate release decision.
- Merge a whole `release/*` branch into `develop` to carry a fix — cherry-pick the fix commit instead (avoids dragging the old version/state).
- Bump `buildNumber` / `versionCode` by hand — EAS owns them.
- Freeze `develop`. If a version is stuck in review, `develop` still moves.
- Commit directly on `main` or `develop` — always a short branch + PR.
