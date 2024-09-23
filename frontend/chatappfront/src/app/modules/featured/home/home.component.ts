import { Component } from '@angular/core';
import { ChatComponent } from "../chat/chat.component";
import { ContactsComponent } from "../contacts/contacts.component";
import { ProfileComponent } from "../profile/profile.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ChatComponent, ContactsComponent, ProfileComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
