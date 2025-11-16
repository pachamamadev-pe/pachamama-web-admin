import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RucValidationResponse {
  estado: boolean;
  mensaje: string;
  resultado?: {
    condicion: string;
    tipo: string;
    estado: string;
    direccion: string;
    oficio: string | null;
    padrones: string[];
    departamento: string | null;
    provincia: string | null;
    distrito: string | null;
    id: string;
    razon_social: string;
    nombre_comercial: string;
    fecha_inscripcion: string;
    sistema_emision: string;
    actividad_exterior: string;
    sistema_contabilidad: string;
    fecha_emision_electronica: string;
    fecha_ple: string;
    actividades_economicas: string[];
    comprobante_pago: string[];
    sistema_emision_electronica: string[];
    representantes_legales: string[] | null;
  };
}

@Injectable({ providedIn: 'root' })
export class RucValidationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/integrations/ruc`;

  validateRuc(ruc: string): Observable<RucValidationResponse> {
    return this.http.get<RucValidationResponse>(this.apiUrl, {
      params: { document: ruc },
    });
  }
}
