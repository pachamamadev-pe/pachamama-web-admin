import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductStatus,
  ProductHtmlUpdateDto,
} from '../models';
import { SimplePaginatedResponse, PageRequest } from '@shared/models/pagination.model';
import { environment } from '@environments/environment';
/**
 * Servicio para gestionar productos
 * Consume la API: /api/v1/admin/products
 */
@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1/admin/products`;

  /**
   * Obtiene una lista paginada de productos
   *
   * @param request - Parámetros de paginación y búsqueda
   * @returns Observable con la respuesta paginada de productos
   *
   * @example
   * ```typescript
   * this.productsService.getProducts({ page: 0, size: 20, q: 'café' }).subscribe(
   *   response => {
   *     console.log('Productos:', response.items);
   *     console.log('Total:', response.total);
   *   }
   * );
   * ```
   */
  getProducts(request: PageRequest = {}): Observable<SimplePaginatedResponse<Product>> {
    const { page = 0, size = 20, q } = request;

    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (q) {
      params = params.set('q', q);
    }

    return this.http.get<SimplePaginatedResponse<Product>>(this.apiUrl, { params });
  }

  /**
   * Obtiene un producto por su ID
   *
   * @param id - UUID del producto
   * @returns Observable con el producto
   *
   * @example
   * ```typescript
   * this.productsService.getProductById('a1b2c3d4-...').subscribe(
   *   product => console.log('Producto:', product)
   * );
   * ```
   */
  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo producto
   *
   * @param dto - Datos del producto a crear
   * @returns Observable con el producto creado
   *
   * @example
   * ```typescript
   * const dto: CreateProductDto = {
   *   name: 'Café orgánico',
   *   description: 'Granos seleccionados de altura'
   * };
   *
   * this.productsService.createProduct(dto).subscribe(
   *   product => console.log('Producto creado:', product)
   * );
   * ```
   */
  createProduct(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, dto);
  }

  /**
   * Actualiza un producto existente (parcial)
   *
   * @param id - UUID del producto
   * @param dto - Datos a actualizar (todos opcionales)
   * @returns Observable con el producto actualizado
   *
   * @example
   * ```typescript
   * this.productsService.updateProduct('a1b2c3d4-...', {
   *   name: 'Café orgánico Premium',
   *   status: ProductStatus.ACTIVE
   * }).subscribe(
   *   product => console.log('Producto actualizado:', product)
   * );
   * ```
   */
  updateProduct(id: string, dto: UpdateProductDto): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Elimina un producto
   *
   * @param id - UUID del producto
   * @returns Observable que completa cuando se elimina
   *
   * @example
   * ```typescript
   * this.productsService.deleteProduct('a1b2c3d4-...').subscribe(
   *   () => console.log('Producto eliminado exitosamente')
   * );
   * ```
   */
  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Cambia el estado de un producto (ACTIVE <-> INACTIVE)
   *
   * @param product - Producto a actualizar
   * @returns Observable con el producto actualizado
   *
   * @example
   * ```typescript
   * this.productsService.toggleProductStatus(product).subscribe(
   *   updated => console.log('Nuevo estado:', updated.status)
   * );
   * ```
   */
  toggleProductStatus(product: Product): Observable<Product> {
    const newStatus =
      product.status === ProductStatus.ACTIVE ? ProductStatus.INACTIVE : ProductStatus.ACTIVE;

    return this.updateProduct(product.id, { status: newStatus });
  }

  /**
   * Activa un producto (status = ACTIVE)
   *
   * @param id - UUID del producto
   * @returns Observable con el producto actualizado
   */
  activateProduct(id: string): Observable<Product> {
    return this.updateProduct(id, { status: ProductStatus.ACTIVE });
  }

  /**
   * Desactiva un producto (status = INACTIVE)
   *
   * @param id - UUID del producto
   * @returns Observable con el producto actualizado
   */
  deactivateProduct(id: string): Observable<Product> {
    return this.updateProduct(id, { status: ProductStatus.INACTIVE });
  }

  /**
   * Actualiza la descripción HTML de un producto
   * Solo disponible para ADMIN_PACHAMAMA
   *
   * @param id - UUID del producto
   * @param dto - DTO con la descripción HTML (se sanitizará en el backend)
   * @returns Observable con el producto actualizado
   *
   * @example
   * ```typescript
   * const htmlContent = '<h1>Conceptos</h1><p>...</p>';
   * this.productsService.updateHtmlDescription('a1b2c3d4-...', {
   *   descriptionHtml: htmlContent
   * }).subscribe(
   *   product => console.log('HTML actualizado:', product.descriptionHtml)
   * );
   * ```
   */
  updateHtmlDescription(id: string, dto: ProductHtmlUpdateDto): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}/html-description`, dto);
  }

  /**
   * Obtiene las etapas (ProjectStage) que tienen formularios publicados
   * para un producto específico y la compañía del usuario autenticado
   *
   * @param productId - UUID del producto
   * @returns Observable con array de etapas que tienen formularios
   *
   * @example
   * ```typescript
   * this.productsService.getPublishedFormStages('a1b2c3d4-...').subscribe(
   *   stages => console.log('Etapas con formularios:', stages)
   *   // Output: ['INVENTORY', 'COLLECTION', 'PRIMARY_TRANSFORMATION']
   * );
   * ```
   */
  getPublishedFormStages(productId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${productId}/forms/stages`);
  }

  /**
   * Obtiene todos los formularios de un producto (cualquier estado: publicados o no)
   * para la compañía del usuario autenticado
   *
   * @param productId - UUID del producto
   * @returns Observable con array de formularios completos
   *
   * @example
   * ```typescript
   * this.productsService.getProductForms('a1b2c3d4-...').subscribe(
   *   forms => console.log('Formularios:', forms)
   *   // Output: [{ id, name, version, isPublished, applicableStages, schema, ... }]
   * );
   * ```
   */
  getProductForms(productId: string): Observable<import('../models').FormSchemaResponse[]> {
    return this.http.get<import('../models').FormSchemaResponse[]>(
      `${this.apiUrl}/${productId}/forms`,
    );
  }

  /**
   * Obtiene un formulario específico por ID
   *
   * @param productId - UUID del producto
   * @param formId - UUID del formulario
   * @returns Observable con el formulario completo
   *
   * @example
   * ```typescript
   * this.productsService.getProductFormById('product-id', 'form-id').subscribe(
   *   form => console.log('Formulario:', form)
   *   // Output: { id, name, schema, version, isPublished, ... }
   * );
   * ```
   */
  getProductFormById(
    productId: string,
    formId: string,
  ): Observable<import('../models').FormSchemaResponse> {
    return this.http.get<import('../models').FormSchemaResponse>(
      `${this.apiUrl}/${productId}/forms/${formId}`,
    );
  }

  /**
   * Obtiene los tipos de campo disponibles para formularios dinámicos
   *
   * @param productId - UUID del producto
   * @returns Observable con array de tipos de campo
   *
   * @example
   * ```typescript
   * this.productsService.getFieldTypes('a1b2c3d4-...').subscribe(
   *   types => console.log('Tipos de campo:', types)
   *   // Output: [{ code: 'SHORT_TEXT', name: 'Texto corto', ... }, ...]
   * );
   * ```
   */
  getFieldTypes(productId: string): Observable<import('../models').FieldType[]> {
    return this.http.get<import('../models').FieldType[]>(
      `${this.apiUrl}/${productId}/forms/field-types`,
    );
  }

  /**
   * Crea un formulario dinámico para una etapa específica del producto
   *
   * @param productId - UUID del producto
   * @param formData - Datos del formulario (name, description, applicableStages, schema)
   * @returns Observable con la respuesta del servidor
   *
   * @example
   * ```typescript
   * const formData = {
   *   name: 'Formulario de Inventario para Caoba',
   *   description: 'Formulario de recolección de datos',
   *   applicableStages: ['INVENTORY'],
   *   schema: '{...}'
   * };
   * this.productsService.createProductForm('a1b2c3d4-...', formData).subscribe(
   *   response => console.log('Formulario creado:', response)
   * );
   * ```
   */
  createProductForm(productId: string, formData: CreateProductFormRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${productId}/forms`, formData);
  }

  /**
   * Actualiza un formulario existente de un producto
   *
   * PUT /api/v1/admin/products/{productId}/forms/{formId}
   *
   * @param productId - ID del producto
   * @param formId - ID del formulario a actualizar
   * @param formData - Datos actualizados del formulario
   * @returns Observable con la respuesta de actualización
   *
   * @example
   * ```typescript
   * const formData = {
   *   name: 'Formulario de Inventario Actualizado',
   *   description: 'Descripción actualizada',
   *   applicableStages: ['INVENTORY', 'COLLECTION'],
   *   schema: '{...}'
   * };
   * this.productsService.updateProductForm('product-id', 'form-id', formData).subscribe(
   *   response => console.log('Formulario actualizado:', response)
   * );
   * ```
   */
  updateProductForm(
    productId: string,
    formId: string,
    formData: CreateProductFormRequest,
  ): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${productId}/forms/${formId}`, formData);
  }
}

/**
 * Request para crear formulario de producto
 */
export interface CreateProductFormRequest {
  name: string;
  description: string;
  applicableStages: string[];
  schema: string; // JSON stringificado
}
