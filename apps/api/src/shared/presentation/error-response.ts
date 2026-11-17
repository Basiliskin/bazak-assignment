import { DomainError } from '../domain/domain-error.js';

export interface ErrorBody {
  error: { code: string; message: string };
}

/** Domain error code → HTTP status (unlisted codes → 500). */
const STATUS_BY_CODE: Record<string, number> = {
  PRODUCT_NOT_FOUND: 404,
  CONVERSATION_NOT_FOUND: 404,
  CATALOG_UNAVAILABLE: 503,
};

/** Minimal view of Nest's HttpException, so this module stays framework-free and pure. */
export interface HttpLikeError {
  getStatus(): number;
  message: string;
}

const isHttpLike = (e: unknown): e is HttpLikeError =>
  typeof e === 'object' && e !== null && typeof (e as HttpLikeError).getStatus === 'function';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
};

/** Pure: any thrown value → { status, body }. Unknown errors never leak their message. */
export function toErrorResponse(e: unknown): { status: number; body: ErrorBody } {
  if (e instanceof DomainError) {
    return { status: STATUS_BY_CODE[e.code] ?? 500, body: { error: { code: e.code, message: e.message } } };
  }
  if (isHttpLike(e)) {
    const status = e.getStatus();
    return {
      status,
      body: { error: { code: CODE_BY_STATUS[status] ?? `HTTP_${status}`, message: e.message } },
    };
  }
  return { status: 500, body: { error: { code: 'INTERNAL', message: 'Something went wrong' } } };
}
