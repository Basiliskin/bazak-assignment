import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ProductListQuerySchema,
  type ProductCard,
  type ProductDetails,
  type ProductListQuery,
} from '@app/contracts';
import { ZodValidationPipe } from '../../shared/presentation/zod-validation.pipe.js';
import { CatalogService } from '../application/catalog.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly catalog: CatalogService) {}

  /** Shop page grid (US6b): top-rated in-stock Product Cards. */
  @Get()
  list(
    @Query(new ZodValidationPipe(ProductListQuerySchema)) query: ProductListQuery,
  ): Promise<ProductCard[]> {
    return this.catalog.topRated(query.limit);
  }

  /** Details popup (AC4.3). */
  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number): Promise<ProductDetails> {
    return this.catalog.getById(id);
  }
}
