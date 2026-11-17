import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CatalogUnavailableError, ProductNotFoundError } from '../../catalog/domain/catalog.errors.js';
import { toErrorResponse } from './error-response.js';

describe('toErrorResponse', () => {
  it('maps domain errors by code', () => {
    expect(toErrorResponse(new ProductNotFoundError(9))).toEqual({
      status: 404,
      body: { error: { code: 'PRODUCT_NOT_FOUND', message: 'Product 9 not found' } },
    });
    expect(toErrorResponse(new CatalogUnavailableError()).status).toBe(503);
  });

  it('keeps Nest HTTP errors in the same shape', () => {
    expect(toErrorResponse(new BadRequestException('bad id')).body.error.code).toBe('BAD_REQUEST');
    expect(toErrorResponse(new NotFoundException()).status).toBe(404);
  });

  it('hides the message of unexpected errors', () => {
    expect(toErrorResponse(new Error('db password is hunter2'))).toEqual({
      status: 500,
      body: { error: { code: 'INTERNAL', message: 'Something went wrong' } },
    });
  });
});
