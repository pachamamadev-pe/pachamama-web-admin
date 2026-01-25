import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { CommunitiesService } from '../services/communities.service';
import { NotificationService } from '@core/services/notification.service';
import { CommunityProjectsTabComponent } from '../components/community-projects-tab.component';
import type { Community } from '../models/community.model';

/**
 * Página de detalle de comunidad
 * Muestra información, estadísticas y tabs con información relacionada
 */
@Component({
  selector: 'app-community-detail-page',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    CommunityProjectsTabComponent,
  ],
  templateUrl: './community-detail.page.html',
  styleUrl: './community-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private communitiesService = inject(CommunitiesService);
  private notification = inject(NotificationService);

  community = signal<Community | null>(null);
  loading = signal(true);

  // Computed properties para facilitar acceso en template
  communityName = computed(() => this.community()?.name ?? 'Comunidad');
  communityCode = computed(() => this.community()?.code ?? '');
  communityLocation = computed(() => {
    const c = this.community();
    if (!c) return '';
    return [c.district, c.province, c.region].filter(Boolean).join(', ');
  });

  // Imagen placeholder (en el futuro puede venir del backend)
  communityImageUrl = computed(() => {
    // En el futuro esto vendrá del backend
    // Por ahora retornamos placeholder
    return '/images/communities/placeholder.jpg';
  });

  // Estadística de crecimiento (mock por ahora)
  growthPercentage = computed(() => '+12.6%');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadCommunity(id);
    } else {
      this.notification.error('ID de comunidad no válido');
      this.goBack();
    }
  }

  loadCommunity(id: string): void {
    this.loading.set(true);
    this.communitiesService.getCommunityById(id).subscribe({
      next: (community) => {
        this.community.set(community);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading community:', error);
        this.notification.error('Error al cargar la comunidad');
        this.loading.set(false);
        this.goBack();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/communities']);
  }
}
