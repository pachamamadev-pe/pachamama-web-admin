import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import type {
  Community,
  CreateCommunityRequest,
  UpdateCommunityRequest,
} from '../models/community.model';
import type { Department, Province, District } from '@shared/models/ubigeo.model';
import { UbigeoService } from '@shared/services/ubigeo.service';

export interface CommunityFormDialogData {
  community?: Community;
  mode: 'create' | 'edit';
}

/**
 * Dialog para crear o editar comunidades
 */
@Component({
  selector: 'app-community-form-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="text-title font-bold text-accent-titles">
        {{ isEditMode() ? 'Editar Comunidad' : 'Nueva Comunidad' }}
      </h2>

      <mat-dialog-content class="mt-4">
        <form [formGroup]="form" class="community-form">
          <!-- RUC -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>RUC</mat-label>
            <input
              matInput
              formControlName="ruc"
              placeholder="20123456789"
              maxlength="11"
              required
            />
            <mat-icon matPrefix>badge</mat-icon>
            @if (form.get('ruc')?.hasError('required') && form.get('ruc')?.touched) {
              <mat-error>El RUC es obligatorio</mat-error>
            }
            @if (form.get('ruc')?.hasError('pattern')) {
              <mat-error>El RUC debe tener 11 dígitos numéricos</mat-error>
            }
          </mat-form-field>

          <!-- Nombre -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nombre de la Comunidad</mat-label>
            <input matInput formControlName="name" placeholder="Nombre" required />
            <mat-icon matPrefix>groups</mat-icon>
            @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
              <mat-error>El nombre es obligatorio</mat-error>
            }
            @if (form.get('name')?.hasError('minlength')) {
              <mat-error>Mínimo 3 caracteres</mat-error>
            }
          </mat-form-field>

          <!-- Dirección Legal -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Dirección Legal</mat-label>
            <textarea
              matInput
              formControlName="legalAddress"
              placeholder="Dirección completa"
              rows="2"
              required
            ></textarea>
            <mat-icon matPrefix>location_on</mat-icon>
            @if (
              form.get('legalAddress')?.hasError('required') && form.get('legalAddress')?.touched
            ) {
              <mat-error>La dirección es obligatoria</mat-error>
            }
            @if (form.get('legalAddress')?.hasError('minlength')) {
              <mat-error>Mínimo 10 caracteres</mat-error>
            }
          </mat-form-field>

          <!-- Región/Departamento -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Región / Departamento</mat-label>
            <mat-select
              formControlName="region"
              (selectionChange)="onDepartmentChange($event.value)"
              required
            >
              @if (isLoadingDepartments()) {
                <mat-option disabled>Cargando...</mat-option>
              }
              @for (dept of departments(); track dept.code) {
                <mat-option [value]="dept.name">{{ dept.name }}</mat-option>
              }
            </mat-select>
            <mat-icon matPrefix>map</mat-icon>
            @if (form.get('region')?.hasError('required') && form.get('region')?.touched) {
              <mat-error>La región es obligatoria</mat-error>
            }
          </mat-form-field>

          <!-- Provincia -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Provincia</mat-label>
            <mat-select
              formControlName="province"
              (selectionChange)="onProvinceChange($event.value)"
              [disabled]="!form.get('region')?.value"
              required
            >
              @if (isLoadingProvinces()) {
                <mat-option disabled>Cargando...</mat-option>
              }
              @for (prov of provinces(); track prov.code) {
                <mat-option [value]="prov.name">{{ prov.name }}</mat-option>
              }
            </mat-select>
            <mat-icon matPrefix>location_city</mat-icon>
            @if (form.get('province')?.hasError('required') && form.get('province')?.touched) {
              <mat-error>La provincia es obligatoria</mat-error>
            }
          </mat-form-field>

          <!-- Distrito -->
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Distrito</mat-label>
            <mat-select
              formControlName="district"
              [disabled]="!form.get('province')?.value"
              required
            >
              @if (isLoadingDistricts()) {
                <mat-option disabled>Cargando...</mat-option>
              }
              @for (dist of districts(); track dist.code) {
                <mat-option [value]="dist.name">{{ dist.name }}</mat-option>
              }
            </mat-select>
            <mat-icon matPrefix>place</mat-icon>
            @if (form.get('district')?.hasError('required') && form.get('district')?.touched) {
              <mat-error>El distrito es obligatorio</mat-error>
            }
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="gap-2">
        <button mat-button [mat-dialog-close]="null" [disabled]="isSaving()">Cancelar</button>
        <button
          mat-raised-button
          color="primary"
          (click)="onSubmit()"
          [disabled]="form.invalid || isSaving()"
        >
          @if (isSaving()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            {{ isEditMode() ? 'Guardar Cambios' : 'Crear Comunidad' }}
          }
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .dialog-container {
      min-width: 300px;
    }

    .community-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem 0;
    }

    @media (min-width: 768px) {
      .dialog-container {
        min-width: 500px;
      }
    }
  `,
})
export class CommunityFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CommunityFormDialogComponent>);
  private ubigeoService = inject(UbigeoService);
  data = inject<CommunityFormDialogData>(MAT_DIALOG_DATA);

  isEditMode = signal(this.data.mode === 'edit');
  isSaving = signal(false);

  // Ubigeo data
  departments = signal<Department[]>([]);
  provinces = signal<Province[]>([]);
  districts = signal<District[]>([]);
  isLoadingDepartments = signal(false);
  isLoadingProvinces = signal(false);
  isLoadingDistricts = signal(false);

  // Almacenar códigos seleccionados para cargar dependencias
  private selectedDepartmentCode = signal<string | null>(null);
  private selectedProvinceCode = signal<string | null>(null);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    ruc: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d{11}$/),
        Validators.minLength(11),
        Validators.maxLength(11),
      ],
    ],
    legalAddress: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
    region: ['', [Validators.required]],
    province: ['', [Validators.required]],
    district: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadDepartments();

    if (this.isEditMode() && this.data.community) {
      this.populateForm(this.data.community);
    }
  }

  /**
   * Carga todos los departamentos
   */
  private loadDepartments(): void {
    this.isLoadingDepartments.set(true);
    this.ubigeoService.getDepartments().subscribe({
      next: (departments) => {
        this.departments.set(departments);
        this.isLoadingDepartments.set(false);
      },
      error: () => {
        this.isLoadingDepartments.set(false);
      },
    });
  }

  /**
   * Maneja el cambio de departamento
   */
  onDepartmentChange(departmentName: string): void {
    const department = this.departments().find((d) => d.name === departmentName);
    if (!department) return;

    this.selectedDepartmentCode.set(department.code);

    // Reset provincia y distrito
    this.form.patchValue({ province: '', district: '' });
    this.provinces.set([]);
    this.districts.set([]);

    // Cargar provincias
    this.isLoadingProvinces.set(true);
    this.ubigeoService.getProvinces(department.code).subscribe({
      next: (provinces) => {
        this.provinces.set(provinces);
        this.isLoadingProvinces.set(false);
      },
      error: () => {
        this.isLoadingProvinces.set(false);
      },
    });
  }

  /**
   * Maneja el cambio de provincia
   */
  onProvinceChange(provinceName: string): void {
    const province = this.provinces().find((p) => p.name === provinceName);
    if (!province) return;

    this.selectedProvinceCode.set(province.code);

    // Reset distrito
    this.form.patchValue({ district: '' });
    this.districts.set([]);

    // Cargar distritos
    this.isLoadingDistricts.set(true);
    this.ubigeoService.getDistricts(province.code).subscribe({
      next: (districts) => {
        this.districts.set(districts);
        this.isLoadingDistricts.set(false);
      },
      error: () => {
        this.isLoadingDistricts.set(false);
      },
    });
  }

  /**
   * Puebla el formulario con datos existentes
   */
  private populateForm(community: Community): void {
    this.form.patchValue({
      name: community.name,
      ruc: community.ruc,
      legalAddress: community.legalAddress,
      region: community.region,
      province: community.province,
      district: community.district,
    });

    // Cargar cascada de ubigeos
    const department = this.departments().find((d) => d.name === community.region);
    if (department) {
      this.onDepartmentChange(community.region);
      setTimeout(() => {
        this.onProvinceChange(community.province);
      }, 500);
    }
  }

  /**
   * Envía el formulario
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formValue = this.form.getRawValue();

    if (this.isEditMode()) {
      const updateData: UpdateCommunityRequest = {
        name: formValue.name || '',
        ruc: formValue.ruc || '',
        legalAddress: formValue.legalAddress || '',
        region: formValue.region || '',
        province: formValue.province || '',
        district: formValue.district || '',
      };
      this.dialogRef.close({ mode: 'edit', data: updateData });
    } else {
      const generatedCode = this.generateCompanyCode(formValue.name || '');
      const createData: CreateCommunityRequest = {
        code: generatedCode,
        name: formValue.name || '',
        ruc: formValue.ruc || '',
        legalAddress: formValue.legalAddress || '',
        region: formValue.region || '',
        province: formValue.province || '',
        district: formValue.district || '',
      };
      this.dialogRef.close({ mode: 'create', data: createData });
    }
  }

  private generateCompanyCode(companyName: string): string {
    // Extraer solo letras del nombre de la Compañía
    const cleanName = companyName
      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '') // Quitar espacios, puntos, números
      .toUpperCase()
      .normalize('NFD') // Normalizar para quitar acentos
      .replace(/[\u0300-\u036f]/g, ''); // Eliminar diacríticos

    // Tomar las primeras 4 letras (o menos si el nombre es corto)
    const prefix = cleanName.substring(0, 4).padEnd(4, 'X');

    // Generar 4 números aleatorios
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Entre 1000 y 9999

    return `${prefix}_${randomNumbers}`;
  }
}
