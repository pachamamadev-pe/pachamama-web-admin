import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  order: number;
  visible: boolean;
  requiresPermission: string | null;
  metadata: Record<string, unknown> | null;
  children: MenuItem[];
  badge?: string; // Propiedad opcional para evitar errores
}

interface SidebarResponse {
  companyName: string;
  menuItems: MenuItem[];
}

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private http = inject(HttpClient);
  private readonly uploadApiUrl = `${environment.apiUrl}/api/v1/users/authenticated`;
  private readonly localStorageKey = 'sidebarData';

  // Signals
  menuItems = signal<MenuItem[]>([]);
  companyName = signal<string>('');

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Obtener el menu de la barra lateral desde el backend
   * @param token Firebase Auth token
   */
  fetchSidebarData(token: string): void {
    const headers = { Authorization: `Bearer ${token}` };
    this.http
      .get<SidebarResponse>(this.uploadApiUrl, { headers })
      .pipe(
        map((response: SidebarResponse) => ({
          companyName: this.truncateCompanyName(response.companyName),
          menuItems: response.menuItems.sort((a: MenuItem, b: MenuItem) => a.order - b.order),
        })),
      )
      .subscribe({
        next: ({ companyName, menuItems }: { companyName: string; menuItems: MenuItem[] }) => {
          this.companyName.set(companyName);
          this.menuItems.set(menuItems);
          this.saveToLocalStorage(companyName, menuItems);
        },
        error: (err: unknown) => {
          console.error('Error fetching sidebar data:', err);
        },
      });
  }

  /**
   * Guarda los datos en localStorage
   * @param companyName Nombre de la empresa
   * @param menuItems Elementos del menú
   */
  private saveToLocalStorage(companyName: string, menuItems: MenuItem[]): void {
    const data = { companyName, menuItems };
    localStorage.setItem(this.localStorageKey, JSON.stringify(data));
  }

  /**
   * Carga los datos desde localStorage
   */
  private loadFromLocalStorage(): void {
    const data = localStorage.getItem(this.localStorageKey);
    if (data) {
      try {
        const parsedData = JSON.parse(data) as { companyName: string; menuItems: MenuItem[] };
        this.companyName.set(parsedData.companyName);
        this.menuItems.set(parsedData.menuItems);
      } catch (error) {
        console.error('Error parsing sidebar data from localStorage:', error);
      }
    }
  }

  private truncateCompanyName(name: string, maxLength = 20): string {
    if (!name) return '';
    return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
  }
}
