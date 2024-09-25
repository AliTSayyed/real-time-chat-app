import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from '../core/guards/auth.guard';

const routes: Routes = [{
  path:'',
  component: HomeComponent,
  canActivate: [authGuard]
},
{
  path:'login',
  component: LoginComponent
},
{ path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturedRoutingModule { }
