// Shared helpers for the AI-log hooks: stdin reading, secret redaction, skill tracking, appending.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const logDir = join(projectDir, 'docs', 'ai-log');
const conversationFile = join(logDir, 'CONVERSATION.md');

export function readStdinJson() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.on('data', (chunk) => (raw += chunk));
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

// Values from .env (length >= 8) plus anything shaped like an OpenAI key never reach the public log.
function envSecrets() {
  const envFile = join(projectDir, '.env');
  if (!existsSync(envFile)) return [];
  return readFileSync(envFile, 'utf8')
    .split('\n')
    .map((line) => line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, ''))
    .filter((value) => value.length >= 8);
}

export function redact(text) {
  let out = text.replace(/sk-[A-Za-z0-9_-]{16,}/g, 'sk-***REDACTED***');
  for (const secret of envSecrets()) out = out.split(secret).join('***REDACTED***');
  return out;
}

// The skill a free-text answer belongs to = the last slash command typed in this session.
const stateFile = (sessionId) => join(tmpdir(), `claude-ai-log-${sessionId ?? 'default'}.txt`);

export function rememberSkill(sessionId, prompt) {
  const slash = prompt.trim().match(/^\/([\w:-]+)/)?.[1];
  if (slash) writeFileSync(stateFile(sessionId), slash);
  return currentSkill(sessionId);
}

export function currentSkill(sessionId) {
  const file = stateFile(sessionId);
  return existsSync(file) ? readFileSync(file, 'utf8').trim() || 'chat' : 'chat';
}

export function appendEntry(skill, who, text) {
  mkdirSync(logDir, { recursive: true });
  const quoted = redact(text.trim())
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  appendFileSync(conversationFile, `\n### ${new Date().toISOString()} : /${skill} — ${who}\n\n${quoted}\n`);
}
