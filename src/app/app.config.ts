import { ApplicationConfig } from '@angular/core';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { provideRouter, PreloadAllModules, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { httpErrorInterceptor } from './core/http/http-error.interceptor';
import { loadingInterceptor } from './core/http/loading.interceptor';
import { environment } from '../environments/environment';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { CustomPaginatorIntlService } from './core/services';
import { provideQuillConfig } from 'ngx-quill';

export const appConfig: ApplicationConfig = {
  providers: [
    // Backend envía timestamps en UTC (con sufijo 'Z').
    // Por defecto Angular los muestra en zona local, lo que puede verse como "día anterior".
    // Fijamos UTC para una visualización consistente en todo el proyecto.
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: 'UTC' } },
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        loadingInterceptor, // Loading interceptor ANTES de error interceptor
        httpErrorInterceptor,
      ]),
    ),
    provideAnimations(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideCharts(withDefaultRegisterables()),
    { provide: MatPaginatorIntl, useClass: CustomPaginatorIntlService },
    provideQuillConfig({
      modules: {
        syntax: false,
        toolbar: true,
      },
    }),
  ],
};
