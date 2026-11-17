const GENERIC_ERROR = 'Something went wrong while answering.';

/** Error shown under the reply (pure). Stream `error` parts carry readable text; HTTP errors carry our JSON body. */
export function describeChatError(error: Error | undefined): string {
  const message = error?.message.trim();
  if (!message) return GENERIC_ERROR;
  if (!message.startsWith('{')) return message;
  try {
    const body = JSON.parse(message) as { error?: { message?: unknown } };
    return typeof body.error?.message === 'string' ? body.error.message : GENERIC_ERROR;
  } catch {
    return GENERIC_ERROR;
  }
}
