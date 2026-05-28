import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class DelayInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    let authHeaderReq = request;
    
    // 1. Inject Authentication Token if available
    const token = this.authService.tokenValue;
    if (token) {
      authHeaderReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // 2. Intercept and simulate processing delay for records calls
    if (request.url.includes('/api/records')) {
      const delayParam = request.params.get('delay');
      const delayMs = delayParam ? parseInt(delayParam, 10) : 0;
      
      if (delayMs > 0) {
        // Log simulation in console for HR/evaluation transparency
        console.log(`[HttpInterceptor] Intercepted /api/records. Simulating ${delayMs}ms system delay...`);
        
        // Return observable piped with RxJS delay operator
        return next.handle(authHeaderReq).pipe(
          delay(delayMs)
        );
      }
    }

    return next.handle(authHeaderReq);
  }
}
