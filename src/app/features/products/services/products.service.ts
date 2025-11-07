import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product, CreateProductDto, UpdateProductDto, ProductStatus } from '../models';
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
}
