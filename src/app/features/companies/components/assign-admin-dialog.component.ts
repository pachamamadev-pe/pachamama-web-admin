import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Company } from '../models/company.model';
import { CompaniesService } from '../services/companies.service';

export interface AssignAdminDialogData {
  company: Company;
}

interface UserSearchResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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
  ],
  template: `
    <div class="assign-admin-dialog">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-title font-bold text-accent-titles">Asignar Administrador</h2>
          <p class="text-subtitle text-neutral-subheading mt-1">
            {{ data.company.businessName }}
          </p>
        </div>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Current Admin Info -->
      @if (data.company.adminUserId) {
        <div class="bg-secondary-light border border-secondary rounded-lg p-4 mb-4">
          <div class="flex items-center gap-2 text-secondary">
            <mat-icon>info</mat-icon>
            <span class="text-subtitle font-bold">Administrador actual asignado</span>
          </div>
          <p class="text-body text-neutral-subheading mt-2">
            ID del usuario: {{ data.company.adminUserId }}
          </p>
        </div>
      }

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- User Email Search -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Email del nuevo administrador</mat-label>
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

        <!-- Info Message -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start gap-2">
            <mat-icon class="text-blue-600 overflow-visible">info</mat-icon>
            <div class="text-subtitle text-blue-600">
              <p class="font-bold mb-1">Nota sobre la funcionalidad</p>
              <p>
                Por ahora, esta funcionalidad simula la búsqueda de usuarios. En la versión final,
                se integrará con el backend para buscar y asignar administradores reales.
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <button mat-stroked-button type="button" mat-dialog-close class="btn-secondary">
            Cancelar
          </button>

          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || !searchResult() || submitting()"
            class="btn-primary"
          >
            {{ submitting() ? 'Asignando...' : 'Asignar Administrador' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .assign-admin-dialog {
        padding: 24px;
        min-width: 500px;
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
  searchResult = signal<UserSearchResult | null>(null);
  notFoundMessage = signal<string | null>(null);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      userEmail: ['', [Validators.required, Validators.email]],
    });
  }

  searchUser(): void {
    const email = this.form.get('userEmail')?.value?.trim();

    if (!email || this.form.get('userEmail')?.invalid) {
      this.searchResult.set(null);
      this.notFoundMessage.set(null);
      return;
    }

    this.searching.set(true);
    this.searchResult.set(null);
    this.notFoundMessage.set(null);

    // Simulate API call with setTimeout
    // In production, this would be a real HTTP call to search users
    setTimeout(() => {
      // Mock user data for demonstration
      const mockUsers: UserSearchResult[] = [
        { id: 'user-1', email: 'admin@pachamama.com', firstName: 'Juan', lastName: 'Pérez' },
        { id: 'user-2', email: 'maria@empresa.com', firstName: 'María', lastName: 'García' },
        { id: 'user-3', email: 'carlos@test.com', firstName: 'Carlos', lastName: 'López' },
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

  onSubmit(): void {
    if (this.form.invalid || !this.searchResult()) {
      return;
    }

    this.submitting.set(true);

    const userId = this.searchResult()!.id;

    this.companiesService.assignAdmin(this.data.company.id, userId).subscribe({
      next: (updatedCompany) => {
        this.submitting.set(false);
        this.dialogRef.close(updatedCompany);
      },
      error: (error) => {
        console.error('Error assigning admin:', error);
        this.submitting.set(false);
        // Error handling will be done in the parent component
      },
    });
  }
}
