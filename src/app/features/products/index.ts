/**
 * Barrel export para el módulo de productos
 * Permite imports limpios desde otros módulos:
 *
 * import { Product, ProductsService, CreateProductDto } from '@features/products';
 */

// Servicios
export * from './services/products.service';
export * from './services/domain-attributes.service';
export * from './services/product-protocols.service';

// Modelos
export * from './models';
