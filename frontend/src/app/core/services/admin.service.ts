import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from './auth.service';

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  targetUserId: string | null;
  timestamp: string;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
}

export interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<UsersResponse>('/api/users')
      .pipe(map(res => res.data));
  }

  createUser(payload: Partial<User> & { password?: string }): Observable<User> {
    return this.http.post<{ success: boolean; data: User }>('/api/users', payload)
      .pipe(map(res => res.data));
  }

  updateUser(userId: string, payload: Partial<User>): Observable<User> {
    return this.http.put<{ success: boolean; data: User }>(`/api/users/${userId}`, payload)
      .pipe(map(res => res.data));
  }

  deleteUser(userId: string): Observable<boolean> {
    return this.http.delete<{ success: boolean }>(`/api/users/${userId}`)
      .pipe(map(res => res.success));
  }

  getAuditLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLogsResponse>('/api/audit-logs')
      .pipe(map(res => res.data));
  }
}
