import { readFileSync } from "node:fs";
import { modelShortName } from "./src/modelShortName.ts";
import {
  countThreadSearchOccurrences,
  findThreadSearchOccurrences,
} from "./src/threadSearch.ts";
import { scoreQueryMatch } from "./src/searchRanking.ts";
import {
  isNetworkPath,
  newProjectFolderName,
  resolvePastedPath,
  workspaceRelativeFilePath,
} from "./src/path.ts";
import { compareSemverVersions } from "./src/semver.ts";
import { quoteGitPatchPath, unquoteGitPatchPath } from "./src/gitPatchPath.ts";
import {
  isLocalLoopbackHost,
  isPrivateNetworkHost,
  isPublicFaviconHost,
  isTailnetHost,
} from "./src/hostClassification.ts";
import { removeAgentCredits } from "./src/mergeMessage.ts";
import { parseCliArgs } from "./src/cliArgs.ts";

const raw = readFileSync(0, "utf8");
const input = raw.trim() ? JSON.parse(raw) : {};
const cmd = process.argv[2] || "";
let out;

switch (cmd) {
  case "model-short-name":
    out = { short: modelShortName(input.name, input.families ?? []) ?? null };
    break;
  case "thread-search":
    out = {
      offsets: findThreadSearchOccurrences(input.text ?? "", input.query ?? ""),
      count: countThreadSearchOccurrences(input.text ?? "", input.query ?? ""),
    };
    break;
  case "rank":
    out = {
      score: scoreQueryMatch({
        value: String(input.value ?? ""),
        query: String(input.query ?? ""),
        exactBase: input.exactBase ?? 100,
        prefixBase: input.prefixBase ?? 80,
        boundaryBase: input.boundaryBase ?? 60,
        includesBase: input.includesBase ?? 40,
        fuzzyBase: input.fuzzyBase ?? 10,
      }),
    };
    break;
  case "path-relative":
    out = {
      relative: workspaceRelativeFilePath(input.path ?? "", input.root ?? ""),
    };
    break;
  case "network-path":
    out = { network: isNetworkPath(input.value ?? "") };
    break;
  case "folder-name":
    out = { name: newProjectFolderName(input.name ?? "") };
    break;
  case "pasted-path":
    out = { path: resolvePastedPath(input.previous ?? "", input.next ?? "") };
    break;
  case "semver-cmp":
    out = { order: compareSemverVersions(input.left ?? "", input.right ?? "") };
    break;
  case "git-patch-path":
    out = {
      quoted: quoteGitPatchPath(input.path ?? ""),
      roundtrip: unquoteGitPatchPath(quoteGitPatchPath(input.path ?? "")),
    };
    break;
  case "host":
    out = {
      loopback: isLocalLoopbackHost(input.host ?? ""),
      tailnet: isTailnetHost(input.host ?? ""),
      private: isPrivateNetworkHost(input.host ?? ""),
      publicFavicon: isPublicFaviconHost(input.host ?? ""),
    };
    break;
  case "merge-message":
    out = { message: removeAgentCredits(input.message ?? "") };
    break;
  case "cli-args":
    out = parseCliArgs(input.args ?? "", { booleanFlags: input.booleanFlags ?? [] });
    break;
  default:
    process.stderr.write(`unknown command ${cmd}\n`);
    process.exit(2);
}

process.stdout.write(JSON.stringify(out));
