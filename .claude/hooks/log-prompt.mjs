#!/usr/bin/env node
// UserPromptSubmit hook: appends every user prompt (timestamp + active skill) to docs/ai-log/CONVERSATION.md.
import { appendEntry, readStdinJson, rememberSkill } from './lib/ai-log.mjs';

const { prompt = '', session_id: sessionId } = await readStdinJson();
if (prompt.trim()) appendEntry(rememberSkill(sessionId, prompt), 'user', prompt);
