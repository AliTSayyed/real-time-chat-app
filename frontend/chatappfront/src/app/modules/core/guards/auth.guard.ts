import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';


export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if the user is authenticated
  if (authService.isLoggedIn()) {
    return true;  // Allow access if logged in
  } else {
    // Redirect to the login page if not authenticated
    router.navigate(['/login']);
    return false;  // Prevent access to the route
  }
};