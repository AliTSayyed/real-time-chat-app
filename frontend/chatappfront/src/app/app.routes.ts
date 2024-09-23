import { Routes } from '@angular/router';

// the router outlet shows the feature module on page load. 
export const routes: Routes = [{
  path: '',
  loadChildren: () => 
    import('./modules/featured/featured.module').then(
      (m) => m.FeaturedModule
    )
}]
;
