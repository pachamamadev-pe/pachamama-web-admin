import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Company, CreateCompanyDto, UpdateCompanyDto } from '../models/company.model';
import { CompaniesService } from '../services/companies.service';
import { rucValidator } from '../../../shared/utils/validators';

export interface CompanyFormData {
  mode: 'create' | 'edit';
  company?: Company;
}

@Component({
  selector: 'app-company-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="company-form-dialog">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-title font-bold text-accent-titles">
          {{ data.mode === 'create' ? 'Nueva Empresa' : 'Editar Empresa' }}
        </h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- RUC -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>RUC</mat-label>
          <mat-icon matPrefix>badge</mat-icon>
          <input
            matInput
            formControlName="ruc"
            placeholder="12345678901"
            maxlength="11"
            [readonly]="data.mode === 'edit'"
          />
          @if (form.get('ruc')?.hasError('required')) {
            <mat-error>El RUC es obligatorio</mat-error>
          }
          @if (form.get('ruc')?.hasError('ruc')) {
            <mat-error>El RUC debe tener exactamente 11 dígitos</mat-error>
          }
        </mat-form-field>

        <!-- Razón Social -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Razón Social</mat-label>
          <mat-icon matPrefix>business</mat-icon>
          <input matInput formControlName="businessName" placeholder="Empresa S.A.C." />
          @if (form.get('businessName')?.hasError('required')) {
            <mat-error>La razón social es obligatoria</mat-error>
          }
          @if (form.get('businessName')?.hasError('minlength')) {
            <mat-error>Debe tener al menos 3 caracteres</mat-error>
          }
        </mat-form-field>

        <!-- Nombre Comercial -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nombre Comercial (opcional)</mat-label>
          <mat-icon matPrefix>store</mat-icon>
          <input matInput formControlName="tradeName" placeholder="Nombre comercial" />
        </mat-form-field>

        <!-- Dirección -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Dirección</mat-label>
          <mat-icon matPrefix>location_on</mat-icon>
          <textarea
            matInput
            formControlName="address"
            placeholder="Av. Principal 123, Distrito, Provincia"
            rows="2"
          ></textarea>
          @if (form.get('address')?.hasError('required')) {
            <mat-error>La dirección es obligatoria</mat-error>
          }
        </mat-form-field>

        <!-- Teléfono -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Teléfono</mat-label>
          <mat-icon matPrefix>phone</mat-icon>
          <input matInput formControlName="phone" placeholder="+51 999 999 999" />
          @if (form.get('phone')?.hasError('required')) {
            <mat-error>El teléfono es obligatorio</mat-error>
          }
        </mat-form-field>

        <!-- Email -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Email</mat-label>
          <mat-icon matPrefix>email</mat-icon>
          <input matInput formControlName="email" type="email" placeholder="contacto@empresa.com" />
          @if (form.get('email')?.hasError('required')) {
            <mat-error>El email es obligatorio</mat-error>
          }
          @if (form.get('email')?.hasError('email')) {
            <mat-error>Ingrese un email válido</mat-error>
          }
        </mat-form-field>

        <!-- Website -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Sitio Web (opcional)</mat-label>
          <mat-icon matPrefix>language</mat-icon>
          <input
            matInput
            formControlName="website"
            type="url"
            placeholder="https://www.empresa.com"
          />
          @if (form.get('website')?.hasError('pattern')) {
            <mat-error>Ingrese una URL válida (debe comenzar con http:// o https://)</mat-error>
          }
        </mat-form-field>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <button mat-stroked-button type="button" mat-dialog-close class="btn-secondary">
            Cancelar
          </button>

          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || submitting()"
            class="btn-primary"
          >
            {{
              submitting()
                ? 'Guardando...'
                : data.mode === 'create'
                  ? 'Crear Empresa'
                  : 'Guardar Cambios'
            }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .company-form-dialog {
        padding: 24px;
        min-width: 500px;
      }

      @media (max-width: 640px) {
        .company-form-dialog {
          padding: 16px;
          min-width: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companiesService = inject(CompaniesService);
  private dialogRef = inject(MatDialogRef<CompanyFormComponent>);

  data = inject<CompanyFormData>(MAT_DIALOG_DATA);

  submitting = signal(false);
  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    const urlPattern = /^https?:\/\/.+/;

    this.form = this.fb.group({
      ruc: [this.data.company?.ruc || '', [Validators.required, rucValidator()]],
      businessName: [
        this.data.company?.businessName || '',
        [Validators.required, Validators.minLength(3)],
      ],
      tradeName: [this.data.company?.tradeName || ''],
      address: [this.data.company?.address || '', [Validators.required]],
      phone: [this.data.company?.phone || '', [Validators.required]],
      email: [this.data.company?.email || '', [Validators.required, Validators.email]],
      website: [this.data.company?.website || '', [Validators.pattern(urlPattern)]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    if (this.data.mode === 'create') {
      this.createCompany();
    } else {
      this.updateCompany();
    }
  }

  private createCompany(): void {
    const dto: CreateCompanyDto = {
      ...this.form.value,
      status: 'active' as const,
      adminUserId: null,
    };

    this.companiesService.createCompany(dto).subscribe({
      next: (company) => {
        this.submitting.set(false);
        this.dialogRef.close(company);
      },
      error: (error) => {
        console.error('Error creating company:', error);
        this.submitting.set(false);
        // Error handling will be done in the parent component
      },
    });
  }

  private updateCompany(): void {
    if (!this.data.company) {
      return;
    }

    const dto: UpdateCompanyDto = {
      businessName: this.form.value.businessName,
      tradeName: this.form.value.tradeName || undefined,
      address: this.form.value.address,
      phone: this.form.value.phone,
      email: this.form.value.email,
      website: this.form.value.website || undefined,
    };

    this.companiesService.updateCompany(this.data.company.id, dto).subscribe({
      next: (company) => {
        this.submitting.set(false);
        this.dialogRef.close(company);
      },
      error: (error) => {
        console.error('Error updating company:', error);
        this.submitting.set(false);
        // Error handling will be done in the parent component
      },
    });
  }
}
