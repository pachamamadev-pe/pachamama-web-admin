import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { provideNativeDateAdapter } from '@angular/material/core';
import { concatMap, forkJoin, map, of } from 'rxjs';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectStage,
} from '../models/project.model';
import {
  TemplateDocumentType,
  TemplateRequirementsResponse,
  UploadDocumentRequest,
} from '../models/project-document.model';
import { ProductsService } from '../../products/services/products.service';
import { Product } from '../../products/models/product.model';
import { CommunitiesService } from '../../communities/services/communities.service';
import { Community } from '../../communities/models/community.model';
import { ProjectsService } from '../services/projects.service';
import { ProjectDocumentsService } from '../services/project-documents.service';
import { CommunityProjectLinkService } from '../services/community-project-link.service';
import { SidebarService } from '@core/services/sidebar.service';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { formatDateISO, parseDateValue } from '@shared/utils/date-helpers';

/** Stages cargadas para pre-requisitos del modo collection */
const COLLECTION_PREREQUISITE_STAGES = [
  'planning',
  'inventory',
  'pmf_development',
  'serfor_evaluation',
];

/** Etiquetas en español para las etapas */
const STAGE_LABELS: Record<string, string> = {
  planning: 'Planificación',
  inventory: 'Inventario',
  pmf_development: 'Elaboración de PMF',
  serfor_evaluation: 'Evaluación SERFOR',
};

interface DialogData {
  mode: 'create' | 'edit';
  project?: Project;
  currentCommunityId?: string;
}

@Component({
  selector: 'app-project-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatRadioModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <div class="dialog-container">
      <!-- ─── HEADER ─────────────────────────────────────────────── -->
      <div class="dialog-header">
        <h2 class="text-title font-bold text-accent-titles">{{ dialogTitle }}</h2>
        <button mat-icon-button (click)="onCancel()" type="button" [disabled]="loading()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- ─── LOADING / FORMS NOT READY ─────────────────────────── -->
      @if (loadingData() || !projectForm || !stageForm) {
        <div class="loading-container">
          <mat-spinner diameter="40" />
          <p class="text-body text-neutral-subheading mt-4">Cargando datos del formulario...</p>
        </div>

        <!-- ─── EDIT MODE (single step, original behavior) ────────── -->
      } @else if (isEditMode) {
        <form [formGroup]="$any(projectForm)" (ngSubmit)="onEditSubmit()">
          <div class="dialog-content">
            <ng-container *ngTemplateOutlet="projectFields; context: { form: projectForm }" />
          </div>
          <div class="dialog-actions">
            <button mat-stroked-button type="button" (click)="onCancel()" [disabled]="loading()">
              Cancelar
            </button>
            <button
              mat-raised-button
              class="btn-primary"
              type="submit"
              [disabled]="projectForm.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="20" />
              } @else {
                <span>Actualizar</span>
              }
            </button>
          </div>
        </form>

        <!-- ─── CREATE MODE (wizard) ───────────────────────────────── -->
      } @else {
        <mat-stepper linear #stepper class="project-stepper">
          <!-- STEP 1: Datos del proyecto ─────────────────────── -->
          <mat-step [stepControl]="$any(projectForm)" label="Datos del proyecto">
            <form [formGroup]="$any(projectForm)">
              <div class="dialog-content">
                <ng-container *ngTemplateOutlet="projectFields; context: { form: projectForm }" />
              </div>
              <div class="dialog-actions">
                <button
                  mat-stroked-button
                  type="button"
                  (click)="onCancel()"
                  [disabled]="loading()"
                >
                  Cancelar
                </button>
                <button
                  mat-raised-button
                  class="btn-primary"
                  type="button"
                  matStepperNext
                  [disabled]="projectForm.invalid"
                >
                  Siguiente
                  <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
              </div>
            </form>
          </mat-step>

          <!-- STEP 2: Etapa de inicio ─────────────────────────── -->
          <mat-step [stepControl]="$any(stageForm)" label="Etapa de inicio">
            <form [formGroup]="$any(stageForm)">
              <div class="dialog-content">
                <p class="text-body text-neutral-subheading mb-2">
                  Elige desde qué etapa comenzará el proyecto:
                </p>

                <mat-radio-group
                  formControlName="startStage"
                  class="stage-radio-group"
                  aria-label="Etapa de inicio del proyecto"
                >
                  <!-- Planning -->
                  <div
                    class="stage-option"
                    [class.stage-option--selected]="selectedStartStage() === 'planning'"
                    role="button"
                    tabindex="0"
                    (click)="$any(stageForm).get('startStage').setValue('planning')"
                    (keydown.enter)="$any(stageForm).get('startStage').setValue('planning')"
                    (keydown.space)="$any(stageForm).get('startStage').setValue('planning')"
                  >
                    <mat-radio-button value="planning" class="stage-radio">
                      <div class="stage-option-content">
                        <div class="stage-option-icon planning-icon">
                          <mat-icon>assignment</mat-icon>
                        </div>
                        <div class="stage-option-text">
                          <span class="font-semibold text-accent-titles">Planificación</span>
                          <span class="text-subtitle text-neutral-subheading">
                            El proyecto inicia activo en etapa de planificación. No requiere carga
                            de documentos previos.
                          </span>
                        </div>
                      </div>
                    </mat-radio-button>
                  </div>

                  <!-- Collection -->
                  <div
                    class="stage-option"
                    [class.stage-option--selected]="selectedStartStage() === 'collection'"
                    role="button"
                    tabindex="0"
                    (click)="$any(stageForm).get('startStage').setValue('collection')"
                    (keydown.enter)="$any(stageForm).get('startStage').setValue('collection')"
                    (keydown.space)="$any(stageForm).get('startStage').setValue('collection')"
                  >
                    <mat-radio-button value="collection" class="stage-radio">
                      <div class="stage-option-content">
                        <div class="stage-option-icon collection-icon">
                          <mat-icon>folder_open</mat-icon>
                        </div>
                        <div class="stage-option-text">
                          <span class="font-semibold text-accent-titles"
                            >Recolección (con documentos previos)</span
                          >
                          <span class="text-subtitle text-neutral-subheading">
                            El proyecto requiere la carga de documentos de las etapas anteriores
                            antes de activarse.
                          </span>
                        </div>
                      </div>
                    </mat-radio-button>
                  </div>
                </mat-radio-group>
              </div>

              <div class="dialog-actions">
                <button mat-stroked-button type="button" matStepperPrevious [disabled]="loading()">
                  <mat-icon>arrow_back</mat-icon>
                  Anterior
                </button>

                @if (selectedStartStage() === 'planning') {
                  <button
                    mat-raised-button
                    class="btn-primary"
                    type="button"
                    (click)="finalizeCreate()"
                    [disabled]="stageForm.invalid || loading()"
                  >
                    @if (loading()) {
                      <mat-spinner diameter="20" />
                    } @else {
                      Crear proyecto
                    }
                  </button>
                } @else {
                  <button
                    mat-raised-button
                    class="btn-primary"
                    type="button"
                    matStepperNext
                    [disabled]="stageForm.invalid"
                  >
                    Siguiente
                    <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                  </button>
                }
              </div>
            </form>
          </mat-step>

          <!-- STEP 3: Documentos previos (solo si collection) ─── -->
          <mat-step label="Documentos previos" [optional]="true">
            <div class="dialog-content docs-step-content">
              @if (loadingRequirements()) {
                <div class="loading-container">
                  <mat-spinner diameter="36" />
                  <p class="text-body text-neutral-subheading mt-3">
                    Cargando tipos de documentos...
                  </p>
                </div>
              } @else if (!templateRequirements()) {
                <div class="empty-requirements">
                  <mat-icon
                    class="text-neutral-subheading"
                    style="font-size:40px;width:40px;height:40px"
                    >description</mat-icon
                  >
                  <p class="text-body text-neutral-subheading mt-2">
                    No se pudieron cargar los tipos de documentos.
                  </p>
                  <button
                    mat-stroked-button
                    type="button"
                    (click)="loadTemplateRequirements()"
                    class="mt-3"
                  >
                    <mat-icon>refresh</mat-icon>
                    Reintentar
                  </button>
                </div>
              } @else {
                <p class="text-subtitle text-neutral-subheading mb-2">
                  Carga los documentos requeridos de las etapas anteriores para activar el proyecto.
                  Los opcionales pueden subirse ahora o más tarde.
                </p>

                <div class="docs-progress mb-3">
                  <span class="font-semibold">
                    {{ uploadedRequiredCount() }} / {{ requiredDocCount() }} obligatorios cargados
                  </span>
                  @if (optionalDocCount() > 0) {
                    <span class="text-neutral-subheading ml-2">
                      · {{ uploadedOptionalCount() }} / {{ optionalDocCount() }} opcionales
                    </span>
                  }
                </div>

                @for (stageGroup of docsByStage(); track stageGroup.stage) {
                  <div class="stage-group">
                    <h4 class="stage-group-title">{{ stageGroup.label }}</h4>
                    @for (docType of stageGroup.docs; track docTypeKey(docType)) {
                      <div
                        class="doc-item"
                        [class.doc-item--required]="docType.isRequired"
                        [class.doc-item--uploaded]="filesByDocTypeId().has(docTypeKey(docType))"
                      >
                        <div class="doc-item-info">
                          <div class="doc-item-header">
                            <span class="doc-item-name">{{ docType.name }}</span>
                            <span
                              class="doc-badge"
                              [class.doc-badge--required]="docType.isRequired"
                              [class.doc-badge--optional]="!docType.isRequired"
                              >{{ docType.isRequired ? 'Obligatorio' : 'Opcional' }}</span
                            >
                          </div>
                          <span class="doc-item-hint">
                            {{ formatMimeTypes(docType.allowedMimeTypes) }} &bull; máx.
                            {{ docType.maxFileSizeMb }} MB
                          </span>
                        </div>
                        <div class="doc-item-action">
                          @if (filesByDocTypeId().has(docTypeKey(docType))) {
                            <div class="doc-file-attached">
                              <mat-icon class="text-secondary">check_circle</mat-icon>
                              <span
                                class="doc-file-name"
                                [matTooltip]="getFileName(docTypeKey(docType))"
                              >
                                {{ getFileName(docTypeKey(docType)) | slice: 0 : 22
                                }}{{ getFileName(docTypeKey(docType)).length > 22 ? '…' : '' }}
                              </span>
                              <button
                                mat-icon-button
                                type="button"
                                class="remove-file-btn"
                                (click)="removeFile(docTypeKey(docType))"
                                matTooltip="Quitar archivo"
                              >
                                <mat-icon>close</mat-icon>
                              </button>
                            </div>
                          } @else {
                            <button
                              mat-stroked-button
                              type="button"
                              class="attach-btn"
                              (click)="onSelectFile(docType)"
                            >
                              <mat-icon>attach_file</mat-icon>
                              Adjuntar
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>

            <div class="dialog-actions">
              <button mat-stroked-button type="button" matStepperPrevious [disabled]="loading()">
                <mat-icon>arrow_back</mat-icon>
                Anterior
              </button>
              <button
                mat-raised-button
                class="btn-primary"
                type="button"
                (click)="finalizeCreate()"
                [disabled]="!isReadyToFinish() || loading() || loadingRequirements()"
              >
                @if (loading()) {
                  <mat-spinner diameter="20" />
                } @else {
                  Finalizar y crear
                }
              </button>
            </div>
          </mat-step>
        </mat-stepper>
      }
    </div>

    <!-- ─── SHARED FORM FIELDS TEMPLATE ───────────────────────────── -->
    <!-- form is passed via ngTemplateOutlet context to guarantee ControlContainer is always present -->
    <ng-template #projectFields let-form="form">
      <div [formGroup]="$any(form)" class="fields-wrapper">
        <!-- Nombre del proyecto -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nombre del proyecto</mat-label>
          <input
            matInput
            formControlName="name"
            placeholder="Ej: Proyecto Café Orgánico 2025"
            maxlength="100"
            required
          />
          @if (hasError('name', 'required')) {
            <mat-error>El nombre es obligatorio</mat-error>
          }
          @if (hasError('name', 'minlength')) {
            <mat-error>El nombre debe tener al menos 3 caracteres</mat-error>
          }
        </mat-form-field>

        <!-- Producto -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Producto</mat-label>
          <mat-select formControlName="productId" required>
            <mat-option value="">Seleccionar producto</mat-option>
            @for (product of products(); track product.id) {
              <mat-option [value]="product.id">{{ product.name }}</mat-option>
            }
          </mat-select>
          @if (hasError('productId', 'required')) {
            <mat-error>El producto es obligatorio</mat-error>
          }
        </mat-form-field>

        <!-- Comunidad -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Comunidad</mat-label>
          <mat-select formControlName="communityId" required>
            <mat-option value="">Seleccionar comunidad</mat-option>
            @for (community of communities(); track community.id) {
              <mat-option [value]="community.id">{{ community.name }}</mat-option>
            }
          </mat-select>
          @if (hasError('communityId', 'required')) {
            <mat-error>La comunidad es obligatoria</mat-error>
          }
          <mat-hint>La comunidad será vinculada a este proyecto</mat-hint>
        </mat-form-field>

        <!-- Descripción -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Descripción</mat-label>
          <textarea
            matInput
            formControlName="description"
            placeholder="Descripción del proyecto..."
            rows="3"
            maxlength="500"
          ></textarea>
          <mat-hint align="end">Opcional</mat-hint>
        </mat-form-field>

        <!-- Cuota aprobada y Máximo de recolectores -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Cuota aprobada de recolección</mat-label>
            <input
              matInput
              type="number"
              formControlName="approvedQuota"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
            <span matTextSuffix class="ml-2 text-neutral-subheading">{{ productUnit }}</span>
            @if (hasError('approvedQuota', 'required')) {
              <mat-error>La cuota es obligatoria</mat-error>
            }
            @if (hasError('approvedQuota', 'min')) {
              <mat-error>La cuota debe ser mayor a 0</mat-error>
            }
            <mat-hint>Máximo a recolectar en {{ productUnit }}</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Máximo de recolectores</mat-label>
            <input
              matInput
              type="number"
              formControlName="maxCollectors"
              placeholder="0"
              min="1"
              step="1"
              required
            />
            <span matTextSuffix class="ml-2 text-neutral-subheading">personas</span>
            @if (hasError('maxCollectors', 'required')) {
              <mat-error>El máximo es obligatorio</mat-error>
            }
            @if (hasError('maxCollectors', 'min')) {
              <mat-error>Debe ser al menos 1 recolector</mat-error>
            }
            <mat-hint>N° máximo de participantes</mat-hint>
          </mat-form-field>
        </div>

        <!-- Fechas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Fecha de fin</mat-label>
            <input
              matInput
              [matDatepicker]="endPicker"
              formControlName="endDate"
              placeholder="DD/MM/AAAA"
            />
            <mat-datepicker-toggle matIconSuffix [for]="endPicker" />
            <mat-datepicker #endPicker />
          </mat-form-field>
        </div>
      </div>
      <!-- /fields-wrapper -->
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }

    /* ── Container ─────────────────────────────── */
    .dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      min-width: 420px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px;
      border-bottom: 1px solid #e5e5e5;
      flex-shrink: 0;
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e5e5e5;
      flex-shrink: 0;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
    }

    /* ── Stepper overrides ───────────────────── */
    .project-stepper {
      background: transparent;
    }

    ::ng-deep .project-stepper .mat-stepper-header-container {
      padding: 0 16px;
      border-bottom: 1px solid #e5e5e5;
    }

    ::ng-deep .project-stepper .mat-step-header .mat-step-icon-selected,
    ::ng-deep .project-stepper .mat-step-header .mat-step-icon-state-done {
      background-color: #218358;
    }

    ::ng-deep .project-stepper .mat-horizontal-content-container {
      padding: 0;
    }

    /* ── Stage radio group ───────────────────── */
    .stage-radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .stage-option {
      display: block;
      border: 2px solid #e5e5e5;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition:
        border-color 0.2s,
        background-color 0.2s;
    }

    .stage-option:hover {
      border-color: #218358;
      background-color: #f4fbf6;
    }

    .stage-option--selected {
      border-color: #218358;
      background-color: #f4fbf6;
    }

    .stage-radio {
      width: 100%;
    }

    .stage-option-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-left: 4px;
    }

    .stage-option-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .planning-icon {
      background-color: #dbeafe;
      color: #1d4ed8;
    }

    .collection-icon {
      background-color: #dcfce7;
      color: #15803d;
    }

    .stage-option-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 14px;
    }

    /* ── Documents step ──────────────────────── */
    .fields-wrapper {
      display: contents; /* transparent to flex layout; [formGroup] still binds in DOM */
    }

    .docs-step-content {
      max-height: 420px;
    }

    .docs-progress {
      background-color: #f4fbf6;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      color: #15803d;
    }

    .stage-group {
      margin-bottom: 20px;
    }

    .stage-group-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #737373;
      margin: 0 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e5e5e5;
    }

    .doc-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      margin-bottom: 6px;
      gap: 12px;
      transition: border-color 0.2s;
    }

    .doc-item--uploaded {
      border-color: #86efac;
      background-color: #f0fdf4;
    }

    .doc-item-info {
      flex: 1;
      min-width: 0;
    }

    .doc-item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .doc-item-name {
      font-size: 14px;
      font-weight: 500;
      color: #0a0a0a;
    }

    .doc-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 99px;
    }

    .doc-badge--required {
      background-color: #fee2e2;
      color: #b91c1c;
    }

    .doc-badge--optional {
      background-color: #f3f4f6;
      color: #6b7280;
    }

    .doc-item-hint {
      font-size: 11px;
      color: #737373;
      margin-top: 3px;
      display: block;
    }

    .doc-item-action {
      flex-shrink: 0;
    }

    .attach-btn {
      font-size: 13px;
      height: 34px;
      line-height: 34px;
    }

    .doc-file-attached {
      display: flex;
      align-items: center;
      gap: 4px;
      max-width: 200px;
    }

    .doc-file-name {
      font-size: 12px;
      color: #15803d;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      max-width: 130px;
    }

    .remove-file-btn {
      width: 28px !important;
      height: 28px !important;
      line-height: 28px !important;
    }

    .remove-file-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
    }

    .empty-requirements {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      gap: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFormComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<ProjectFormComponent>);
  private fb = inject(FormBuilder);
  private productsService = inject(ProductsService);
  private communitiesService = inject(CommunitiesService);
  private projectsService = inject(ProjectsService);
  private projectDocumentsService = inject(ProjectDocumentsService);
  private communityProjectLinkService = inject(CommunityProjectLinkService);
  private sidebarService = inject(SidebarService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);

  readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  projectForm: FormGroup | null = null;
  stageForm: FormGroup | null = null;

  // ── Signals ─────────────────────────────────────────────────────────
  loading = signal(false);
  loadingData = signal(true);
  loadingRequirements = signal(false);

  products = signal<Product[]>([]);
  communities = signal<Community[]>([]);

  // Wizard state (create mode)
  selectedStartStage = signal<'planning' | 'collection'>('planning');
  templateRequirements = signal<TemplateRequirementsResponse | null>(null);
  filesByDocTypeId = signal<Map<string, File>>(new Map());

  // ── Computed ─────────────────────────────────────────────────────────

  allDocTypes = computed(() => this.templateRequirements()?.documentTypes ?? []);

  requiredDocCount = computed(() => this.allDocTypes().filter((d) => d.isRequired).length);
  optionalDocCount = computed(() => this.allDocTypes().filter((d) => !d.isRequired).length);

  uploadedRequiredCount = computed(
    () =>
      this.allDocTypes().filter(
        (d) => d.isRequired && this.filesByDocTypeId().has(this.docTypeKey(d)),
      ).length,
  );
  uploadedOptionalCount = computed(
    () =>
      this.allDocTypes().filter(
        (d) => !d.isRequired && this.filesByDocTypeId().has(this.docTypeKey(d)),
      ).length,
  );

  /** El botón "Finalizar" se habilita solo cuando TODOS los obligatorios tienen archivo adjunto */
  isReadyToFinish = computed(() => {
    if (this.selectedStartStage() !== 'collection') return true;
    const requirements = this.templateRequirements();
    if (!requirements) return false;
    const requiredDocs = requirements.documentTypes.filter((d) => d.isRequired);
    return requiredDocs.every((d) => this.filesByDocTypeId().has(this.docTypeKey(d)));
  });

  /** Documentos agrupados por etapa para el step 3 */
  docsByStage = computed(() => {
    const docs = this.allDocTypes();
    const stagesOrder = COLLECTION_PREREQUISITE_STAGES;
    const grouped = stagesOrder.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      docs: docs.filter((d) => d.requiredForStages?.includes(stage as ProjectStage)),
    }));
    const filtered = grouped.filter((g) => g.docs.length > 0);
    const assignedIds = new Set(filtered.flatMap((g) => g.docs.map((d) => this.docTypeKey(d))));
    const unassigned = docs.filter((d) => !assignedIds.has(this.docTypeKey(d)));
    if (unassigned.length > 0) {
      filtered.push({ stage: 'other', label: 'Otros documentos', docs: unassigned });
    }
    return filtered;
  });

  // ── Getters ──────────────────────────────────────────────────────────

  get selectedProduct(): Product | undefined {
    const productId = this.projectForm?.get('productId')?.value;
    return this.products().find((p) => p.id === productId);
  }

  get productUnit(): string {
    return this.selectedProduct?.unit || 'kg';
  }

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  get dialogTitle(): string {
    return this.isEditMode ? 'Editar proyecto' : 'Crear nuevo proyecto';
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.initializeForm(); // Must run first so forms exist before any template render
    this.loadData();

    if (!this.isEditMode) {
      this.setupStageChangeSubscription();
    }
  }

  // ── Private initialization ───────────────────────────────────────────

  private loadData(): void {
    this.loadingData.set(true);

    Promise.all([
      this.productsService.getProducts({ page: 0, size: 100 }).toPromise(),
      this.communitiesService.getCommunities().toPromise(),
    ])
      .then(([productsResponse, communities]) => {
        this.products.set(productsResponse?.items || []);
        this.communities.set(communities || []);
        this.loadingData.set(false);
      })
      .catch((error) => {
        console.error('Error loading form data:', error);
        this.products.set([]);
        this.communities.set([]);
        this.loadingData.set(false);
      });
  }

  private initializeForm(): void {
    const project = this.data.project;

    this.projectForm = this.fb.group({
      name: [project?.name || '', [Validators.required, Validators.minLength(3)]],
      productId: [project?.productId || '', Validators.required],
      communityId: [
        this.data.currentCommunityId || project?.communityLink?.communityId || '',
        Validators.required,
      ],
      description: [project?.description || ''],
      approvedQuota: [project?.approvedQuota || null, [Validators.required, Validators.min(0.01)]],
      maxCollectors: [project?.maxCollectors || null, [Validators.required, Validators.min(1)]],
      startDate: [
        project?.startDate ? parseDateValue(project.startDate) : null,
        Validators.required,
      ],
      endDate: [project?.endDate ? parseDateValue(project.endDate) : null, Validators.required],
    });

    this.stageForm = this.fb.group({
      startStage: ['planning', Validators.required],
    });
  }

  private setupStageChangeSubscription(): void {
    this.stageForm
      ?.get('startStage')
      ?.valueChanges.subscribe((stage: 'planning' | 'collection') => {
        this.selectedStartStage.set(stage);
        // Preload requirements as soon as collection is selected
        if (stage === 'collection' && !this.templateRequirements() && !this.loadingRequirements()) {
          this.loadTemplateRequirements();
        }
      });
  }

  // ── Public methods – documents ────────────────────────────────────────

  loadTemplateRequirements(): void {
    this.loadingRequirements.set(true);
    this.projectDocumentsService.getTemplateRequirements(COLLECTION_PREREQUISITE_STAGES).subscribe({
      next: (response) => {
        this.templateRequirements.set(response);
        this.loadingRequirements.set(false);
      },
      error: (error) => {
        console.error('Error loading template requirements:', error);
        this.notification.error('No se pudieron cargar los tipos de documentos requeridos');
        this.loadingRequirements.set(false);
      },
    });
  }

  /** Clave única para usar en el Map y en el @for track. Usa documentTypeId; si viene vacío, usa code como fallback. */
  docTypeKey(docType: TemplateDocumentType): string {
    return docType.documentTypeId || docType.code;
  }

  onSelectFile(docType: TemplateDocumentType): void {
    const key = this.docTypeKey(docType);
    if (!key) {
      console.error('TemplateDocumentType sin documentTypeId ni code:', docType);
      this.notification.error('No se puede adjuntar: el tipo de documento no tiene identificador.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = docType.allowedMimeTypes.join(',');

    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate MIME type
      if (docType.allowedMimeTypes.length > 0 && !docType.allowedMimeTypes.includes(file.type)) {
        this.notification.error(
          `Tipo de archivo no permitido. Formatos aceptados: ${this.formatMimeTypes(docType.allowedMimeTypes)}`,
        );
        return;
      }

      // Validate size
      const maxBytes = docType.maxFileSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        this.notification.error(
          `El archivo supera el tamaño máximo permitido de ${docType.maxFileSizeMb} MB`,
        );
        return;
      }

      const updated = new Map(this.filesByDocTypeId());
      updated.set(key, file);
      this.filesByDocTypeId.set(updated);
    };

    input.click();
  }

  removeFile(docTypeId: string): void {
    const updated = new Map(this.filesByDocTypeId());
    updated.delete(docTypeId);
    this.filesByDocTypeId.set(updated);
  }

  getFileName(docTypeId: string): string {
    return this.filesByDocTypeId().get(docTypeId)?.name ?? '';
  }

  formatMimeTypes(mimeTypes: string[]): string {
    if (!mimeTypes.length) return 'Todos los formatos';
    return mimeTypes
      .map((m) => {
        const ext = m.split('/')[1];
        if (ext === 'vnd.openxmlformats-officedocument.wordprocessingml.document') return 'DOCX';
        if (ext === 'vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'XLSX';
        if (ext === 'vnd.ms-excel') return 'XLS';
        if (ext === 'msword') return 'DOC';
        return ext?.toUpperCase() ?? m;
      })
      .join(', ');
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.projectForm?.get(controlName);
    return !!(control?.hasError(errorName) && (control?.dirty || control?.touched));
  }

  // ── Mode: Edit (comportamiento original preservado) ───────────────────

  onEditSubmit(): void {
    if (this.projectForm?.valid && !this.loading()) {
      this.loading.set(true);

      const formValue = this.projectForm!.value;

      const updateData: UpdateProjectRequest = {
        name: formValue.name,
        productId: formValue.productId,
        description: formValue.description || undefined,
        approvedQuota: formValue.approvedQuota,
        maxCollectors: formValue.maxCollectors,
        startDate: this.toIsoDate(formValue.startDate),
        endDate: this.toIsoDate(formValue.endDate),
      };

      this.dialogRef.close({
        mode: 'edit',
        data: updateData,
        communityId: formValue.communityId,
        originalCommunityId:
          this.data.currentCommunityId || this.data.project?.communityLink?.communityId,
      });
    }
  }

  // ── Mode: Create (wizard – ejecuta endpoints de forma autónoma) ────────

  /**
   * Secuencia completa de creación:
   * A) Crear proyecto → B) Vincular comunidad →
   * C) Subir documentos + activar (si collection) → D) Cerrar modal con { success, projectId }
   */
  finalizeCreate(): void {
    if (this.loading() || !this.projectForm) return;

    const companyId = this.sidebarService.tenantId();
    if (!companyId) {
      this.notification.error('No se pudo obtener el ID de la empresa. Recarga la página.');
      return;
    }

    this.loading.set(true);

    const formValue = this.projectForm!.value;
    const startStage = this.selectedStartStage();

    const createData: CreateProjectRequest = {
      name: formValue.name,
      productId: formValue.productId,
      companyId,
      description: formValue.description || undefined,
      approvedQuota: formValue.approvedQuota,
      maxCollectors: formValue.maxCollectors,
      startDate: this.toIsoDate(formValue.startDate),
      endDate: this.toIsoDate(formValue.endDate),
      code: '',
      initialStage: startStage === 'collection' ? 'collection' : 'planning',
      initialStatus: startStage === 'collection' ? 'inactive' : 'active',
    };

    const communityId: string = formValue.communityId;

    // ── A) Crear proyecto ────────────────────────────────────────────
    this.projectsService
      .createProject(createData)
      .pipe(
        // ── B) Vincular comunidad ──────────────────────────────────
        concatMap((project) =>
          this.communityProjectLinkService
            .createLink({ communityId, projectId: project.id })
            .pipe(map(() => project)),
        ),

        // ── C) Subir documentos y activar (solo si collection) ─────
        concatMap((project) => {
          if (startStage !== 'collection') {
            return of(project);
          }

          const requirements = this.templateRequirements();
          if (!requirements || requirements.documentTypes.length === 0) {
            return this.projectsService.activateProject(project.id).pipe(map(() => project));
          }

          // Subir todos los archivos adjuntados (obligatorios + opcionales que el usuario cargó)
          const uploadsToPerform = requirements.documentTypes
            .filter((dt) => this.filesByDocTypeId().has(this.docTypeKey(dt)))
            .map((dt) => {
              const file = this.filesByDocTypeId().get(this.docTypeKey(dt))!;
              const projectStage: ProjectStage =
                (dt.requiredForStages?.[0] as ProjectStage) ?? ProjectStage.PLANNING;
              const request: UploadDocumentRequest = {
                documentTypeId: dt.documentTypeId,
                projectStage,
              };
              return this.projectDocumentsService.uploadDocument(project.id, request, file);
            });

          if (uploadsToPerform.length === 0) {
            return this.projectsService.activateProject(project.id).pipe(map(() => project));
          }

          // Subir en paralelo; si todos OK → activar proyecto
          return forkJoin(uploadsToPerform).pipe(
            concatMap(() => this.projectsService.activateProject(project.id)),
            map(() => project),
          );
        }),
      )
      .subscribe({
        next: (project) => {
          this.loading.set(false);
          this.notification.success('Proyecto creado correctamente');
          this.dialogRef.close({ success: true, projectId: project.id });
        },
        error: (error) => {
          console.error('Error al crear el proyecto:', error);
          this.loading.set(false);
          this.notification.error(
            'Ocurrió un error al crear el proyecto. Revisa los datos e inténtalo de nuevo.',
          );
          // No cerramos el modal — el usuario puede reintentar manteniendo datos y archivos
        },
      });
  }

  // ── Cancel / exit ─────────────────────────────────────────────────────

  onCancel(): void {
    if (this.loading()) return;

    const hasChanges = this.isEditMode
      ? (this.projectForm?.dirty ?? false)
      : (this.projectForm?.dirty ?? false) ||
        (this.stageForm?.dirty ?? false) ||
        this.filesByDocTypeId().size > 0;

    if (!hasChanges) {
      this.dialogRef.close();
      return;
    }

    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '¿Descartar cambios?',
        message: 'Si sales, perderás todos los cambios y archivos cargados.',
        confirmText: 'Salir sin guardar',
        cancelText: 'Continuar editando',
        type: 'warning',
      },
    });

    confirmRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.dialogRef.close();
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private toIsoDate(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    return formatDateISO(date);
  }
}
