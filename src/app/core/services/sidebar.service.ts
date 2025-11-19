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
  emailVerified: boolean;
  isPasswordChanged: boolean;
  userId: string;
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
  emailVerified = signal<boolean>(false);
  isPasswordChanged = signal<boolean>(false);
  userId = signal<string>('');

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Obtener el menu de la barra lateral desde el backend
   * @param token Firebase Auth token
   */
  fetchSidebarData(token: string, callback?: () => void): void {
    const headers = { Authorization: `Bearer ${token}` };
    this.http
      .get<SidebarResponse>(this.uploadApiUrl, { headers })
      .pipe(
        map((response: SidebarResponse) => ({
          companyName: this.truncateCompanyName(response.companyName),
          menuItems: response.menuItems.sort((a: MenuItem, b: MenuItem) => a.order - b.order),
          emailVerified: response.emailVerified,
          isPasswordChanged: response.isPasswordChanged,
          userId: response.userId,
        })),
      )
      .subscribe({
        next: ({ companyName, menuItems, emailVerified, isPasswordChanged, userId }) => {
          this.companyName.set(companyName);
          this.menuItems.set(menuItems);
          this.emailVerified.set(emailVerified);
          this.isPasswordChanged.set(isPasswordChanged);
          this.userId.set(userId);
          this.saveToLocalStorage(companyName, menuItems, emailVerified, isPasswordChanged, userId);
          if (callback) callback();
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
   * @param emailVerified Estado de verificación del email
   * @param isPasswordChanged Estado de cambio de contraseña
   * @param userId ID del usuario
   */
  private saveToLocalStorage(
    companyName: string,
    menuItems: MenuItem[],
    emailVerified: boolean,
    isPasswordChanged: boolean,
    userId: string,
  ): void {
    const data = { companyName, menuItems, emailVerified, isPasswordChanged, userId };
    localStorage.setItem(this.localStorageKey, JSON.stringify(data));
  }

  /**
   * Carga los datos desde localStorage
   */
  private loadFromLocalStorage(): void {
    const data = localStorage.getItem(this.localStorageKey);
    if (data) {
      try {
        const parsedData = JSON.parse(data) as {
          companyName: string;
          menuItems: MenuItem[];
          emailVerified: boolean;
          isPasswordChanged: boolean;
          userId: string;
        };
        this.companyName.set(parsedData.companyName);
        this.menuItems.set(parsedData.menuItems);
        this.emailVerified.set(parsedData.emailVerified);
        this.isPasswordChanged.set(parsedData.isPasswordChanged);
        this.userId.set(parsedData.userId || '');
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
