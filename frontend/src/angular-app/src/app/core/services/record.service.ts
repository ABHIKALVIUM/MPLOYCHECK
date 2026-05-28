import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface EmploymentRecord {
  id: string;
  ownerId: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string | null;
  salary: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  blockchainHash: string;
  skills: string[];
  accessLevel: 'public' | 'restricted';
}

export interface RecordsResponse {
  success: boolean;
  data: EmploymentRecord[];
}

@Injectable({
  providedIn: 'root'
})
export class RecordService {
  constructor(private http: HttpClient) {}

  getRecords(delayMs: number = 0): Observable<EmploymentRecord[]> {
    // We add the delay as an HTTP parameter so our HttpInterceptor 
    // can inspect it, simulate wait, and append to query if needed.
    const params = new HttpParams().set('delay', delayMs.toString());
    
    return this.http.get<RecordsResponse>('/api/records', { params })
      .pipe(
        map(res => res.data)
      );
  }
}
