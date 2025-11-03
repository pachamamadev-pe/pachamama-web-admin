import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Company, CreateCompanyDto, UpdateCompanyDto } from '../models/company.model';
import { CompaniesService } from '../services/companies.service';
import { rucValidator } from '../../../shared/utils/validators';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { CompanyDocument } from '../models/company-document.model';

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
    MatDividerModule,
    FileUploadComponent,
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

        <!-- Document Uploads Section -->
        <mat-divider class="my-6"></mat-divider>

        <div class="space-y-4">
          <h3 class="text-subtitle font-bold text-accent-titles">Documentos de Respaldo</h3>

          <!-- RUC Document (Required) -->
          <app-file-upload
            [companyId]="companyId()"
            documentType="ruc"
            accept=".pdf"
            [multiple]="false"
            [maxSize]="10"
            label="Documento RUC (obligatorio)"
            [required]="data.mode === 'create'"
            (fileUploaded)="onRucDocumentUploaded($event)"
            (fileDeleted)="onRucDocumentDeleted($event)"
            (uploadError)="onUploadError($event)"
          />

          @if (data.mode === 'create' && !hasRucDocument()) {
            <p class="text-sm text-red-600 mt-1">
              * Debes adjuntar el documento RUC antes de crear la empresa
            </p>
          }

          <!-- Business Licenses (Optional, Multiple) -->
          <app-file-upload
            [companyId]="companyId()"
            documentType="license"
            accept=".pdf,.jpg,.jpeg,.png"
            [multiple]="true"
            [maxSize]="10"
            label="Licencias y Permisos (opcional)"
            [required]="false"
            (fileUploaded)="onDocumentUploaded($event)"
            (fileDeleted)="onDocumentDeleted($event)"
            (uploadError)="onUploadError($event)"
          />

          <!-- Powers of Attorney (Optional, Multiple) -->
          <app-file-upload
            [companyId]="companyId()"
            documentType="power_of_attorney"
            accept=".pdf"
            [multiple]="true"
            [maxSize]="10"
            label="Poderes y Autorizaciones (opcional)"
            [required]="false"
            (fileUploaded)="onDocumentUploaded($event)"
            (fileDeleted)="onDocumentDeleted($event)"
            (uploadError)="onUploadError($event)"
          />
        </div>

        <mat-divider class="my-6"></mat-divider>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <button mat-stroked-button type="button" mat-dialog-close class="btn-secondary">
            Cancelar
          </button>

          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="
              form.invalid || submitting() || (data.mode === 'create' && !hasRucDocument())
            "
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
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        overflow-x: hidden;
        box-sizing: border-box;
      }

      @media (max-width: 768px) {
        .company-form-dialog {
          padding: 16px;
          max-width: 100%;
          max-height: 100vh;
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

  // Document upload state
  hasRucDocument = signal(false);
  uploadedDocuments = signal<CompanyDocument[]>([]);

  // Company ID for file uploads (temporary ID for new companies, actual ID for editing)
  companyId = computed(() => {
    return this.data.company?.id || `temp-${Date.now()}`;
  });

  ngOnInit(): void {
    this.initForm();

    // If editing, we assume RUC document exists
    if (this.data.mode === 'edit') {
      this.hasRucDocument.set(true);
    }
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

  // Document upload event handlers
  onRucDocumentUploaded(document: CompanyDocument): void {
    this.hasRucDocument.set(true);
    this.uploadedDocuments.update((docs) => [...docs, document]);
    console.log('RUC document uploaded:', document);
  }

  onRucDocumentDeleted(documentId: string): void {
    // Check if this was the last RUC document
    const remainingRucDocs = this.uploadedDocuments().filter(
      (doc) => doc.documentType === 'ruc' && doc.id !== documentId,
    );

    if (remainingRucDocs.length === 0) {
      this.hasRucDocument.set(false);
    }

    this.uploadedDocuments.update((docs) => docs.filter((doc) => doc.id !== documentId));
    console.log('RUC document deleted:', documentId);
  }

  onDocumentUploaded(document: CompanyDocument): void {
    this.uploadedDocuments.update((docs) => [...docs, document]);
    console.log('Document uploaded:', document);
  }

  onDocumentDeleted(documentId: string): void {
    this.uploadedDocuments.update((docs) => docs.filter((doc) => doc.id !== documentId));
    console.log('Document deleted:', documentId);
  }

  onUploadError(error: string): void {
    console.error('Upload error:', error);
    // TODO: Show error message to user (e.g., using MatSnackBar)
    // For now, just log to console
  }
}
