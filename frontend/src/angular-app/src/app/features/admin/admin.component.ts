import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdminService, AuditLog } from '../../core/services/admin.service';
import { User, AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit, OnDestroy {
  users: User[] = [];
  auditLogs: AuditLog[] = [];
  private subscriptions = new Subscription();

  activeTab: 'users' | 'audit' = 'users';

  // Counts for visual tabs
  userCount = 0;
  auditCount = 0;

  // Modal controller states
  showModal = false;
  editMode = false;
  editingUserId: string | null = null;
  userForm!: FormGroup;

  modalError = '';
  modalSuccess = '';

  constructor(
    private adminService: AdminService,
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAdminData();
    this.initForm();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  initForm(): void {
    this.userForm = this.formBuilder.group({
      userId: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['general', Validators.required],
      department: ['', Validators.required]
    });
  }

  loadAdminData(): void {
    const dataSub = this.adminService.getUsers().subscribe({
      next: users => {
        this.users = users;
        this.userCount = users.length;
      }
    });
    this.subscriptions.add(dataSub);

    const logsSub = this.adminService.getAuditLogs().subscribe({
      next: logs => {
        this.auditLogs = logs;
        this.auditCount = logs.length;
      }
    });
    this.subscriptions.add(logsSub);
  }

  setTab(tab: 'users' | 'audit'): void {
    this.activeTab = tab;
    // Reload logs when moving to logs view
    if (tab === 'audit') {
      this.adminService.getAuditLogs().subscribe(logs => {
        this.auditLogs = logs;
        this.auditCount = logs.length;
      });
    }
  }

  toggleUserActive(userId: string, isChecked: boolean): void {
    // Optimistic UI updates
    const targetUser = this.users.find(u => u.userId === userId);
    if (targetUser) {
      targetUser.isActive = isChecked;
    }

    this.adminService.updateUser(userId, { isActive: isChecked }).subscribe({
      next: () => {
        this.loadLogs(); // Reload audit logs on change
      },
      error: () => {
        // Rollback on error
        if (targetUser) {
          targetUser.isActive = !isChecked;
        }
      }
    });
  }

  deleteUser(userId: string): void {
    // Pre-execution security check
    const currentSession = this.authService.currentUserValue;
    if (currentSession && currentSession.userId === userId) {
      alert('Security Protection: You are currently logged in as this user and cannot deactivate yourself.');
      return;
    }

    if (confirm(`Are you certain you want to remove user "${userId}" from the platform database? This cannot be undone.`)) {
      this.adminService.deleteUser(userId).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.userId !== userId);
          this.userCount = this.users.length;
          this.loadLogs();
        }
      });
    }
  }

  // ── Modal Handlers ──
  openCreateModal(): void {
    this.editMode = false;
    this.editingUserId = null;
    this.modalError = '';
    this.modalSuccess = '';
    
    // Enable fields disabled in edit mode
    this.userForm.get('userId')?.enable();
    this.userForm.get('password')?.enable();
    this.userForm.get('userId')?.setValidators([Validators.required, Validators.minLength(3)]);
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    
    this.userForm.reset({
      role: 'general',
      userId: '',
      password: '',
      name: '',
      email: '',
      department: ''
    });

    this.showModal = true;
  }

  openEditModal(user: User): void {
    this.editMode = true;
    this.editingUserId = user.userId;
    this.modalError = '';
    this.modalSuccess = '';

    // Disable fields that cannot be altered in edit mode
    this.userForm.get('userId')?.disable();
    this.userForm.get('password')?.disable();
    this.userForm.get('userId')?.clearValidators();
    this.userForm.get('password')?.clearValidators();

    this.userForm.patchValue({
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    });

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  submitForm(): void {
    if (this.userForm.invalid) return;

    this.modalError = '';
    this.modalSuccess = '';

    const formValues = this.userForm.getRawValue();

    if (!this.editMode) {
      // 1. Create operations
      this.adminService.createUser(formValues).subscribe({
        next: newUser => {
          this.users.push(newUser);
          this.userCount = this.users.length;
          this.modalSuccess = 'Success: New staff user appended to Blockchain registers!';
          this.loadLogs();
          setTimeout(() => this.closeModal(), 1200);
        },
        error: err => {
          this.modalError = err.error || 'Server error creating user';
        }
      });
    } else if (this.editingUserId) {
      // 2. Edit operations
      const payload = {
        name: formValues.name,
        email: formValues.email,
        role: formValues.role,
        department: formValues.department
      };

      this.adminService.updateUser(this.editingUserId, payload).subscribe({
        next: updatedUser => {
          const idx = this.users.findIndex(u => u.userId === this.editingUserId);
          if (idx > -1) {
            this.users[idx] = updatedUser;
          }
          this.modalSuccess = 'Success: Credentials database updated!';
          this.loadLogs();
          setTimeout(() => this.closeModal(), 1200);
        },
        error: err => {
          this.modalError = err.error || 'Server failed to update records';
        }
      });
    }
  }

  loadLogs(): void {
    this.adminService.getAuditLogs().subscribe(logs => {
      this.auditLogs = logs;
      this.auditCount = logs.length;
    });
  }

  getActionLabel(action: string): string {
    const labels: { [key: string]: string } = {
      USER_LOGIN: '🔐 Login',
      USER_CREATED: '✅ Created',
      USER_UPDATED: '✏️ Updated',
      USER_DELETED: '🗑 Deleted'
    };
    return labels[action] || action;
  }
}
