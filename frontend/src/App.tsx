import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ──
interface User {
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

interface EmploymentRecord {
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

interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  targetUserId: string | null;
  timestamp: string;
}

export default function App() {
  // ── Authentication States ──
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'login' | 'dashboard' | 'admin'>('login');

  // Input bindings
  const [loginUserId, setLoginUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSubmitted, setLoginSubmitted] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // ── Records State ──
  const [records, setRecords] = useState<EmploymentRecord[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [loadTimeMsg, setLoadTimeMsg] = useState('');
  const [delayMs, setDelayMs] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('startDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ── Admin Panel States ──
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'audit'>('users');
  const [showModal, setShowModal] = useState(false);
  const [modalEditMode, setModalEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Modal Form States
  const [modalUserId, setModalUserId] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalRole, setModalRole] = useState<'admin' | 'general'>('general');
  const [modalDept, setModalDept] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Sceen Progress Bar Ref
  const pbRef = useRef<HTMLDivElement>(null);

  // Restore session
  useEffect(() => {
    const savedUser = localStorage.getItem('mploy_user');
    const savedToken = localStorage.getItem('mploy_token');
    if (savedUser && savedToken) {
      setCurrentUser(JSON.parse(savedUser));
      setToken(savedToken);
      setActiveView('dashboard');
    }
  }, []);

  // ── Simulated Loading Progress Bar ──
  const animateProgressBar = useCallback((duration: number = 600) => {
    if (!pbRef.current) return;
    const pb = pbRef.current;
    pb.style.width = '0%';
    pb.style.opacity = '1';
    
    let width = 0;
    const interval = setInterval(() => {
      width = Math.min(width + Math.random() * 15, 90);
      pb.style.width = `${width}%`;
    }, 50);

    return () => {
      clearInterval(interval);
      pb.style.width = '100%';
      setTimeout(() => {
        pb.style.opacity = '0';
        pb.style.width = '0%';
      }, 300);
    };
  }, []);

  // ── Fetch Operations (Proxy with token auth) ──
  const loadRecords = useCallback(async () => {
    if (!token) return;
    setIsRecordsLoading(true);
    setLoadTimeMsg('');
    const stopProgress = animateProgressBar(200);

    const startTime = Date.now();

    try {
      // Intentionally pass the delay directly as a trigger parameter, 
      // simulating what the Angular HttpInterceptor reads and applies.
      const url = `/api/records?delay=${delayMs}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Mock processing delay resolver
        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }

        const res = await response.json();
        setRecords(res.data);
        const elapsed = Date.now() - startTime;
        setLoadTimeMsg(`⚡ Loaded in ${elapsed}ms`);
      }
    } catch (err) {
      console.error('[Preview Client] Network read failed: ', err);
    } finally {
      setIsRecordsLoading(false);
      if (stopProgress) stopProgress();
    }
  }, [token, delayMs, animateProgressBar]);

  const loadAdminTables = useCallback(async () => {
    if (!token || currentUser?.role !== 'admin') return;
    const stopProgress = animateProgressBar(300);

    try {
      // 1. Fetch Users
      const usersResponse = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersResponse.ok) {
        const usersRes = await usersResponse.json();
        setAdminUsers(usersRes.data);
      }

      // 2. Fetch Audits
      const auditsResponse = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (auditsResponse.ok) {
        const auditRes = await auditsResponse.json();
        setAuditLogs(auditRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (stopProgress) stopProgress();
    }
  }, [token, currentUser, animateProgressBar]);

  // Synchronize dashboard elements on profile entry
  useEffect(() => {
    if (activeView === 'dashboard') {
      loadRecords();
    } else if (activeView === 'admin') {
      loadAdminTables();
    }
  }, [activeView, loadRecords, loadAdminTables]);

  // ── Authentication Actions ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitted(true);
    setLoginError('');

    if (!loginUserId || loginUserId.length < 3) return;
    if (!loginPassword || loginPassword.length < 6) return;

    setIsAuthenticating(true);
    const stopProgress = animateProgressBar(500);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loginUserId, password: loginPassword })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        const userObj = result.data.user;
        const tokenObj = result.data.token;

        localStorage.setItem('mploy_user', JSON.stringify(userObj));
        localStorage.setItem('mploy_token', tokenObj);

        setCurrentUser(userObj);
        setToken(tokenObj);
        setActiveView('dashboard');
      } else {
        setLoginError(result.error || 'Server rejected verification keys.');
      }
    } catch (err) {
      setLoginError('In-app server connection failed. Verify Express state.');
    } finally {
      setIsAuthenticating(false);
      if (stopProgress) stopProgress();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mploy_user');
    localStorage.removeItem('mploy_token');
    setCurrentUser(null);
    setToken(null);
    setRecords([]);
    setActiveView('login');
    // Clean old fields
    setLoginUserId('');
    setLoginPassword('');
    setLoginSubmitted(false);
  };

  const handleDemoFill = (uid: string, pwd: string) => {
    setLoginUserId(uid);
    setLoginPassword(pwd);
    setLoginError('');
  };

  // ── Sorting Operations ──
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getSortSymbol = (field: string) => {
    if (sortField !== field) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  // ── Filtering Computations ──
  const filteredRecords = records
    .filter(r => {
      const matchStatus = filterStatus === 'all' || r.verificationStatus === filterStatus;
      const matchQuery = !searchQuery || 
        r.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.ownerId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchQuery;
    })
    .sort((a, b) => {
      const valA = String((a as any)[sortField] || '');
      const valB = String((b as any)[sortField] || '');
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

  // Calculate Metrics Panel Stats
  const recordStats = {
    total: records.length,
    verified: records.filter(r => r.verificationStatus === 'verified').length,
    pending: records.filter(r => r.verificationStatus === 'pending').length,
    current: records.filter(r => !r.endDate).length
  };

  // ── Administrative CRUD actions ──
  const toggleUserActiveState = async (uid: string, checked: boolean) => {
    setAdminUsers(prev => prev.map(u => u.userId === uid ? { ...u, isActive: checked } : u));
    
    try {
      await fetch(`/api/users/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: checked })
      });
      // Soft-reload logs in background
      const auditsResponse = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (auditsResponse.ok) {
        const auditRes = await auditsResponse.json();
        setAuditLogs(auditRes.data);
      }
    } catch {
      // revert on network error
      setAdminUsers(prev => prev.map(u => u.userId === uid ? { ...u, isActive: !checked } : u));
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (currentUser?.userId === uid) {
      alert('Security Protection: Self-deactivation blocked. You cannot delete your logged-in administrator session.');
      return;
    }

    if (window.confirm(`Are you certain you want to remove user "${uid}" from the blockchain directory?`)) {
      try {
        const res = await fetch(`/api/users/${uid}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          setAdminUsers(prev => prev.filter(u => u.userId !== uid));
          const auditsResponse = await fetch('/api/audit-logs', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (auditsResponse.ok) {
            const auditRes = await auditsResponse.json();
            setAuditLogs(auditRes.data);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // ── Modal Actions ──
  const triggerCreateModal = () => {
    setModalEditMode(false);
    setEditingUserId(null);
    setModalUserId('');
    setModalPassword('');
    setModalName('');
    setModalEmail('');
    setModalRole('general');
    setModalDept('');
    setModalError('');
    setModalSuccess('');
    setShowModal(true);
  };

  const triggerEditModal = (user: User) => {
    setModalEditMode(true);
    setEditingUserId(user.userId);
    setModalUserId(user.userId);
    setModalPassword('');
    setModalName(user.name);
    setModalEmail(user.email);
    setModalRole(user.role);
    setModalDept(user.department);
    setModalError('');
    setModalSuccess('');
    setShowModal(true);
  };

  const submitModalForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    // Common Checks
    if (!modalName || !modalEmail || !modalDept) {
      setModalError('Complete all system parameters.');
      return;
    }

    try {
      if (!modalEditMode) {
        // Create User
        if (!modalUserId || !modalPassword) {
          setModalError('User ID and Password coordinates required.');
          return;
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: modalUserId,
            password: modalPassword,
            name: modalName,
            email: modalEmail,
            role: modalRole,
            department: modalDept
          })
        });

        const result = await res.json();
        if (res.ok && result.success) {
          setModalSuccess('Success: User recorded securely on blockchain registers.');
          setAdminUsers(p => [...p, result.data]);
          
          const auditsResponse = await fetch('/api/audit-logs', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (auditsResponse.ok) {
            const auditRes = await auditsResponse.json();
            setAuditLogs(auditRes.data);
          }

          setTimeout(() => setShowModal(false), 1200);
        } else {
          setModalError(result.error || 'Server database failure.');
        }
      } else if (editingUserId) {
        // Edit User
        const res = await fetch(`/api/users/${editingUserId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: modalName,
            email: modalEmail,
            role: modalRole,
            department: modalDept
          })
        });

        const result = await res.json();
        if (res.ok && result.success) {
          setModalSuccess('Success: Account configurations modified.');
          setAdminUsers(p => p.map(u => u.userId === editingUserId ? result.data : u));
          
          const auditsResponse = await fetch('/api/audit-logs', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (auditsResponse.ok) {
            const auditRes = await auditsResponse.json();
            setAuditLogs(auditRes.data);
          }

          setTimeout(() => setShowModal(false), 1200);
        } else {
          setModalError(result.error || 'Server configuration update failure.');
        }
      }
    } catch {
      setModalError('In-app server transaction timeout.');
    }
  };

  // Formatting helpers
  const formatMonthYear = (d: string | null) => {
    if (!d) return 'Present';
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* ── Global Top Progress Bar ── */}
      <div ref={pbRef} className="progress-bar" id="progress-bar" style={{ opacity: 0, width: '0%' }}></div>

      {/* ══════════════════════════════════════════════════════════════════════
         Persistent Shared Header (Visible only when authenticated)
      ══════════════════════════════════════════════════════════════════════ */}
      {currentUser && (
        <nav className="topnav" id="topnav" style={{ display: 'flex' }}>
          <div className="nav-brand">
            <span className="icon"></span>
            <span className="wordmark">MPLOYCHEK<em>.</em></span>
          </div>
          
          <div className="nav-links">
            <button 
              onClick={() => setActiveView('dashboard')} 
              className={activeView === 'dashboard' ? 'active' : ''}
            >
              Dashboard
            </button>
            {currentUser.role === 'admin' && (
              <button 
                onClick={() => setActiveView('admin')} 
                className={activeView === 'admin' ? 'active' : ''}
              >
                Admin Console
              </button>
            )}
          </div>
          
          <div className="nav-right">
            <div className="nav-avatar">{currentUser.avatarInitials}</div>
            <div className="nav-info">
              <div className="n-name">{currentUser.name}</div>
              <div className="n-role">{currentUser.department}</div>
            </div>
            
            <span className={`role-badge ${currentUser.role === 'admin' ? 'admin' : ''}`}>
              {currentUser.role === 'admin' ? 'Admin' : 'General'}
            </span>
            
            <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
          </div>
        </nav>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         LOGIN CONTROLLER VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'login' && (
        <div id="login-view" className="view active" style={{ display: 'flex' }}>
          <div className="login-bg"></div>
          <div className="grid-lines"></div>
          <div className="login-shell">
            <div className="login-brand">
              <span className="brand-hex">⬡</span>
              <h1>MPLOYCHEK<em>.</em></h1>
              <p className="login-tagline">Secure · Transparent · Blockchain-Verified Employment</p>
            </div>
            
            <div className="login-card">
              <h2 className="card-title">Welcome Back</h2>
              <p className="card-sub">Sign in to your account to continue</p>

              <form onSubmit={handleLogin}>
                <div className="field">
                  <label>User ID</label>
                  <div className="input-wrap">
                    <span className="input-icon">👤</span>
                    <input 
                      type="text" 
                      placeholder="Enter your user ID" 
                      value={loginUserId} 
                      onChange={e => setLoginUserId(e.target.value)} 
                      className={loginSubmitted && (!loginUserId || loginUserId.length < 3) ? 'err' : ''}
                    />
                  </div>
                  {loginSubmitted && (!loginUserId || loginUserId.length < 3) && (
                    <div className="field-err show">User ID is required (min 3 chars)</div>
                  )}
                </div>

                <div className="field">
                  <label>Password</label>
                  <div className="input-wrap">
                    <span className="input-icon">🔒</span>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Enter your password" 
                      value={loginPassword} 
                      onChange={e => setLoginPassword(e.target.value)}
                      className={loginSubmitted && (!loginPassword || loginPassword.length < 6) ? 'err' : ''}
                    />
                    <button 
                      className="toggle-pw" 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                  {loginSubmitted && (!loginPassword || loginPassword.length < 6) && (
                    <div className="field-err show">Password is required (min 6 chars)</div>
                  )}
                </div>

                <div className={`error-banner ${loginError ? 'show' : ''}`}>
                  {loginError}
                </div>

                <button className="btn-primary" type="submit" disabled={isAuthenticating}>
                  {isAuthenticating && <span className="spinner"></span>}
                  {isAuthenticating ? 'Authenticating…' : 'Sign In →'}
                </button>
              </form>

              <div className="demo-section">
                <p className="demo-label">Demo Accounts — Click to fill</p>
                <div class="demo-chips">
                  <button className="demo-chip" type="button" onClick={() => handleDemoFill('admin', 'Admin@123')}>
                    <span className="chip-role admin">Admin</span> admin
                  </button>
                  <button className="demo-chip" type="button" onClick={() => handleDemoFill('alice', 'User@123')}>
                    <span className="chip-role">General</span> alice
                  </button>
                  <button className="demo-chip" type="button" onClick={() => handleDemoFill('bob', 'User@123')}>
                    <span className="chip-role">General</span> bob
                  </button>
                </div>
              </div>
            </div>
            
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
              Powered by Blockchain + AI · MployChek © 2026
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         DASHBOARD CONTROLLER VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'dashboard' && currentUser && (
        <div id="dashboard-view" className="view active" style={{ display: 'flex' }}>
          <div className="dash-body">
            
            {/* Background Large Type Decoration */}
            <div className="absolute top-20 right-10 text-[8rem] md:text-[16rem] font-black text-white/[0.015] leading-none select-none pointer-events-none -z-10 tracking-widest uppercase">
              RECORDS
            </div>

            <header className="mb-12">
              <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-3 italic">
                Employment <br/> Verification <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Ledger</span>
              </h1>
              <p className="text-white/60 max-w-lg font-medium text-sm md:text-base">
                Secure blockchain-backed records for enterprise personnel. Role-based visibility and verification enforced by cryptographic tokens.
              </p>
            </header>
            
            <div className="top-row">
              {/* Profile Card */}
              <div className="profile-card" id="profile-card">
                <div className="profile-avatar-lg">{currentUser.avatarInitials}</div>
                <div>
                  <div className="profile-name">{currentUser.name}</div>
                  <div className="profile-dept">{currentUser.department}</div>
                  <div className="profile-email">✉ {currentUser.email}</div>
                  <div className="profile-badges" style={{ marginTop: '10px' }}>
                    <span className={`badge ${currentUser.role === 'admin' ? 'admin-badge' : 'public'}`}>
                      {currentUser.role === 'admin' ? '⚡ Admin' : '👤 General User'}
                    </span>
                    <span className={`badge ${currentUser.isActive ? 'active-badge' : 'inactive-badge'}`}>
                      <span className={`status-dot ${currentUser.isActive ? '' : 'inactive'}`}></span>
                      {currentUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {currentUser.blockchainWalletAddress && (
                    <div className="profile-wallet" style={{ marginTop: '12px' }}>
                      <span className="wallet-icon">⬡</span>
                      <code>{currentUser.blockchainWalletAddress.slice(0, 22)}…</code>
                    </div>
                  )}
                  <div className="profile-joined" style={{ marginTop: '8px' }}>Joined {formatDate(currentUser.joinedAt)}</div>
                </div>
              </div>

              {/* Stats Metrics Header */}
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-num">{recordStats.total}</span>
                  <span className="stat-lbl">Total Records</span>
                </div>
                <div className="stat-card verified">
                  <span className="stat-num">{recordStats.verified}</span>
                  <span className="stat-lbl">Verified</span>
                </div>
                <div className="stat-card pending">
                  <span className="stat-num">{recordStats.pending}</span>
                  <span className="stat-lbl">Pending</span>
                </div>
                <div className="stat-card current">
                  <span className="stat-num">{recordStats.current}</span>
                  <span className="stat-lbl">Current Roles</span>
                </div>
              </div>
            </div>

            {/* Records Workspace Grid */}
            <div className="records-section">
              <div className="records-header">
                <div className="records-title">
                  <h3>Employment Records</h3>
                  <p>
                    {currentUser.role === 'admin' 
                      ? "Admin View — All Users' Records" 
                      : "Your verified employment history"}
                  </p>
                </div>
                
                {/* Latency Simulation Settings */}
                <div className="delay-ctrl">
                  <label>Simulate API Delay</label>
                  <div className="delay-btns">
                    {[0, 500, 1000, 2000, 3000].map(ms => (
                      <button 
                        key={ms}
                        className={`delay-btn ${delayMs === ms ? 'active' : ''}`}
                        onClick={() => {
                          setDelayMs(ms);
                          // Force a re-fetching load immediately
                          setTimeout(() => loadRecords(), 50);
                        }}
                      >
                        {ms === 0 ? 'None' : ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
                      </button>
                    ))}
                  </div>
                  {loadTimeMsg && (
                    <div className="load-time" id="load-time">{loadTimeMsg}</div>
                  )}
                </div>
              </div>

              {/* Actions, Filters, Searches */}
              <div className="table-controls">
                <div className="search-wrap">
                  <span className="search-icon">🔍</span>
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Search company or role..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="filter-tabs">
                  {[
                    { label: 'All', val: 'all' },
                    { label: '✅ Verified', val: 'verified' },
                    { label: '⏳ Pending', val: 'pending' },
                    { label: '❌ Rejected', val: 'rejected' }
                  ].map(tab => (
                    <button 
                      key={tab.val}
                      className={`filter-tab ${filterStatus === tab.val ? 'active' : ''}`}
                      onClick={() => setFilterStatus(tab.val)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button className="refresh-btn" onClick={loadRecords} disabled={isRecordsLoading}>
                  {isRecordsLoading ? <span className="spin">↻</span> : '↻'}
                </button>
              </div>

              {/* Shimmer Skeltons vs Actual Tables */}
              {isRecordsLoading ? (
                <div className="skeleton">
                  {[1, 2, 3].map(sk => (
                    <div key={sk} className="sk-row">
                      <div className="sk sk-cell w30"></div>
                      <div className="sk sk-cell w20"></div>
                      <div className="sk sk-cell w15"></div>
                      <div className="sk sk-cell w15"></div>
                      <div className="sk sk-cell w10"></div>
                    </div>
                  ))}
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="empty-state">
                  <span className="big-icon">🔎</span>
                  No records match your search or filter requirements.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {currentUser.role === 'admin' && (
                          <th onClick={() => handleSort('ownerId')}>
                            Employee {getSortSymbol('ownerId')}
                          </th>
                        )}
                        <th onClick={() => handleSort('company')}>
                          Company {getSortSymbol('company')}
                        </th>
                        <th onClick={() => handleSort('position')}>
                          Role {getSortSymbol('position')}
                        </th>
                        <th onClick={() => handleSort('startDate')}>
                          Period {getSortSymbol('startDate')}
                        </th>
                        <th>Salary</th>
                        <th>Status</th>
                        <th>Access</th>
                        <th>Skills</th>
                        <th>Blockchain Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map(r => (
                        <tr key={r.id}>
                          {currentUser.role === 'admin' && (
                            <td><span className="owner-chip">{r.ownerId}</span></td>
                          )}
                          <td><strong>{r.company}</strong></td>
                          <td>{r.position}</td>
                          <td className="period-cell">
                            {formatMonthYear(r.startDate)} <span className="period-sep">→</span>
                            <span className={!r.endDate ? 'current-label' : ''}>
                              {formatMonthYear(r.endDate)}
                            </span>
                          </td>
                          <td>{r.salary}</td>
                          <td><span className={`badge ${r.verificationStatus}`}>{r.verificationStatus}</span></td>
                          <td><span className={`badge ${r.accessLevel}`}>{r.accessLevel}</span></td>
                          <td>
                            <div className="skills-wrap">
                              {r.skills.slice(0, 3).map((s, i) => (
                                <span key={i} className="skill-tag">{s}</span>
                              ))}
                              {r.skills.length > 3 && (
                                <span className="skill-more">+{r.skills.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="hash-cell">
                            <code>{r.blockchainHash.slice(0, 14)}…</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         ADMIN CONSOLE VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {activeView === 'admin' && currentUser && currentUser.role === 'admin' && (
        <div id="admin-view" className="view active" style={{ display: 'flex' }}>
          <div className="admin-body">
            
            <div className="page-header">
              <div>
                <h2>⚡ Admin Console</h2>
                <p>Manage users, permissions and audit activity</p>
              </div>
              <button className="btn-new" onClick={triggerCreateModal}>+ New User</button>
            </div>

            {/* Switchable tab controls */}
            <div className="tab-bar">
              <button 
                className={`tab-btn ${activeAdminTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveAdminTab('users')}
              >
                👥 Users ({adminUsers.length})
              </button>
              <button 
                className={`tab-btn ${activeAdminTab === 'audit' ? 'active' : ''}`}
                onClick={() => setActiveAdminTab('audit')}
              >
                📋 Audit Log ({auditLogs.length})
              </button>
            </div>

            <div className="admin-section">
              {/* Tab 1: Users Accounts Manage Grid */}
              {activeAdminTab === 'users' ? (
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Name / ID</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Wallet</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map(u => (
                      <tr key={u.id} className={u.isActive ? '' : 'inactive-row'}>
                        <td>
                          <div className="nav-avatar" style={{ width: '36px', height: '36px' }}>
                            {u.avatarInitials}
                          </div>
                        </td>
                        <td>
                          <strong>{u.name}</strong>
                          <span className="uid-tag">{u.userId}</span>
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--text3)' }}>{u.email}</td>
                        <td>{u.department}</td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'admin-badge' : 'public'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <label className="toggle-wrap">
                            <span className="toggle">
                              <input 
                                type="checkbox" 
                                checked={u.isActive} 
                                onChange={e => toggleUserActiveState(u.userId, e.target.checked)}
                              />
                              <span className="slider"></span>
                            </span>
                          </label>
                        </td>
                        <td>
                          <code className="hash-mini">
                            {u.blockchainWalletAddress 
                              ? `${u.blockchainWalletAddress.slice(0, 14)}…` 
                              : ''}
                          </code>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-icon edit" onClick={() => triggerEditModal(u)} title="Edit User">✏️</button>
                            <button className="btn-icon delete" onClick={() => handleDeleteUser(u.userId)} title="Delete User">🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* Tab 2: System Logs Trail */
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Performed By</th>
                      <th>Target</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td>
                          <span className="audit-action">
                            {log.action === 'USER_LOGIN' ? '🔐 Login' : 
                             log.action === 'USER_CREATED' ? '✅ Created' : 
                             log.action === 'USER_UPDATED' ? '✏️ Updated' : 
                             log.action === 'USER_DELETED' ? '🗑 Deleted' : log.action}
                          </span>
                        </td>
                        <td><code>{log.performedBy}</code></td>
                        <td><code>{log.targetUserId || '—'}</code></td>
                        <td style={{ fontSize: '13px', color: 'var(--text3)' }}>
                          {formatDateTime(log.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         USER MODAL DIALOG (Shared Create/Edit form)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={`modal-overlay ${showModal ? 'show' : ''}`}>
        <div className="modal-card">
          <div className="modal-head">
            <h3>{modalEditMode ? '✏️ Edit User' : '+ Create User'}</h3>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
          </div>
          
          <div className={`error-banner ${modalError ? 'show' : ''}`}>{modalError}</div>
          <div className={`success-banner ${modalSuccess ? 'show' : ''}`}>{modalSuccess}</div>

          <form onSubmit={submitModalForm}>
            <div className="form-grid">
              {!modalEditMode && (
                <>
                  <div className="modal-field field">
                    <label>User ID</label>
                    <input 
                      placeholder="e.g. john_doe"
                      value={modalUserId}
                      onChange={e => setModalUserId(e.target.value)}
                    />
                  </div>
                  <div className="modal-field field">
                    <label>Password</label>
                    <input 
                      type="password"
                      placeholder="Min 6 characters"
                      value={modalPassword}
                      onChange={e => setModalPassword(e.target.value)}
                    />
                  </div>
                </>
              )}
              
              <div className={`modal-field field ${modalEditMode ? 'full' : ''}`}>
                <label>Full Name</label>
                <input 
                  placeholder="Full name"
                  value={modalName}
                  onChange={e => setModalName(e.target.value)}
                />
              </div>
              <div className="modal-field field">
                <label>Email Address</label>
                <input 
                  type="email"
                  placeholder="user@company.com"
                  value={modalEmail}
                  onChange={e => setModalEmail(e.target.value)}
                />
              </div>
              <div className="modal-field field">
                <label>System Role</label>
                <select value={modalRole} onChange={e => setModalRole(e.target.value as any)}>
                  <option value="general">General User</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
              <div className="modal-field field">
                <label>Department</label>
                <input 
                  placeholder="e.g. Engineering"
                  value={modalDept}
                  onChange={e => setModalDept(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button 
                type="submit" 
                className="btn-modal-primary"
                disabled={!modalName || !modalEmail || !modalDept || (!modalEditMode && (!modalUserId || !modalPassword))}
              >
                {modalEditMode ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
