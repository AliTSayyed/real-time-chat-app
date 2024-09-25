import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
@Input() username: string | null = null; // get username from authenticated user 

}
