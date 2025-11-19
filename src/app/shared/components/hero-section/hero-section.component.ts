import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule],
  selector: 'app-hero-section',
  template: `
    <section class="hero-section">
      <mat-card class="hero-card">
        <mat-card-content class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">{{ title() }}</h1>
            <p class="hero-subtitle">{{ subtitle() }}</p>
          </div>
          <div class="hero-image">
            <img [src]="imageUrl()" alt="Hero Image" class="rounded-xl object-cover" />
          </div>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styleUrls: ['./hero-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionComponent {
  title = input<string>('');
  subtitle = input<string>('');
  imageUrl = input<string>('');
}
