import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { formatDate } from '@shared/utils/date-helpers';
import { CollectionRequest, CollectionRequestStatus } from '../models/collection-request.model';

@Component({
  selector: 'app-collection-request-detail-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './collection-request-detail-dialog.component.html',
  styleUrl: './collection-request-detail-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionRequestDetailDialogComponent {
  private dialogRef = inject(MatDialogRef<CollectionRequestDetailDialogComponent>);
  request = inject<CollectionRequest>(MAT_DIALOG_DATA);

  periodLabel = computed(() => {
    const start = this.request.startDate;
    const end = this.request.endDate;
    if (!start && !end) return '-';
    return `${formatDate(start)} - ${formatDate(end)}`;
  });

  requestedWeighingLabel = computed(() => {
    const value = this.request.requestedWeighing;
    if (value === null || value === undefined) return '-';
    return `${Number(value).toFixed(2)} kg`;
  });

  close(): void {
    this.dialogRef.close();
  }

  getStatusLabel(status: CollectionRequestStatus): string {
    const labels: Record<CollectionRequestStatus, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      observed: 'Observado',
      cancelled: 'Cancelado',
      expired: 'Expirado',
    };
    return labels[status] || status;
  }

  getStatusClass(status: CollectionRequestStatus): string {
    const classes: Record<CollectionRequestStatus, string> = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      observed: 'status-observed',
      cancelled: 'status-cancelled',
      expired: 'status-cancelled',
    };
    return classes[status] || '';
  }

  getStatusIcon(status: CollectionRequestStatus): string {
    const icons: Record<CollectionRequestStatus, string> = {
      pending: 'schedule',
      approved: 'check_circle',
      rejected: 'cancel',
      observed: 'error',
      cancelled: 'block',
      expired: 'block',
    };
    return icons[status] || 'help';
  }
}
