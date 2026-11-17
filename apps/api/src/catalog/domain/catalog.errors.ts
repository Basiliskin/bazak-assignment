import { DomainError } from '../../shared/domain/domain-error.js';

export class CatalogUnavailableError extends DomainError {
  readonly code = 'CATALOG_UNAVAILABLE';
  constructor() {
    super('The product catalog is unavailable right now');
  }
}

export class ProductNotFoundError extends DomainError {
  readonly code = 'PRODUCT_NOT_FOUND';
  constructor(id: number) {
    super(`Product ${id} not found`);
  }
}
