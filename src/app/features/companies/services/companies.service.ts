import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Company, CreateCompanyDto, UpdateCompanyDto } from '../models/company.model';

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/companies';

  /**
   * Obtener todas las empresas.
   */
  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(this.apiUrl);
  }

  /**
   * Obtener una empresa por ID.
   */
  getCompany(id: string): Observable<Company> {
    return this.http.get<Company>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nueva empresa.
   */
  createCompany(dto: CreateCompanyDto): Observable<Company> {
    const company: Partial<Company> = {
      ...dto,
      status: 'active',
      adminUserId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.http.post<Company>(this.apiUrl, company);
  }

  /**
   * Actualizar empresa existente.
   */
  updateCompany(id: string, dto: UpdateCompanyDto): Observable<Company> {
    const update = {
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    return this.http.patch<Company>(`${this.apiUrl}/${id}`, update);
  }

  /**
   * Eliminar empresa.
   */
  deleteCompany(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Asignar administrador a empresa.
   */
  assignAdmin(companyId: string, userId: string): Observable<Company> {
    return this.http.patch<Company>(`${this.apiUrl}/${companyId}`, {
      adminUserId: userId,
      updatedAt: new Date().toISOString(),
    });
  }
}
