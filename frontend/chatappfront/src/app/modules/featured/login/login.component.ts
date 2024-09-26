import { Component } from '@angular/core';

import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  // switch between login and registration
  isLoginMode: boolean = true;

  username = '';
  password = '';

  constructor(private authService: AuthService, private router: Router) {}

  toggleMode(){
    this.isLoginMode = !this.isLoginMode;
  }

  // Handle submitting a login or a register action
  onSubmit(){
    if (this.isLoginMode){
      this.login();
    } else {
      this.register();
    }
  }

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

  register(){
    this.authService.register(this.username, this.password).subscribe(
      (response) => {
        console.log('Registration successful');
        this.isLoginMode = true // go back to login screen
      },
      (error) => {
        console.error('Registration failed', error)
      }
    )
  }
}


