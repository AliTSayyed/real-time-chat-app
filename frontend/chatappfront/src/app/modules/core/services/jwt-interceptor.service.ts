import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService} from './auth.service'; // Service for getting token

@Injectable({
  providedIn: 'root'
})
export class JwtInterceptorService implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get the JWT token from the authentication service
    const token = this.authService.getAccessToken();

    // If the token exists, clone the request and add the Authorization header
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // Pass the modified request to the next handler in the chain
    return next.handle(request);
  }
}
