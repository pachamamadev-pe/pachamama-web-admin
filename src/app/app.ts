import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BrowserWarningComponent } from '@app/shared/components/browser-warning/browser-warning.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BrowserWarningComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('web-admin-pachamama');
}
