import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeaturedRoutingModule } from './featured-routing.module';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from './chat/chat.component';
import { HomeComponent } from './home/home.component';
import { ContactsComponent } from './contacts/contacts.component';
import { ProfileComponent } from './profile/profile.component';
import { LoginComponent } from "./login/login.component";
import { CustomDatePipe } from '../core/pipes/custom-date.pipe';



@NgModule({
  declarations: [HomeComponent, ChatComponent, ContactsComponent, ProfileComponent, LoginComponent],
  imports: [
    CommonModule,
    FeaturedRoutingModule,
    FormsModule,
    CustomDatePipe
]
})
export class FeaturedModule { }
