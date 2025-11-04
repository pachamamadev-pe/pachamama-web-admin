import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Company } from '../models/company.model';
import { CompaniesService } from '../services/companies.service';

export interface AssignAdminDialogData {
  company: Company;
  maxAdmins?: number; // Parametrizable, default 4
}

interface UserSearchResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface CompanyAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  assignedAt?: string;
}

@Component({
  selector: 'app-assign-admin-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="assign-admin-dialog">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-title font-bold text-accent-titles">Administradores de Empresa</h2>
          <p class="text-subtitle text-neutral-subheading mt-1">
            {{ data.company.businessName }}
          </p>
        </div>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Current Admins List -->
      @if (currentAdmins().length > 0) {
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-body font-bold text-primary-black">
              Administradores actuales ({{ currentAdmins().length }}/{{ maxAdmins }})
            </h3>
            @if (currentAdmins().length >= maxAdmins) {
              <span class="text-subtitle text-red-600">Límite alcanzado</span>
            }
          </div>

          <div class="space-y-2">
            @for (admin of currentAdmins(); track admin.id) {
              <div
                class="flex items-center justify-between p-3 bg-secondary-light border border-secondary rounded-lg"
              >
                <div class="flex items-center gap-3 flex-1">
                  <div
                    class="bg-secondary text-primary-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0"
                  >
                    <mat-icon>person</mat-icon>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-body font-bold text-primary-black truncate">
                      {{ admin.firstName }} {{ admin.lastName }}
                    </p>
                    <p class="text-subtitle text-neutral-subheading truncate">
                      {{ admin.email }}
                    </p>
                    @if (admin.assignedAt) {
                      <p class="text-subtitle text-neutral-subheading">
                        Asignado: {{ formatDate(admin.assignedAt) }}
                      </p>
                    }
                  </div>
                </div>

                <button
                  mat-icon-button
                  color="warn"
                  (click)="removeAdmin(admin)"
                  [disabled]="removingAdminId() === admin.id"
                  matTooltip="Remover administrador"
                >
                  @if (removingAdminId() === admin.id) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <mat-icon>delete</mat-icon>
                  }
                </button>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-center">
          <mat-icon class="text-neutral-subheading text-5xl mb-2">group_off</mat-icon>
          <p class="text-body text-neutral-subheading">
            Esta empresa no tiene administradores asignados
          </p>
        </div>
      }

      <!-- Separator -->
      @if (currentAdmins().length < maxAdmins) {
        <div class="border-t border-gray-200 my-6"></div>

        <!-- Add New Admin Form -->
        <div>
          <h3 class="text-body font-bold text-primary-black mb-4">Agregar nuevo administrador</h3>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- User Email Search -->
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Email del administrador</mat-label>
              <mat-icon matPrefix>person_search</mat-icon>
              <input
                matInput
                formControlName="userEmail"
                type="email"
                placeholder="admin@empresa.com"
                (blur)="searchUser()"
              />

              @if (form.get('userEmail')?.hasError('required')) {
                <mat-error>El email es obligatorio</mat-error>
              }
              @if (form.get('userEmail')?.hasError('email')) {
                <mat-error>Ingrese un email válido</mat-error>
              }

              <mat-hint>Buscaremos al usuario al salir del campo</mat-hint>
            </mat-form-field>

            <!-- Search Results / Messages -->
            @if (searching()) {
              <div class="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                <mat-spinner diameter="20"></mat-spinner>
                <span class="text-body text-neutral-subheading">Buscando usuario...</span>
              </div>
            }

            @if (searchResult()) {
              <div class="bg-secondary-light border border-secondary rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <div
                    class="bg-secondary text-primary-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0"
                  >
                    <mat-icon>person</mat-icon>
                  </div>
                  <div class="flex-1">
                    <p class="text-body font-bold text-primary-black">
                      {{ searchResult()!.firstName }} {{ searchResult()!.lastName }}
                    </p>
                    <p class="text-subtitle text-neutral-subheading">
                      {{ searchResult()!.email }}
                    </p>
                  </div>
                  <mat-icon class="text-secondary">check_circle</mat-icon>
                </div>
              </div>
            }

            @if (notFoundMessage()) {
              <div class="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <mat-icon class="text-red-600">error</mat-icon>
                <div class="flex-1">
                  <p class="text-body font-bold text-red-600">Usuario no encontrado</p>
                  <p class="text-subtitle text-red-600">
                    {{ notFoundMessage() }}
                  </p>
                </div>
              </div>
            }

            @if (alreadyAssignedMessage()) {
              <div
                class="flex items-start gap-2 p-4 bg-orange-50 border border-orange-200 rounded-lg"
              >
                <mat-icon class="text-orange-600">warning</mat-icon>
                <div class="flex-1">
                  <p class="text-body font-bold text-orange-600">Usuario ya asignado</p>
                  <p class="text-subtitle text-orange-600">
                    {{ alreadyAssignedMessage() }}
                  </p>
                </div>
              </div>
            }

            <!-- Info Message -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-start gap-2">
                <mat-icon class="text-blue-600 overflow-visible">info</mat-icon>
                <div class="text-subtitle text-blue-600">
                  <p class="font-bold mb-1">Nota sobre la funcionalidad</p>
                  <p>
                    Por ahora, esta funcionalidad simula la búsqueda de usuarios. En la versión
                    final, se integrará con el backend para buscar y asignar administradores reales.
                  </p>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3 pt-4">
              <button
                mat-stroked-button
                type="button"
                (click)="closeDialog()"
                class="btn-secondary"
              >
                {{ currentAdmins().length > 0 ? 'Cerrar' : 'Cancelar' }}
              </button>

              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="
                  form.invalid ||
                  !searchResult() ||
                  submitting() ||
                  alreadyAssignedMessage() !== null
                "
                class="btn-primary"
              >
                {{ submitting() ? 'Asignando...' : 'Agregar Administrador' }}
              </button>
            </div>
          </form>
        </div>
      } @else {
        <!-- Max limit reached -->
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div class="flex items-start gap-2">
            <mat-icon class="text-orange-600">warning</mat-icon>
            <div class="text-subtitle text-orange-600">
              <p class="font-bold mb-1">Límite de administradores alcanzado</p>
              <p>
                Esta empresa ya tiene el máximo de {{ maxAdmins }} administradores permitidos. Debe
                remover un administrador antes de agregar uno nuevo.
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button mat-raised-button color="primary" (click)="closeDialog()" class="btn-primary">
            Cerrar
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .assign-admin-dialog {
        padding: 24px;
        min-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
      }
      .overflow-visible {
        overflow: visible !important;
      }
      @media (max-width: 640px) {
        .assign-admin-dialog {
          padding: 16px;
          min-width: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignAdminDialogComponent {
  private fb = inject(FormBuilder);
  private companiesService = inject(CompaniesService);
  private dialogRef = inject(MatDialogRef<AssignAdminDialogComponent>);

  data = inject<AssignAdminDialogData>(MAT_DIALOG_DATA);

  searching = signal(false);
  submitting = signal(false);
  removingAdminId = signal<string | null>(null);
  searchResult = signal<UserSearchResult | null>(null);
  notFoundMessage = signal<string | null>(null);
  alreadyAssignedMessage = signal<string | null>(null);
  currentAdmins = signal<CompanyAdmin[]>([]);

  maxAdmins: number;
  form: FormGroup;

  constructor() {
    this.maxAdmins = this.data.maxAdmins ?? 4; // Default to 4, parametrizable

    this.form = this.fb.group({
      userEmail: ['', [Validators.required, Validators.email]],
    });

    // Load current admins (mock data for now)
    this.loadCurrentAdmins();
  }

  private loadCurrentAdmins(): void {
    // TODO: Replace with real API call
    // this.companiesService.getCompanyAdmins(this.data.company.id).subscribe(...)

    // Mock data for demonstration - Using RUC as key for consistency with table
    const mockAdminsByRuc: Record<string, CompanyAdmin[]> = {
      '20123456789': [
        // Agroindustrias Pachamama S.A.C.
        {
          id: 'user-1',
          email: 'admin@pachamama.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          assignedAt: '2025-01-15T10:30:00Z',
        },
        {
          id: 'user-2',
          email: 'maria@empresa.com',
          firstName: 'María',
          lastName: 'García',
          assignedAt: '2025-02-20T14:45:00Z',
        },
      ],
      '20987654321': [
        {
          id: 'user-1',
          email: 'carlos@empresa.com',
          firstName: 'Carlos',
          lastName: 'López',
          assignedAt: '2025-01-10T09:00:00Z',
        },
        {
          id: 'user-2',
          email: 'ana@empresa.com',
          firstName: 'Ana',
          lastName: 'Rodríguez',
          assignedAt: '2025-02-05T11:20:00Z',
        },
        {
          id: 'user-3',
          email: 'pedro@empresa.com',
          firstName: 'Pedro',
          lastName: 'Sánchez',
          assignedAt: '2025-03-01T15:45:00Z',
        },
      ],
    };

    // Load admins for this company based on RUC
    const admins = mockAdminsByRuc[this.data.company.ruc] || [];
    this.currentAdmins.set(admins);
  }

  searchUser(): void {
    const email = this.form.get('userEmail')?.value?.trim();

    if (!email || this.form.get('userEmail')?.invalid) {
      this.searchResult.set(null);
      this.notFoundMessage.set(null);
      this.alreadyAssignedMessage.set(null);
      return;
    }

    // Check if user is already assigned
    const alreadyAssigned = this.currentAdmins().some(
      (admin) => admin.email.toLowerCase() === email.toLowerCase(),
    );

    if (alreadyAssigned) {
      this.searchResult.set(null);
      this.notFoundMessage.set(null);
      this.alreadyAssignedMessage.set(
        `El usuario "${email}" ya está asignado como administrador de esta empresa.`,
      );
      return;
    }

    this.searching.set(true);
    this.searchResult.set(null);
    this.notFoundMessage.set(null);
    this.alreadyAssignedMessage.set(null);

    // Simulate API call with setTimeout
    // TODO: Replace with real API call
    // this.companiesService.searchUser(email).subscribe(...)
    setTimeout(() => {
      // Mock user data for demonstration
      const mockUsers: UserSearchResult[] = [
        { id: 'user-1', email: 'admin@pachamama.com', firstName: 'Juan', lastName: 'Pérez' },
        { id: 'user-2', email: 'maria@empresa.com', firstName: 'María', lastName: 'García' },
        { id: 'user-3', email: 'carlos@test.com', firstName: 'Carlos', lastName: 'López' },
        { id: 'user-4', email: 'ana@demo.com', firstName: 'Ana', lastName: 'Rodríguez' },
      ];

      const foundUser = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());

      if (foundUser) {
        this.searchResult.set(foundUser);
        this.notFoundMessage.set(null);
      } else {
        this.searchResult.set(null);
        this.notFoundMessage.set(
          `No se encontró ningún usuario con el email "${email}". Verifica que el usuario esté registrado en la plataforma.`,
        );
      }

      this.searching.set(false);
    }, 800); // Simulate network delay
  }

  removeAdmin(admin: CompanyAdmin): void {
    if (this.removingAdminId()) {
      return; // Already removing another admin
    }

    this.removingAdminId.set(admin.id);

    // TODO: Replace with real API call
    // this.companiesService.removeAdmin(this.data.company.id, admin.id).subscribe(...)

    // Simulate API call
    setTimeout(() => {
      const updatedAdmins = this.currentAdmins().filter((a) => a.id !== admin.id);
      this.currentAdmins.set(updatedAdmins);
      this.removingAdminId.set(null);

      // Clear search if the removed admin was being searched
      if (this.searchResult()?.id === admin.id) {
        this.form.reset();
        this.searchResult.set(null);
        this.alreadyAssignedMessage.set(null);
      }
    }, 600);
  }

  onSubmit(): void {
    if (
      this.form.invalid ||
      !this.searchResult() ||
      this.currentAdmins().length >= this.maxAdmins
    ) {
      return;
    }

    this.submitting.set(true);

    const user = this.searchResult()!;
    const newAdmin: CompanyAdmin = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      assignedAt: new Date().toISOString(),
    };

    // TODO: Replace with real API call
    // this.companiesService.addAdmin(this.data.company.id, user.id).subscribe(...)

    // Simulate API call
    setTimeout(() => {
      const updatedAdmins = [...this.currentAdmins(), newAdmin];
      this.currentAdmins.set(updatedAdmins);
      this.submitting.set(false);

      // Clear form and search result
      this.form.reset();
      this.searchResult.set(null);
      this.notFoundMessage.set(null);
      this.alreadyAssignedMessage.set(null);
    }, 600);
  }

  closeDialog(): void {
    // Return the updated list of admins
    this.dialogRef.close(this.currentAdmins());
  }

  formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
