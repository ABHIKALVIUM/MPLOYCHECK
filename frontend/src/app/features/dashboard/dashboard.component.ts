import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject, Subscription, combineLatest } from 'rxjs';
import { map, switchMap, tap, shareReplay } from 'rxjs/operators';
import { AuthService, User } from '../../core/services/auth.service';
import { RecordService, EmploymentRecord } from '../../core/services/record.service';

interface RecordStats {
  total: number;
  verified: number;
  pending: number;
  current: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Reactive stream configurations
  private refreshTrigger$ = new BehaviorSubject<void>(void 0);
  public records$!: Observable<EmploymentRecord[]>;

  user: User | null = null;
  private subscriptions = new Subscription();

  // Metrics state
  stats: RecordStats = { total: 0, verified: 0, pending: 0, current: 0 };

  // Local variables bound to filter controls
  searchTerm = '';
  activeFilter = 'all';
  currentDelay = 0;
  sortField = 'startDate';
  sortDir: 'asc' | 'desc' = 'desc';

  // Sizing and delay configurations
  delayOptions = [
    { label: 'None', value: 0 },
    { label: '500ms', value: 500 },
    { label: '1s', value: 1000 },
    { label: '2s', value: 2000 },
    { label: '3s', value: 3000 }
  ];

  filterOptions = [
    { label: 'All', value: 'all' },
    { label: '✅ Verified', value: 'verified' },
    { label: '⏳ Pending', value: 'pending' },
    { label: '❌ Rejected', value: 'rejected' }
  ];

  loadTimeMessage = '';

  constructor(
    private authService: AuthService,
    private recordService: RecordService
  ) {}

  ngOnInit(): void {
    // 1. Subscribe to active user state changes
    const userSub = this.authService.currentUser$.subscribe(u => {
      this.user = u;
    });
    this.subscriptions.add(userSub);

    // 2. Read delay state
    const delaySub = this.authService.delayMs$.subscribe(d => {
      this.currentDelay = d;
    });
    this.subscriptions.add(delaySub);

    // 3. Setup reactive records feed
    this.records$ = this.refreshTrigger$.pipe(
      tap(() => {
        this.loadTimeMessage = '';
      }),
      switchMap(() => {
        const startTime = Date.now();
        return this.recordService.getRecords(this.currentDelay).pipe(
          tap(() => {
            const elapsed = Date.now() - startTime;
            this.loadTimeMessage = `⚡ Loaded in ${elapsed}ms`;
          })
        );
      }),
      tap(records => {
        this.updateStats(records);
      }),
      // Map local filtrations, searches, and sorting operations reactively (to avoid re-fetches with UI searches)
      switchMap(allRecords => {
        return this.filterAndSortRecords(allRecords);
      }),
      shareReplay(1)
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Refreshes records via REST network requests
  refreshRecords(): void {
    this.refreshTrigger$.next();
  }

  selectDelay(ms: number): void {
    this.authService.setDelay(ms);
    this.refreshRecords(); 
  }

  selectFilter(filter: string): void {
    this.activeFilter = filter;
    this.onFilterParamsChange();
  }

  onFilterParamsChange(): void {
    // Re-push trigger through the reactive pipeline
    this.refreshTrigger$.next();
  }

  toggleSort(field: string): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.refreshTrigger$.next();
  }

  getSortIndicator(field: string): string {
    if (this.sortField !== field) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  private updateStats(records: EmploymentRecord[]): void {
    this.stats = {
      total: records.length,
      verified: records.filter(r => r.verificationStatus === 'verified').length,
      pending: records.filter(r => r.verificationStatus === 'pending').length,
      current: records.filter(r => !r.endDate).length
    };
  }

  private filterAndSortRecords(records: EmploymentRecord[]): Observable<EmploymentRecord[]> {
    return new Observable<EmploymentRecord[]>(subscriber => {
      let result = [...records];

      // 1. Static Category Search
      if (this.searchTerm) {
        const q = this.searchTerm.toLowerCase();
        result = result.filter(r => 
          r.company.toLowerCase().includes(q) || 
          r.position.toLowerCase().includes(q) ||
          r.ownerId.toLowerCase().includes(q)
        );
      }

      // 2. Filter tabs
      if (this.activeFilter !== 'all') {
        result = result.filter(r => r.verificationStatus === this.activeFilter);
      }

      // 3. Sorting computations
      result.sort((a, b) => {
        const valA = String((a as any)[this.sortField] || '');
        const valB = String((b as any)[this.sortField] || '');
        
        if (this.sortDir === 'asc') {
          return valA.localeCompare(valB);
        } else {
          return valB.localeCompare(valA);
        }
      });

      subscriber.next(result);
      subscriber.complete();
    });
  }
}
