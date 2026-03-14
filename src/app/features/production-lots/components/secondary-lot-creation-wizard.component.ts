import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogRef } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { SidebarService } from '@core/services/sidebar.service';
import { NotificationService } from '@core/services/notification.service';
import { ProductionLotsService } from '../../projects/services/production-lots.service';
import {
  PrimaryLotAvailable,
  SourceLotEntry,
  CreateSecondaryLotMultiRequest,
} from '../models/production-lot-search.model';
import { TransportInfoRequest } from '../../collection-batches/models/collection-batch.model';
import {
  TransportType,
  PRODUCTION_LOT_STATUS_LABELS,
} from '../../projects/models/production-lot.model';

export interface SecondaryLotWizardResult {
  created: boolean;
}

@Component({
  selector: 'app-secondary-lot-creation-wizard',
  templateUrl: './secondary-lot-creation-wizard.component.html',
  styleUrl: './secondary-lot-creation-wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTooltipModule,
    GoogleMap,
    MapMarker,
  ],
})
export class SecondaryLotCreationWizardComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<SecondaryLotCreationWizardComponent>);
  private lotsService = inject(ProductionLotsService);
  private sidebarService = inject(SidebarService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  private readonly searchSubject = new Subject<string>();

  // ── Step management ────────────────────────────────────────────────────────
  currentStep = signal<1 | 2 | 3>(1);
  saving = signal(false);

  // ── Step 1: Available lot list + selection ─────────────────────────────────
  loadingLots = signal(true);
  availableLots = signal<PrimaryLotAvailable[]>([]);
  totalLots = signal(0);
  currentPage = signal(0);
  pageSize = signal(10);
  searchTerm = signal('');
  selectedLotIds = signal<Set<string>>(new Set());

  /** Cache de objetos de lote seleccionados (se mantiene entre páginas) */
  private readonly lotObjectCache = new Map<string, PrimaryLotAvailable>();

  /** Lista reactiva de todos los lotes seleccionados (extrae del cache via selectedLotIds) */
  allSelectedLots = computed(() => {
    const ids = this.selectedLotIds();
    return Array.from(ids)
      .map((id) => this.lotObjectCache.get(id)!)
      .filter(Boolean);
  });

  filteredAvailableLots = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.availableLots();
    return this.availableLots().filter(
      (l) =>
        l.lotNumber.toLowerCase().includes(term) ||
        (l.derivedCompanyName ?? '').toLowerCase().includes(term),
    );
  });

  // ── Step 2: Per-lot contribution forms + summary ───────────────────────────
  lotForms: Record<string, FormGroup> = {};
  expandedLotId = signal<string | null>(null);
  contributionTotals = signal({ weight: 0, sacks: 0, jabas: 0 });

  summaryForm = this.fb.group({
    quantity: [null as number | null, [Validators.min(0.01)]],
    totalSacksCount: [null as number | null, [Validators.min(1)]],
    totalJabasCount: [null as number | null, [Validators.min(1)]],
    transformationNotes: [null as string | null, [Validators.maxLength(1000)]],
  });

  // ── Step 3: Transport form ─────────────────────────────────────────────────
  selectedTransportType = signal<'terrestre' | 'fluvial'>('terrestre');

  readonly transportTypes: { value: TransportType; label: string }[] = [
    { value: 'terrestre', label: 'Terrestre' },
    { value: 'fluvial', label: 'Fluvial' },
  ];

  readonly documentTypes = ['DNI', 'CE', 'PASAPORTE', 'RUC'];

  transportForm = this.fb.group({
    transportType: ['terrestre' as TransportType, Validators.required],
    transporterName: ['', [Validators.required, Validators.maxLength(200)]],
    transporterDocumentType: ['DNI', Validators.required],
    transporterDocumentNumber: ['', [Validators.required, Validators.maxLength(20)]],
    originLocation: ['', [Validators.required, Validators.maxLength(200)]],
    destinationLocation: ['', [Validators.required, Validators.maxLength(200)]],
  });

  // ── Step 3: Geolocation
  geoStatus = signal<'idle' | 'detecting' | 'success' | 'error'>('idle');
  geoCoords = signal<{ latitude: number; longitude: number } | null>(null);
  geoAccuracy = signal<number | null>(null);
  geoError = signal('');
  geoExpanded = signal(true);

  // Google Maps
  readonly defaultCenter: google.maps.LatLngLiteral = { lat: -9.19, lng: -75.0152 };
  mapCenter = signal<google.maps.LatLngLiteral>(this.defaultCenter);
  markerPosition = signal<google.maps.LatLngLiteral | null>(null);
  mapZoom = signal(5);
  readonly mapOptions: google.maps.MapOptions = {
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true,
    clickableIcons: false,
    styles: [
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ],
  };
  readonly markerOptions: google.maps.MarkerOptions = {
    draggable: true,
    animation: google.maps.Animation.DROP,
    icon: {
      url:
        'data:image/svg+xml;charset=UTF-8,' +
        encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
          <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 30 18 30S36 31.5 36 18C36 8.059 27.941 0 18 0z" fill="#218358"/>
          <circle cx="18" cy="18" r="8" fill="white"/>
          <circle cx="18" cy="18" r="4" fill="#218358"/>
        </svg>
      `),
      anchor: new google.maps.Point(18, 48),
      scaledSize: new google.maps.Size(36, 48),
    },
  };

  readonly STATUS_LABELS = PRODUCTION_LOT_STATUS_LABELS;

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadAvailableLots();

    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.currentPage.set(0);
        this.loadAvailableLots();
      });
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  loadAvailableLots(): void {
    const companyId = this.sidebarService.tenantId();
    if (!companyId) {
      this.notification.error('No se pudo identificar la empresa activa');
      this.loadingLots.set(false);
      return;
    }

    this.loadingLots.set(true);
    this.lotsService
      .getAvailablePrimaryLots(companyId, this.currentPage(), this.pageSize())
      .subscribe({
        next: (res) => {
          this.availableLots.set(res.items ?? []);
          this.totalLots.set(res.total ?? 0);
          this.loadingLots.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.notification.error('Error al cargar los lotes primarios disponibles');
          this.availableLots.set([]);
          this.loadingLots.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadAvailableLots();
  }

  // ── Step 1 interactions ────────────────────────────────────────────────────

  toggleLot(lot: PrimaryLotAvailable): void {
    const ids = new Set(this.selectedLotIds());
    if (ids.has(lot.id)) {
      ids.delete(lot.id);
      this.lotObjectCache.delete(lot.id);
    } else {
      ids.add(lot.id);
      this.lotObjectCache.set(lot.id, lot);
    }
    this.selectedLotIds.set(ids);
  }

  isSelected(id: string): boolean {
    return this.selectedLotIds().has(id);
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.searchSubject.next(term);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
  }

  goToStep2(): void {
    if (this.selectedLotIds().size === 0) {
      this.notification.warning('Debes seleccionar al menos un lote primario');
      return;
    }
    this.buildContributionForms();
    this.currentStep.set(2);
  }

  // ── Step 2 interactions ────────────────────────────────────────────────────

  private buildContributionForms(): void {
    for (const lot of this.allSelectedLots()) {
      if (!this.lotForms[lot.id]) {
        const form = this.fb.group({
          contributedWeightKg: [lot.quantity, [Validators.min(0)]],
          contributedSacksCount: [lot.totalSacksCount, [Validators.min(0)]],
          contributedJabasCount: [lot.totalJabasCount, [Validators.min(0)]],
        });
        form.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.recalcTotals());
        this.lotForms[lot.id] = form;
      }
    }
    this.recalcTotals();
  }

  private recalcTotals(): void {
    let weight = 0,
      sacks = 0,
      jabas = 0;
    for (const lot of this.allSelectedLots()) {
      const v = this.lotForms[lot.id]?.getRawValue() ?? {};
      weight += Number(v['contributedWeightKg'] ?? 0);
      sacks += Number(v['contributedSacksCount'] ?? 0);
      jabas += Number(v['contributedJabasCount'] ?? 0);
    }
    this.contributionTotals.set({ weight, sacks, jabas });
    this.cdr.markForCheck();
  }

  toggleLotExpansion(id: string): void {
    this.expandedLotId.update((current) => (current === id ? null : id));
  }

  getLotForm(id: string): FormGroup {
    return this.lotForms[id];
  }

  goBackToStep1(): void {
    this.currentStep.set(1);
  }

  goToStep3(): void {
    this.currentStep.set(3);
    if (this.geoCoords() === null) {
      this.detectLocation();
    }
  }

  goBackToStep2(): void {
    this.currentStep.set(2);
  }

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  onTransportTypeChange(value: 'terrestre' | 'fluvial'): void {
    this.selectedTransportType.set(value);
  }

  // ── Final submission ───────────────────────────────────────────────────────

  createSecondaryLot(): void {
    this.transportForm.markAllAsTouched();
    if (this.transportForm.invalid || this.saving()) return;

    const transport = this.transportForm.getRawValue();
    const summary = this.summaryForm.getRawValue();

    const sourceLots: SourceLotEntry[] = this.allSelectedLots().map((lot) => {
      const v = this.lotForms[lot.id]?.getRawValue() ?? {};
      return {
        sourcePrimaryLotId: lot.id,
        contributedWeightKg:
          v['contributedWeightKg'] != null ? Number(v['contributedWeightKg']) : null,
        contributedSacksCount:
          v['contributedSacksCount'] != null ? Number(v['contributedSacksCount']) : null,
        contributedJabasCount:
          v['contributedJabasCount'] != null ? Number(v['contributedJabasCount']) : null,
      };
    });

    const transportInfo: TransportInfoRequest = {
      transportType: transport['transportType'] as TransportType,
      transporterName: (transport['transporterName'] ?? '').trim(),
      transporterDocumentType: (transport['transporterDocumentType'] ?? '').trim(),
      transporterDocumentNumber: (transport['transporterDocumentNumber'] ?? '').trim(),
      originLocation: (transport['originLocation'] ?? '').trim(),
      destinationLocation: (transport['destinationLocation'] ?? '').trim(),
    };

    const request: CreateSecondaryLotMultiRequest = {
      sourceLots,
      quantity: summary['quantity'] ? Number(summary['quantity']) : null,
      totalSacksCount: summary['totalSacksCount'] ? Number(summary['totalSacksCount']) : null,
      totalJabasCount: summary['totalJabasCount'] ? Number(summary['totalJabasCount']) : null,
      transformationNotes: (summary['transformationNotes'] as string)?.trim() || null,
      transportInfo,
      location: this.geoCoords() ?? undefined,
    };

    this.saving.set(true);
    this.lotsService.createSecondaryLotMulti(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.notification.success('Lote de transformación secundaria creado correctamente');
        this.dialogRef.close({ created: true } satisfies SecondaryLotWizardResult);
      },
      error: (error: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.notification.error(
          error?.error?.message ?? 'Error al crear el lote de transformación secundaria',
        );
      },
    });
  }

  // ── Geolocation

  detectLocation(): void {
    if (!navigator.geolocation) {
      this.geoStatus.set('error');
      this.geoError.set(
        'Tu dispositivo no soporta geolocalización. Mueve el marcador en el mapa para seleccionar tu ubicación.',
      );
      return;
    }
    this.geoStatus.set('detecting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        const latlng = { lat: coords.latitude, lng: coords.longitude };
        this.geoCoords.set(coords);
        this.geoAccuracy.set(Math.round(position.coords.accuracy));
        this.mapCenter.set(latlng);
        this.markerPosition.set(latlng);
        this.mapZoom.set(16);
        this.geoStatus.set('success');
        this.geoExpanded.set(false);
        this.cdr.markForCheck();
      },
      (error) => {
        let msg = 'No se pudo detectar tu ubicación automáticamente.';
        if (error.code === 1) {
          msg = 'Permiso denegado. Mueve el marcador en el mapa para indicar dónde estás.';
        } else if (error.code === 3) {
          msg = 'Tiempo de espera agotado. Mueve el marcador en el mapa para indicar tu ubicación.';
        }
        this.geoError.set(msg);
        const lima = { lat: -12.0464, lng: -77.0428 };
        this.mapCenter.set(lima);
        this.markerPosition.set(lima);
        this.mapZoom.set(6);
        this.geoCoords.set({ latitude: lima.lat, longitude: lima.lng });
        this.geoStatus.set('error');
        this.cdr.markForCheck();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  onMarkerDragEnd(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    this.geoCoords.set({ latitude: lat, longitude: lng });
    this.markerPosition.set({ lat, lng });
    this.geoAccuracy.set(null);
    this.geoStatus.set('success');
  }

  onMapClick(event: google.maps.MapMouseEvent): void {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    this.geoCoords.set({ latitude: lat, longitude: lng });
    this.markerPosition.set({ lat, lng });
    this.mapCenter.set({ lat, lng });
    this.geoAccuracy.set(null);
    this.geoStatus.set('success');
  }

  toggleGeoPanel(): void {
    if (this.geoCoords()) {
      this.geoExpanded.update((v) => !v);
    }
  }

  close(): void {
    this.dialogRef.close(null);
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
      return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
}
