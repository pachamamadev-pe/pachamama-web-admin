/**
 * Barrel export para modelos de productos
 * Permite imports limpios:
 *
 * import { Product, CreateProductDto, ProductStatus } from '@features/products/models';
 */

// Modelos principales
export * from './product.model';
export * from './create-product.dto';
export * from './update-product.dto';
export * from './product-html-update.dto';
export * from './domain-attribute.model';
export * from './product-protocol.model';
export * from './create-product-protocol.dto';
export * from './update-product-protocol.dto';
export * from './reorder-product-protocols.dto';
export * from './form-field.model';
export * from './form-schema-response.model';
export * from './form-schema.model';
