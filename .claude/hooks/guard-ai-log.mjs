#!/usr/bin/env node
// PreToolUse(Bash) hook: blocks git commands that discard working-tree changes while docs/ai-log/CONVERSATION.md
// has uncommitted entries — those entries exist nowhere else. Allowed when the same command stashes the log first.
import { execFileSync } from 'node:child_process';
import { projectDir, readStdinJson } from './lib/ai-log.mjs';

const LOG = 'docs/ai-log/CONVERSATION.md';
const DISCARDS = [
  /\bgit\s+(switch|checkout)\b[^;&|]*(--discard-changes|--force|\s-f\b)/,
  /\bgit\s+checkout\s+(--\s+)?\.(\s|$)/,
  /\bgit\s+reset\b[^;&|]*--hard/,
  /\bgit\s+restore\b[^;&|]*(\s\.(\s|$)|CONVERSATION\.md|:\/)/,
];
const STASHES_LOG = /\bgit\s+stash\s+push\b[^;&|]*CONVERSATION\.md/;

const input = await readStdinJson();
const command = input.tool_input?.command ?? '';
if (!DISCARDS.some((re) => re.test(command)) || STASHES_LOG.test(command)) process.exit(0);

let dirty = '';
try {
  dirty = execFileSync('git', ['status', '--porcelain', '--', LOG], { cwd: projectDir, encoding: 'utf8' }).trim();
} catch {
  process.exit(0); // not a git repo / git missing: nothing to protect
}
if (!dirty) process.exit(0);

process.stderr.write(
  `Blocked: this command discards working-tree changes, and ${LOG} has uncommitted log entries that exist nowhere else.\n` +
    `Wrap it: git stash push -- ${LOG} && <your command> && git stash pop\n`,
);
process.exit(2);
