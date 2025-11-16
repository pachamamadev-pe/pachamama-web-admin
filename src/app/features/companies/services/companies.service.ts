import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Company } from '../models/company.model';
import { CreateCompanyDto } from '../models/create-company.dto';
import { UpdateCompanyDto } from '../models/update-company.dto';

/**
 * Parámetros de paginación para listar empresas.
 */
export interface CompanyListParams {
  page?: number; // Número de página (0-indexed)
  size?: number; // Tamaño de página (default: 10)
  search?: string; // Búsqueda por code, businessName, ruc
  status?: string; // Filtro por estado (ACTIVE, INACTIVE, etc.)
  licenseType?: string; // Filtro por tipo de licencia
}

/**
 * Respuesta paginada del backend.
 */
export interface PaginatedCompanies {
  items: Company[]; // Array de empresas
  total: number; // Total de elementos
  page: number; // Página actual (0-indexed)
  size: number; // Tamaño de página
}

/**
 * Servicio para gestionar empresas (CRUD + documentos).
 * Implementa el flujo de 2 pasos:
 * 1. Crear empresa con datos básicos (status: PENDING_DOCUMENTS)
 * 2. Subir documentos obligatorios (auto-cambia a ACTIVE cuando completo)
 */
@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/admin/companies`;

  /**
   * Obtener lista paginada de empresas.
   * Soporta búsqueda y filtros.
   */
  getCompanies(params: CompanyListParams = {}): Observable<PaginatedCompanies> {
    let httpParams = new HttpParams()
      .set('page', (params.page ?? 0).toString())
      .set('size', (params.size ?? 10).toString());

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.licenseType) {
      httpParams = httpParams.set('licenseType', params.licenseType);
    }

    return this.http.get<PaginatedCompanies>(this.baseUrl, { params: httpParams });
  }

  /**
   * Obtener detalle de una empresa por ID.
   */
  getCompany(id: string): Observable<Company> {
    return this.http.get<Company>(`${this.baseUrl}/${id}`);
  }

  /**
   * Crear nueva empresa.
   * Estado inicial: PENDING_DOCUMENTS.
   * Retorna la empresa creada (incluye ID generado).
   */
  createCompany(dto: CreateCompanyDto): Observable<Company> {
    return this.http.post<Company>(this.baseUrl, dto);
  }

  /**
   * Actualizar empresa existente.
   * Permite cambiar cualquier campo, incluido el status.
   */
  updateCompany(id: string, dto: UpdateCompanyDto): Observable<Company> {
    return this.http.patch<Company>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Eliminar empresa (soft delete).
   * El backend puede cambiar status a INACTIVE en lugar de borrar físicamente.
   */
  deleteCompany(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
