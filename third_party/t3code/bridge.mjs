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
const out = await dispatch(cmd, input);

async function dispatch(cmd, input) {
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
  case "collect-stream": {
    const { collectUint8StreamText } = await import("./upstream/collectStreamText.ts");
    const Effect = await import("effect/Effect");
    const Stream = await import("effect/Stream");
    const bytes = Buffer.from(String(input.text ?? ""), "utf8");
    const stream = Stream.make(new Uint8Array(bytes));
    out = await Effect.runPromise(
      collectUint8StreamText({ stream, maxBytes: Number(input.maxBytes ?? 4096) }),
    );
    break;
  }
  case "signal-group": {
    const { signalProcessGroup } = await import("./upstream/processGroup.ts");
    try {
      signalProcessGroup(Number(input.pid), input.signal ?? "SIGTERM");
      out = { signaled: true };
    } catch (err) {
      out = { signaled: false, code: err.code ?? null, message: String(err.message ?? err) };
    }
    break;
  }
  case "collect-cli": {
    const { collectUint8StreamText } = await import("./upstream/collectStreamText.ts");
    const Effect = await import("effect/Effect");
    const Stream = await import("effect/Stream");
    const { spawn } = await import("node:child_process");
    const argv = Array.isArray(input.argv) ? input.argv.map(String) : [];
    if (argv.length === 0) {
      out = { error: "argv required" };
      break;
    }
    const child = spawn(argv[0], argv.slice(1), { stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    const stdout = await new Promise((resolve, reject) => {
      child.stdout.on("data", (chunk) => chunks.push(chunk));
      child.on("error", reject);
      child.on("close", () => resolve(Buffer.concat(chunks)));
    });
    const stream = Stream.make(new Uint8Array(stdout));
    const collected = await Effect.runPromise(
      collectUint8StreamText({ stream, maxBytes: Number(input.maxBytes ?? 8192) }),
    );
    out = { ...collected, code: child.exitCode };
    break;
  }
  default:
    process.stderr.write(`unknown command ${cmd}\n`);
    process.exit(2);
}
return out;
}

process.stdout.write(JSON.stringify(out));
