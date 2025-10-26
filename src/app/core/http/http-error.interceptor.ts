import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req)
    .pipe
    // AquÃ­ puedes mapear 401 -> logout/redirecciÃ³n, 409 -> feedback unicidad, etc.
    ();
