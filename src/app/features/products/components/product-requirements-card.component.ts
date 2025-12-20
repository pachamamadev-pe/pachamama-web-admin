import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  OnChanges,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ProductProtocol } from '../models/product-protocol.model';
import { OPERATOR_LABELS } from '../models/domain-attribute.model';
import { AuthService } from '@core/auth/auth.service';

/**
 * Componente para mostrar y gestionar los requerimientos mínimos del árbol (protocolos)
 * Muestra los protocolos de recolección del producto
 * Permite crear, editar, eliminar y reordenar protocolos (solo ADMIN_PACHAMAMA)
 */
@Component({
  selector: 'app-product-requirements-card',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatChipsModule,
    DragDropModule,
  ],
  templateUrl: './product-requirements-card.component.html',
  styleUrl: './product-requirements-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductRequirementsCardComponent implements OnInit, OnChanges {
  private authService = inject(AuthService);

  // Inputs
  protocols = input.required<ProductProtocol[]>();
  productId = input.required<string>();

  // Outputs
  createProtocol = output<void>();
  editProtocol = output<ProductProtocol>();
  deleteProtocol = output<ProductProtocol>();
  reorderProtocols = output<string[]>();

  // State
  isAdmin = signal(false);
  localProtocols = signal<ProductProtocol[]>([]);

  // Computed
  hasProtocols = computed(() => this.protocols().length > 0);

  ngOnInit(): void {
    this.checkAdminStatus();
    this.localProtocols.set([...this.protocols()]);
  }

  ngOnChanges(): void {
    this.localProtocols.set([...this.protocols()]);
  }

  private async checkAdminStatus(): Promise<void> {
    const isAdmin = await this.authService.isAdminPachamama();
    this.isAdmin.set(isAdmin);
  }

  onCreateProtocol(): void {
    this.createProtocol.emit();
  }

  onEditProtocol(protocol: ProductProtocol): void {
    this.editProtocol.emit(protocol);
  }

  onDeleteProtocol(protocol: ProductProtocol): void {
    this.deleteProtocol.emit(protocol);
  }

  onDrop(event: CdkDragDrop<ProductProtocol[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const protocols = [...this.localProtocols()];
    moveItemInArray(protocols, event.previousIndex, event.currentIndex);
    this.localProtocols.set(protocols);

    // Emit new order
    const protocolIds = protocols.map((p) => p.id);
    this.reorderProtocols.emit(protocolIds);
  }

  getOperatorLabel(operator: string): string {
    return OPERATOR_LABELS[operator as keyof typeof OPERATOR_LABELS] || operator;
  }

  formatExpectedValue(protocol: ProductProtocol): string {
    // Determine which value field to use
    let value: string;

    if (protocol.valueArray && protocol.valueArray.length > 0) {
      // Array values (BETWEEN, IN, NOT_IN)
      value = protocol.valueArray.join(', ');
    } else if (protocol.valueNumeric !== null) {
      value = protocol.valueNumeric.toString();
    } else if (protocol.valueText !== null) {
      value = protocol.valueText;
    } else {
      value = 'N/A';
    }

    // Add unit if available
    if (protocol.attribute.unit) {
      value += ` ${protocol.attribute.unit}`;
    }

    return value;
  }
}
