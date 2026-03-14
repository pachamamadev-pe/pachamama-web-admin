import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { FeatureCollection } from 'geojson';
import { environment } from '@environments/environment';
import { BusinessDashboardOverviewDto } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getOverview(asOfDate?: string): Observable<BusinessDashboardOverviewDto> {
    let params = new HttpParams();
    if (asOfDate) {
      params = params.set('asOfDate', asOfDate);
    }
    return this.http.get<BusinessDashboardOverviewDto>(
      `${environment.apiUrl}/api/v1/admin/kpis/dashboard/overview`,
      { params },
    );
  }

  getCompanyGeoJson(): Observable<FeatureCollection> {
    return this.http.get<FeatureCollection>(
      `${environment.apiUrl}/api/v1/company/areas/current/geojson`,
    );
  }
}
