import { HttpInterceptorFn } from '@angular/common/http';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req)
    .pipe
    // Aquí puedes mapear 401 -> logout/redirección, 409 -> feedback unicidad, etc.
    ();
