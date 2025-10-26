import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');
  const clone = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(clone);
};
