import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ProductProtocol, CreateProductProtocolDto, UpdateProductProtocolDto } from '../models';
import { ReorderProductProtocolsDto } from '../models/reorder-product-protocols.dto';

/**
 * Service for managing product protocols
 */
@Injectable({ providedIn: 'root' })
export class ProductProtocolsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/products`;

  /**
   * Get all protocols for a product
   */
  getProductProtocols(productId: string): Observable<ProductProtocol[]> {
    return this.http.get<ProductProtocol[]>(`${this.apiUrl}/${productId}/protocols`);
  }

  /**
   * Create a new protocol for a product
   */
  createProductProtocol(
    productId: string,
    dto: CreateProductProtocolDto,
  ): Observable<ProductProtocol> {
    return this.http.post<ProductProtocol>(`${this.apiUrl}/${productId}/protocols`, dto);
  }

  /**
   * Update an existing protocol
   */
  updateProductProtocol(
    productId: string,
    protocolId: string,
    dto: UpdateProductProtocolDto,
  ): Observable<ProductProtocol> {
    return this.http.put<ProductProtocol>(
      `${this.apiUrl}/${productId}/protocols/${protocolId}`,
      dto,
    );
  }

  /**
   * Delete a protocol
   */
  deleteProductProtocol(productId: string, protocolId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${productId}/protocols/${protocolId}`);
  }

  /**
   * Reorder protocols
   */
  reorderProductProtocols(
    productId: string,
    dto: ReorderProductProtocolsDto,
  ): Observable<ProductProtocol[]> {
    return this.http.put<ProductProtocol[]>(`${this.apiUrl}/${productId}/protocols/reorder`, dto);
  }
}
