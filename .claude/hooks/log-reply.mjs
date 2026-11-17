#!/usr/bin/env node
// Stop hook: appends Claude's final reply text for the turn to docs/ai-log/CONVERSATION.md.
// Only text blocks after the last real user prompt are kept — tool calls and tool output are skipped on purpose.
import { existsSync, readFileSync } from 'node:fs';
import { appendEntry, currentSkill, readStdinJson } from './lib/ai-log.mjs';

const isRealUserPrompt = (entry) =>
  entry.type === 'user' &&
  !entry.isMeta &&
  (typeof entry.message?.content === 'string' ||
    (Array.isArray(entry.message?.content) && !entry.message.content.some((b) => b.type === 'tool_result')));

function lastReply(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return '';
  const entries = readFileSync(transcriptPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  let start = 0;
  entries.forEach((entry, i) => isRealUserPrompt(entry) && (start = i + 1));
  return entries
    .slice(start)
    .filter((e) => e.type === 'assistant' && Array.isArray(e.message?.content))
    .flatMap((e) => e.message.content.filter((b) => b.type === 'text').map((b) => b.text))
    .join('\n\n');
}

const input = await readStdinJson();
// The transcript can lag the Stop event slightly; one short retry covers it.
let reply = input.last_assistant_message ?? lastReply(input.transcript_path);
if (!reply) {
  await new Promise((r) => setTimeout(r, 500));
  reply = lastReply(input.transcript_path);
}
if (reply.trim()) appendEntry(currentSkill(input.session_id), 'assistant', reply);
