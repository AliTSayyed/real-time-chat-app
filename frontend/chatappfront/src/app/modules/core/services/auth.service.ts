import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // basic Django api
  private apiUrl = 'http://localhost:8000/api'

  constructor(private http: HttpClient) { }

  checkAuthentication(): Observable<any> {
    const token = this.getAccessToken(); // Get the JWT token from localStorage
  
    if (token) {
      // Attach the token to the Authorization header
      return this.http.get(`${this.apiUrl}/check-auth/`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
      });
    } else {
      // Return an observable with an error if no token is available
      return new Observable(observer => {
        observer.error({ error: 'No token found' });
      });
    }
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login/`, { username, password }).pipe(
      tap((response: any) => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
      })
    );
  }

  register(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, { username, password });
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  // Function to refresh the access token
  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');  // Get refresh token

    if (refreshToken) {
      console.log('Refreshing access token using refresh token...');
      return this.http.post(`${this.apiUrl}/token/refresh/`, {
        refresh: refreshToken
      }).pipe(
        tap((response: any) => {
          console.log('New access token received:', response.access);
          localStorage.setItem('access_token', response.access);  // Store new access token

          // Optionally, store new refresh token if token rotation is enabled
          if (response.refresh) {
            console.log('New refresh token received:', response.refresh);
            localStorage.setItem('refresh_token', response.refresh);
          }
        })
      );
    } else {
      console.error('No refresh token found');
      return new Observable(observer => {
        observer.error({ error: 'No refresh token found' });
      });
    }
  }
}
