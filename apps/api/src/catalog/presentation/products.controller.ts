import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import type { ProductDetails } from '@app/contracts';
import { CatalogService } from '../application/catalog.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly catalog: CatalogService) {}

  /** Details popup (AC4.3). */
  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number): Promise<ProductDetails> {
    return this.catalog.getById(id);
  }
}
