import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { DomainAttribute } from '../models/domain-attribute.model';

/**
 * Service for managing domain attributes
 */
@Injectable({ providedIn: 'root' })
export class DomainAttributesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/domain-attributes`;

  /**
   * Get all domain attributes
   */
  getAllDomainAttributes(): Observable<DomainAttribute[]> {
    return this.http.get<DomainAttribute[]>(this.apiUrl);
  }

  /**
   * Get domain attribute by ID
   */
  getDomainAttributeById(id: string): Observable<DomainAttribute> {
    return this.http.get<DomainAttribute>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get domain attributes by category
   */
  getDomainAttributesByCategory(category: string): Observable<DomainAttribute[]> {
    return this.http.get<DomainAttribute[]>(`${this.apiUrl}`, {
      params: { category },
    });
  }
}
