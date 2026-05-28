import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface User {
  id: string;
  userId: string;
  role: 'admin' | 'general';
  name: string;
  email: string;
  department: string;
  joinedAt: string;
  avatarInitials: string;
  isActive: boolean;
  blockchainWalletAddress?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$: Observable<string | null> = this.tokenSubject.asObservable();

  private delayMsSubject = new BehaviorSubject<number>(0);
  public delayMs$: Observable<number> = this.delayMsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check localStorage on bootstrap
    const savedUser = localStorage.getItem('mploy_user');
    const savedToken = localStorage.getItem('mploy_token');
    
    if (savedUser && savedToken) {
      this.currentUserSubject.next(JSON.parse(savedUser));
      this.tokenSubject.next(savedToken);
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get tokenValue(): string | null {
    return this.tokenSubject.value;
  }

  public get currentDelayValue(): number {
    return this.delayMsSubject.value;
  }

  public setDelay(ms: number): void {
    this.delayMsSubject.next(ms);
  }

  login(userId: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { userId, password })
      .pipe(
        map(res => {
          if (res && res.data.token) {
            localStorage.setItem('mploy_token', res.data.token);
            localStorage.setItem('mploy_user', JSON.stringify(res.data.user));
            
            this.tokenSubject.next(res.data.token);
            this.currentUserSubject.next(res.data.user);
          }
          return res;
        }),
        catchError(err => {
          return throwError(err.error || { error: 'In-app connection failed' });
        })
      );
  }

  logout(): void {
    localStorage.removeItem('mploy_token');
    localStorage.removeItem('mploy_user');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }
}
