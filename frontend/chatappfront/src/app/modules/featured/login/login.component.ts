import { Component } from '@angular/core';

import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  username = '';
  password = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        // If login is successful, redirect to the home page
        this.router.navigate(['']);
      },
      error: (error) => {
        console.error('Login failed', error);
      },
      complete: () => {
        console.log('Login request completed');
      }
    });
  }
}

