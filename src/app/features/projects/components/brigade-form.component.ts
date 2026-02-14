import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrigadesService } from '../services/brigades.service';
import { NotificationService } from '@core/services/notification.service';
import { CreateBrigadeRequest } from '../models/create-brigade.request';
import { Brigade } from '../models/brigade.model';
import { CollectorsService } from '../services/collectors.service';
import { Collector } from '../models/collector.model';
import { CollectionRequestsService } from '../../collection-requests/services/collection-requests.service';
import { CollectionRequest } from '../../collection-requests/models/collection-request.model';
import { formatDateISO, parseDateValue } from '@shared/utils/date-helpers';

interface BrigadeFormDialogData {
  projectCommunityId: string;
  projectId: string;
  projectStage?: string;
  mode?: 'create' | 'edit' | 'add-members';
  brigade?: Brigade;
}

const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;

  if (!startDate || !endDate) {
    return null;
  }

  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);

  if (!start || !end) {
    return null;
  }

  if (end < start) {
    return { invalidDateRange: true };
  }

  return null;
};

@Component({
  selector: 'app-brigade-form-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatListModule,
    MatProgressSpinnerModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <header class="dialog-header">
        <div class="header-content">
          <div class="header-icon">
            <mat-icon class="text-secondary">{{ dialogIcon() }}</mat-icon>
          </div>
          <div class="header-text">
            <h2 class="text-title font-bold text-accent-titles">{{ dialogTitle() }}</h2>
            <p class="text-subtitle text-neutral-subheading">{{ dialogSubtitle() }}</p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" type="button" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <!-- Form Content -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="dialog-content">
          <div class="form-section">
            <h3 class="section-title text-body font-bold text-accent-titles">Información Básica</h3>

            <div class="form-grid">
              @if (!isAddMembersMode()) {
                <!-- Nombre -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nombre de la Brigada</mat-label>
                  <mat-icon matPrefix class="field-icon">badge</mat-icon>
                  <input
                    matInput
                    formControlName="name"
                    placeholder="Ej: Brigada Norte, Brigada A"
                    maxlength="100"
                  />
                  @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                    <mat-error>El nombre de la brigada es requerido</mat-error>
                  }
                  @if (form.get('name')?.hasError('minlength')) {
                    <mat-error>El nombre debe tener al menos 3 caracteres</mat-error>
                  }
                  <mat-hint align="end">{{ form.get('name')?.value?.length || 0 }}/100</mat-hint>
                </mat-form-field>

                <!-- Descripción -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Descripción (Opcional)</mat-label>
                  <mat-icon matPrefix class="field-icon">description</mat-icon>
                  <textarea
                    matInput
                    formControlName="description"
                    rows="4"
                    placeholder="Describe el área de trabajo, objetivos o responsabilidades de esta brigada"
                    maxlength="500"
                  ></textarea>
                  <mat-hint align="end">
                    {{ form.get('description')?.value?.length || 0 }}/500
                  </mat-hint>
                </mat-form-field>
              }

              <!-- Status Toggle (solo en modo edición) -->
              @if (isEditMode()) {
                <div class="status-toggle-container">
                  <div class="status-info">
                    <mat-icon class="status-icon">{{
                      form.get('status')?.value === 'active' ? 'check_circle' : 'cancel'
                    }}</mat-icon>
                    <div class="status-text">
                      <span class="status-label">Estado de la Brigada</span>
                      <span class="status-description">{{
                        form.get('status')?.value === 'active'
                          ? 'La brigada está activa y puede recibir asignaciones'
                          : 'La brigada está inactiva y no recibirá nuevas asignaciones'
                      }}</span>
                    </div>
                  </div>
                  <mat-slide-toggle
                    color="primary"
                    [checked]="form.get('status')?.value === 'active'"
                    (change)="onStatusChange($event.checked)"
                  >
                    {{ form.get('status')?.value === 'active' ? 'Activa' : 'Inactiva' }}
                  </mat-slide-toggle>
                </div>
              }
            </div>
          </div>

          @if (isCreateMode()) {
            <div class="form-section">
              <h3 class="section-title text-body font-bold text-accent-titles">
                Solicitud de Recolección
              </h3>

              @if (!isProjectCollectionStage()) {
                <div class="info-box warning-box">
                  <mat-icon class="info-icon">warning_amber</mat-icon>
                  <div class="info-content">
                    <p class="info-title">Proyecto no está en etapa Recolección</p>
                    <p class="info-text">
                      La solicitud asociada solo puede seleccionarse cuando el proyecto está en
                      etapa de recolección.
                    </p>
                  </div>
                </div>
              }

              @if (isProjectCollectionStage()) {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Solicitud aprobada</mat-label>
                  <mat-icon matPrefix class="field-icon">assignment</mat-icon>
                  <mat-select formControlName="collectionRequestId" [disabled]="loadingRequests()">
                    @for (request of approvedRequests(); track request.id) {
                      <mat-option [value]="request.id">
                        {{ request.requestNumber }} - {{ request.requestedWeighing }} kg
                      </mat-option>
                    }
                  </mat-select>
                  @if (form.get('collectionRequestId')?.hasError('required')) {
                    <mat-error>Selecciona una solicitud aprobada</mat-error>
                  }
                  @if (loadingRequests()) {
                    <mat-hint>Buscando solicitudes aprobadas...</mat-hint>
                  } @else if (!loadingRequests() && approvedRequests().length === 0) {
                    <mat-hint>No hay solicitudes aprobadas disponibles</mat-hint>
                  }
                </mat-form-field>
              }
            </div>
          }

          @if (isCreateMode() || isAddMembersMode()) {
            <div class="form-section">
              <h3 class="section-title text-body font-bold text-accent-titles">
                Período de Asignación
              </h3>

              <div class="date-grid">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Fecha de inicio</mat-label>
                  <input
                    matInput
                    [matDatepicker]="startPicker"
                    formControlName="startDate"
                    placeholder="DD/MM/AAAA"
                  />
                  <mat-datepicker-toggle matIconSuffix [for]="startPicker" />
                  <mat-datepicker #startPicker />
                  @if (form.get('startDate')?.hasError('required')) {
                    <mat-error>La fecha de inicio es requerida</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Fecha de fin (opcional)</mat-label>
                  <input
                    matInput
                    [matDatepicker]="endPicker"
                    formControlName="endDate"
                    [min]="form.get('startDate')?.value || minDate"
                    (click)="endPicker.open()"
                  />
                  <mat-datepicker-toggle matSuffix [for]="endPicker" />
                  <mat-datepicker #endPicker />

                  <mat-hint>Dejar vacío para asignación indefinida</mat-hint>
                </mat-form-field>
              </div>

              @if (form.hasError('invalidDateRange')) {
                <div class="error-box">
                  <mat-icon>error</mat-icon>
                  <span>La fecha de fin debe ser posterior a la fecha de inicio.</span>
                </div>
              }
            </div>

            <div class="form-section">
              <h3 class="section-title text-body font-bold text-accent-titles">Recolectores</h3>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Buscar recolectores</mat-label>
                <mat-icon matPrefix class="field-icon">search</mat-icon>
                <input
                  matInput
                  [value]="collectorSearch()"
                  (input)="onCollectorSearch($event)"
                  placeholder="Nombre, documento o telefono"
                />
              </mat-form-field>

              @if (loadingCollectors()) {
                <div class="loading-inline">
                  <mat-spinner diameter="32" />
                  <span class="text-subtitle text-neutral-subheading"
                    >Cargando recolectores...</span
                  >
                </div>
              } @else {
                <mat-selection-list formControlName="selectedCollectors">
                  @for (collector of filteredCollectors(); track collector.id) {
                    <mat-list-option [value]="collector" [disabled]="isCollectorBlocked(collector)">
                      <div class="collector-row">
                        <div class="collector-main">
                          <span class="text-body font-bold">
                            {{ collector.name }} {{ collector.lastName }}
                          </span>
                          <span class="text-subtitle text-neutral-subheading">
                            {{ collector.documentType }} {{ collector.documentNumber }}
                          </span>
                        </div>
                        <div class="collector-meta">
                          @if (collector.currentBrigadeName) {
                            <span class="assigned-badge">
                              Asignado a {{ collector.currentBrigadeName }}
                            </span>
                          }
                          @if (!collector.currentBrigadeName && collector.status === 'inactive') {
                            <span class="inactive-badge">Inactivo</span>
                          }
                        </div>
                      </div>
                    </mat-list-option>
                  }

                  @if (filteredCollectors().length === 0) {
                    <mat-list-option disabled>
                      <span class="text-subtitle text-neutral-subheading">
                        No se encontraron recolectores disponibles
                      </span>
                    </mat-list-option>
                  }
                </mat-selection-list>
              }

              <div class="selection-summary">
                <mat-icon class="summary-icon">group</mat-icon>
                <span class="text-subtitle text-neutral-subheading">
                  {{ selectedCollectorsCount() }} recolector(es) seleccionados
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Actions -->
        <footer class="dialog-footer">
          @if (submitDisabledMessage()) {
            <div class="submit-hint">
              <mat-icon class="submit-hint-icon">info</mat-icon>
              <span class="text-subtitle text-neutral-subheading">
                {{ submitDisabledMessage() }}
              </span>
            </div>
          }
          <button mat-stroked-button type="button" (click)="close()" [disabled]="submitting()">
            Cancelar
          </button>
          <button
            mat-raised-button
            type="submit"
            [disabled]="isSubmitDisabled()"
            class="btn-primary"
          >
            @if (submitting()) {
              <span class="button-content">
                <mat-icon class="button-icon spin">hourglass_empty</mat-icon>
                {{ submitLabelLoading() }}
              </span>
            } @else {
              <span class="button-content">
                <mat-icon class="button-icon">{{ submitIcon() }}</mat-icon>
                {{ submitLabel() }}
              </span>
            }
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: `
    .dialog-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 700px;
      max-height: 90vh;
      background: #ffffff;
    }

    /* Header */
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px;
      border-bottom: 1px solid #e5e5e5;
      background: #f9fafb;
    }

    .header-content {
      display: flex;
      gap: 16px;
      flex: 1;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #f4fbf6;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .header-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;

      h2 {
        margin: 0;
        font-size: 20px;
        line-height: 1.3;
      }

      p {
        margin: 0;
        font-size: 13px;
      }
    }

    .close-button {
      flex-shrink: 0;
      margin: -8px -8px 0 0;
    }

    /* Content */
    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-title {
      margin: 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #f4fbf6;
      font-size: 15px;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .field-icon {
      color: #737373;
      margin-right: 8px;
    }

    /* Status Toggle */
    .status-toggle-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: #f9fafb;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      gap: 16px;
    }

    .status-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .status-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #218358;
    }

    .status-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .status-label {
      font-size: 14px;
      font-weight: 600;
      color: #0a0a0a;
    }

    .status-description {
      font-size: 13px;
      color: #737373;
      line-height: 1.4;
    }

    /* Info Box */
    .info-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
    }

    .warning-box {
      background: #fff7ed;
      border-color: #fdba74;
    }

    .info-icon {
      color: #0284c7;
      font-size: 24px;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .info-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .info-title {
      margin: 0;
      color: #0c4a6e;
      font-size: 14px;
    }

    .info-text {
      margin: 0;
      color: #075985;
      font-size: 13px;
      line-height: 1.5;
    }

    .date-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #dc2626;
      background: #fef2f2;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
    }

    .loading-inline {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .collector-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 12px;
    }

    .collector-main {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .collector-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      font-size: 12px;
    }

    .assigned-badge {
      padding: 2px 8px;
      border-radius: 999px;
      background: #f4fbf6;
      color: #218358;
    }

    .inactive-badge {
      padding: 2px 8px;
      border-radius: 999px;
      background: #fef2f2;
      color: #dc2626;
    }

    .selection-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
    }

    .summary-icon {
      color: #218358;
    }

    /* Footer */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e5e5e5;
      background: #f9fafb;
      flex-wrap: wrap;
    }

    .submit-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-right: auto;
    }

    .submit-hint-icon {
      color: #737373;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .button-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-right: 4px;
    }

    .button-content {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    /* Responsive */
    @media (max-width: 640px) {
      .dialog-container {
        max-width: 100vw;
        max-height: 100vh;
      }

      .dialog-header,
      .dialog-content,
      .dialog-footer {
        padding: 16px;
      }

      .header-icon {
        width: 40px;
        height: 40px;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }

      .date-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrigadeFormDialogComponent {
  private fb = inject(FormBuilder);
  private brigadesService = inject(BrigadesService);
  private collectorsService = inject(CollectorsService);
  private collectionRequestsService = inject(CollectionRequestsService);
  private notification = inject(NotificationService);
  private dialogRef = inject(MatDialogRef<BrigadeFormDialogComponent>);
  data = inject<BrigadeFormDialogData>(MAT_DIALOG_DATA);

  form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      status: ['active'],
      collectionRequestId: [null],
      startDate: [new Date(), [Validators.required]],
      endDate: [null],
      selectedCollectors: [[]],
    },
    { validators: dateRangeValidator },
  );

  formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  submitting = signal(false);
  loadingCollectors = signal(false);
  loadingRequests = signal(false);
  approvedRequests = signal<CollectionRequest[]>([]);
  collectors = signal<Collector[]>([]);
  collectorSearch = signal('');
  minDate = new Date();
  isSubmitDisabled = computed(() => {
    this.formValue(); // trigger dependency
    const requiresApprovedRequest = this.isCreateMode() && this.isProjectCollectionStage();
    const hasApprovedRequest = Boolean(this.form.get('collectionRequestId')?.value);
    if (requiresApprovedRequest && !hasApprovedRequest) {
      return true;
    }
    return this.form.invalid || this.submitting();
  });
  submitDisabledMessage = computed(() => {
    this.formValue(); // trigger dependency
    if (!this.isSubmitDisabled() || this.submitting()) {
      return '';
    }

    if (this.isCreateMode() && this.isProjectCollectionStage()) {
      const hasApprovedRequest = Boolean(this.form.get('collectionRequestId')?.value);
      if (!hasApprovedRequest) {
        return this.approvedRequests().length === 0
          ? 'No hay solicitudes aprobadas disponibles para seleccionar.'
          : 'Selecciona una solicitud aprobada para crear la brigada.';
      }
    }

    if (this.form.hasError('invalidDateRange')) {
      return 'La fecha de fin debe ser posterior a la fecha de inicio.';
    }

    if (this.form.get('name')?.hasError('required')) {
      return 'Ingresa el nombre de la brigada.';
    }

    if (this.form.get('startDate')?.hasError('required')) {
      return 'Selecciona la fecha de inicio.';
    }

    return 'Completa los campos obligatorios para continuar.';
  });

  isEditMode = computed(() => this.data.mode === 'edit');
  isCreateMode = computed(() => !this.data.mode || this.data.mode === 'create');
  isAddMembersMode = computed(() => this.data.mode === 'add-members');

  selectedCollectorsCount = computed(() => {
    this.formValue(); // trigger dependency
    const collectors = (this.form.get('selectedCollectors')?.value || []) as Collector[];
    return collectors.length;
  });

  filteredCollectors = computed(() => {
    const search = this.collectorSearch().trim().toLowerCase();
    const current = this.collectors();
    if (!search) {
      return current;
    }

    return current.filter((collector) => {
      return (
        collector.name.toLowerCase().includes(search) ||
        collector.lastName.toLowerCase().includes(search) ||
        collector.documentNumber?.toLowerCase().includes(search) ||
        collector.phone?.toLowerCase().includes(search)
      );
    });
  });

  dialogTitle = computed(() => {
    if (this.isAddMembersMode()) {
      return 'Agregar recolectores';
    }
    return this.isEditMode() ? 'Editar Brigada' : 'Crear Nueva Brigada';
  });

  dialogSubtitle = computed(() => {
    if (this.isAddMembersMode()) {
      return 'Selecciona recolectores y define el periodo de asignacion';
    }
    return this.isEditMode()
      ? 'Modifica la informacion de la brigada'
      : 'Completa la informacion de la brigada';
  });

  dialogIcon = computed(() => {
    if (this.isAddMembersMode()) {
      return 'group_add';
    }
    return this.isEditMode() ? 'edit' : 'group_add';
  });

  submitLabel = computed(() => {
    if (this.isAddMembersMode()) {
      return 'Agregar recolectores';
    }
    return this.isEditMode() ? 'Guardar Cambios' : 'Crear Brigada';
  });

  submitLabelLoading = computed(() => {
    if (this.isAddMembersMode()) {
      return 'Agregando...';
    }
    return this.isEditMode() ? 'Guardando...' : 'Creando...';
  });

  submitIcon = computed(() => {
    if (this.isAddMembersMode()) {
      return 'person_add';
    }
    return this.isEditMode() ? 'save' : 'add_circle';
  });

  constructor() {
    this.configureFormForMode();
    this.configureCollectionRequestValidation();

    if (this.isCreateMode() && this.isProjectCollectionStage()) {
      this.loadApprovedRequests();
      this.loadCollectors();
    }

    if (this.isCreateMode() && !this.isProjectCollectionStage()) {
      this.approvedRequests.set([]);
      this.loadCollectors();
    }

    if (this.isAddMembersMode()) {
      this.loadCollectors();
    }

    if (this.isEditMode() && this.data.brigade) {
      this.form.patchValue({
        name: this.data.brigade.name,
        description: this.data.brigade.description || '',
        status: this.data.brigade.status,
      });
    }
  }

  onStatusChange(isActive: boolean): void {
    this.form.patchValue({ status: isActive ? 'active' : 'inactive' });
  }

  isProjectCollectionStage(): boolean {
    return this.data.projectStage === 'collection';
  }

  onCollectorSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.collectorSearch.set(value);
  }

  isCollectorBlocked(collector: Collector): boolean {
    if (collector.status === 'inactive') {
      return true;
    }

    if (collector.currentBrigadeId && collector.currentBrigadeId !== this.data.brigade?.id) {
      return true;
    }

    return false;
  }

  private configureFormForMode(): void {
    if (this.isEditMode()) {
      this.form.get('collectionRequestId')?.disable();
      this.form.get('startDate')?.disable();
      this.form.get('endDate')?.disable();
      this.form.get('selectedCollectors')?.disable();
    }

    if (this.isAddMembersMode()) {
      this.form.get('name')?.disable();
      this.form.get('description')?.disable();
      this.form.get('status')?.disable();
      this.form.get('collectionRequestId')?.disable();
    }
  }

  private configureCollectionRequestValidation(): void {
    const control = this.form.get('collectionRequestId');
    if (!control) {
      return;
    }

    if (this.isCreateMode() && this.isProjectCollectionStage()) {
      control.setValidators([Validators.required]);
    } else {
      control.setValidators([]);
      control.setValue(null);
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  private loadApprovedRequests(): void {
    this.loadingRequests.set(true);
    this.collectionRequestsService.getApprovedRequestsByProject(this.data.projectId).subscribe({
      next: (requests) => {
        this.approvedRequests.set(requests ?? []);
        this.loadingRequests.set(false);
      },
      error: (error) => {
        console.error('Error loading approved requests:', error);
        this.approvedRequests.set([]);
        this.loadingRequests.set(false);
      },
    });
  }

  private loadCollectors(): void {
    this.loadingCollectors.set(true);
    this.collectorsService
      .getCollectorsByProjectCommunity(this.data.projectCommunityId, 0, 200)
      .subscribe({
        next: (response) => {
          this.collectors.set(response.items ?? []);
          this.loadingCollectors.set(false);
        },
        error: (error) => {
          console.error('Error loading collectors:', error);
          this.collectors.set([]);
          this.loadingCollectors.set(false);
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    const value = this.form.value;

    const selectedCollectors = (this.form.get('selectedCollectors')?.value || []) as Collector[];
    const collectorIds = selectedCollectors
      .map((collector) => collector.projectCommunityCollectorId || collector.id)
      .filter((id): id is string => Boolean(id));

    const startDate = this.toDateString(value.startDate);
    const endDate = value.endDate ? this.toDateString(value.endDate) : '';

    if (this.isEditMode() && this.data.brigade) {
      const updatePayload = {
        name: value.name!.trim(),
        description: value.description?.trim() || '',
        status: value.status || '',
      };

      this.brigadesService.updateBrigade(this.data.brigade.id, updatePayload).subscribe({
        next: () => {
          this.notification.success('Brigada actualizada correctamente');
          this.submitting.set(false);
          this.dialogRef.close({ updated: true });
        },
        error: (error) => {
          console.error('Error actualizando brigada:', error);
          const errorMessage = error?.error?.message || 'Error al actualizar la brigada';
          this.notification.error(errorMessage);
          this.submitting.set(false);
        },
      });
      return;
    }

    if (this.isAddMembersMode() && this.data.brigade) {
      const payload = {
        collectorIds,
        startDate,
        endDate,
      };

      this.brigadesService.addMembers(this.data.brigade.id, payload).subscribe({
        next: () => {
          this.notification.success('Recolectores agregados correctamente');
          this.submitting.set(false);
          this.dialogRef.close({ membersAdded: true });
        },
        error: (error) => {
          console.error('Error agregando recolectores:', error);
          const errorMessage = error?.error?.message || 'Error al agregar recolectores';
          this.notification.error(errorMessage);
          this.submitting.set(false);
        },
      });
      return;
    }

    const payload: CreateBrigadeRequest = {
      projectCommunityId: this.data.projectCommunityId,
      name: value.name!.trim(),
      description: value.description?.trim() || undefined,
      collectionRequestId: value.collectionRequestId || null,
      collectorIds,
      startDate,
      endDate,
    };

    this.brigadesService.createBrigade(payload).subscribe({
      next: () => {
        this.notification.success('Brigada creada correctamente');
        this.submitting.set(false);
        this.dialogRef.close({ created: true });
      },
      error: (error) => {
        console.error('Error creando brigada:', error);
        const errorMessage = error?.error?.message || 'Error al crear la brigada';
        this.notification.error(errorMessage);
        this.submitting.set(false);
      },
    });
  }

  private toDateString(value?: Date | string | null): string {
    if (!value) {
      return '';
    }
    const date = parseDateValue(value);
    return formatDateISO(date);
  }
}
