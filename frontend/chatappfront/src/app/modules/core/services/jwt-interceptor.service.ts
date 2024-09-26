import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, switchMap, throwError } from 'rxjs';
import { AuthService} from './auth.service'; // Service for getting token

@Injectable({
  providedIn: 'root'
})
export class JwtInterceptorService implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getAccessToken();

    // Add token to request if exists
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('Intercepted HTTP error:', error);

        // If error status is 401 and the error code indicates an invalid token
        if (error.status === 401 && error.error.code === 'token_not_valid') {
          console.log('Access token expired, attempting to refresh.');

          // Refresh the token
          return this.authService.refreshToken().pipe(
            switchMap(() => {
              const newToken = this.authService.getAccessToken();
              if (newToken) {
                request = request.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`
                  }
                });
              }
              return next.handle(request);
            }),
            catchError((refreshError) => {
              console.error('Token refresh failed', refreshError);
              this.authService.logout();  // Log out the user if refresh fails
              return throwError(refreshError);
            })
          );
        }

        // For other errors, propagate the error
        return throwError(error);
      })
    );
  }
}  