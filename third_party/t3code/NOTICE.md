# Third-party notice — T3 Code

Selected modules below are copied from T3 Code and executed by this product
(not an attribution-only notice).

- Upstream: https://github.com/pingdotgg/t3code
- Tag: v0.1.8
- Commit: bf469bb19669671d0df2efda74ed73867a7137c0
- SPDX: MIT
- Copyright (c) 2026 T3 Tools Inc.
- License text: ./LICENSE

Files (unchanged source, relative to this directory):

| File | Upstream path |
|---|---|
| src/modelShortName.ts | packages/provider-core/src/modelShortName.ts |
| src/threadSearch.ts | packages/shared/src/threadSearch.ts |
| src/searchRanking.ts | packages/shared/src/searchRanking.ts |
| src/path.ts | packages/shared/src/path.ts |
| src/semver.ts | packages/shared/src/semver.ts |
| src/gitPatchPath.ts | packages/shared/src/gitPatchPath.ts |
| src/hostClassification.ts | packages/shared/src/hostClassification.ts |
| src/cliArgs.ts | packages/shared/src/cliArgs.ts |
| src/mergeMessage.ts | packages/source-control-core/src/server/mergeMessage.ts |
| upstream/processGroup.ts | packages/provider-core/src/server/processGroup.ts |
| upstream/collectStreamText.ts | packages/provider-core/src/server/collectStreamText.ts |

`bridge.mjs` executes those files. `collectStreamText.ts` is run with the
`effect` package installed beside this directory (the same major version the
v0.1.8 lockfile uses). That is the provider stream collector and the process
group guard. It is not the OpenCode, Codex, or other provider application.

The rest of T3 Code (Effect provider drivers, Electron/iOS/Android shells,
Tailscale/SSH serving, 1Password, ACP registry, voice, load balancing) is
not vendored and is not claimed as parity. See `ymzz-vibe capabilities`.
