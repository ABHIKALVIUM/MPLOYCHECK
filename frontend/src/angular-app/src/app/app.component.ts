import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService, User } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  currentUser$: Observable<User | null>;

  constructor(private auth: AuthService, private router: Router) {
    this.currentUser$ = this.auth.currentUser$;
  }

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}