import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// ── MOCK DATABASE — In-Memory Store ──
interface UserInDb {
  id: string;
  userId: string;
  passwordHash: string;
  role: 'admin' | 'general';
  name: string;
  email: string;
  department: string;
  joinedAt: string;
  avatarInitials: string;
  isActive: boolean;
  blockchainWalletAddress: string;
}

interface EmploymentRecordInDb {
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

interface AuditLogInDb {
  id: string;
  action: string;
  performedBy: string;
  targetUserId: string | null;
  timestamp: string;
}

const DB = {
  users: [
    { id: 'u1', userId: 'admin', passwordHash: 'Admin@123', role: 'admin', name: 'Arjun Sharma', email: 'arjun.sharma@employchek.io', department: 'Platform Engineering', joinedAt: '2023-01-15T09:00:00.000Z', avatarInitials: 'AS', isActive: true, blockchainWalletAddress: '0x4a8F3b2e1D9c7A6b5E3f2D8c1A4b7E9d2C5f8A1b' },
    { id: 'u2', userId: 'alice', passwordHash: 'User@123', role: 'general', name: 'Alice Menon', email: 'alice.menon@employchek.io', department: 'Human Resources', joinedAt: '2023-03-20T09:00:00.000Z', avatarInitials: 'AM', isActive: true, blockchainWalletAddress: '0x9b7E4c3f1A2d5B8e6C3f9D2a5B7e4C1f3A6d9B2e' },
    { id: 'u3', userId: 'bob', passwordHash: 'User@123', role: 'general', name: 'Bob Krishnan', email: 'bob.krishnan@employchek.io', department: 'Blockchain Research', joinedAt: '2023-06-10T09:00:00.000Z', avatarInitials: 'BK', isActive: true, blockchainWalletAddress: '0x2c5A8d1f3B6e9C2a4D7f1E3b6A9d2F5c8A1e4B7c' },
    { id: 'u4', userId: 'carol', passwordHash: 'User@123', role: 'general', name: 'Carol Patel', email: 'carol.patel@employchek.io', department: 'AI & Analytics', joinedAt: '2024-01-08T09:00:00.000Z', avatarInitials: 'CP', isActive: false, blockchainWalletAddress: '0x7d2B5e8A1c4F7b3E6a9D2f5B8c1E4a7D3f6B9c2E' }
  ] as UserInDb[],

  records: [
    { id: 'r1', ownerId: 'alice', company: 'TechNova Solutions', position: 'HR Business Partner', startDate: '2019-04-01', endDate: '2022-12-31', salary: '₹12,00,000 / yr', verificationStatus: 'verified', blockchainHash: '0xabc123def456789012345678901234567890abcd', skills: ['People Ops', 'Talent Acquisition', 'HRIS', 'Compliance'], accessLevel: 'public' },
    { id: 'r2', ownerId: 'alice', company: 'MployChek', position: 'Senior HR Analyst', startDate: '2023-03-20', endDate: null, salary: '₹18,00,000 / yr', verificationStatus: 'verified', blockchainHash: '0xdef789abc012345678901234567890abcdef1234', skills: ['Blockchain HR', 'Smart Contracts', 'Employee Verification'], accessLevel: 'public' },
    { id: 'r3', ownerId: 'bob', company: 'CryptoForge Labs', position: 'Solidity Developer', startDate: '2020-07-15', endDate: '2023-05-31', salary: '₹20,00,000 / yr', verificationStatus: 'verified', blockchainHash: '0x567890abcdef12345678901234567890abcdef56', skills: ['Solidity', 'Ethereum', 'DeFi', 'Web3.js'], accessLevel: 'public' },
    { id: 'r4', ownerId: 'bob', company: 'MployChek', position: 'Blockchain Research Engineer', startDate: '2023-06-10', endDate: null, salary: '₹24,00,000 / yr', verificationStatus: 'pending', blockchainHash: '0x890abcdef1234567890abcdef1234567890abcd', skills: ['Blockchain Research', 'Smart Contracts', 'Cryptography', 'Rust'], accessLevel: 'restricted' },
    { id: 'r5', ownerId: 'carol', company: 'DataMind AI', position: 'Data Scientist', startDate: '2021-02-01', endDate: '2023-12-31', salary: '₹22,00,000 / yr', verificationStatus: 'verified', blockchainHash: '0xcdef1234567890abcdef1234567890abcdef789', skills: ['Python', 'TensorFlow', 'NLP', 'Computer Vision'], accessLevel: 'public' }
  ] as EmploymentRecordInDb[],

  auditLogs: [] as AuditLogInDb[]
};

function addAudit(action: string, performedBy: string, targetUserId: string | null = null) {
  DB.auditLogs.push({
    id: `a${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    action,
    performedBy,
    targetUserId,
    timestamp: new Date().toISOString()
  });
}

// Ensure first boots have login logs
addAudit('SYSTEM_START', 'system');

async function startServer() {
  const app = express();
  app.use(express.json());

  // ── AUTHENTICATION middleware mock helper ──
  const getContext = (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    try {
      const b64 = authHeader.split(' ')[1];
      const payload = JSON.parse(Buffer.from(b64, 'base64').toString('ascii'));
      return payload as { id: string; userId: string; role: 'admin' | 'general' };
    } catch {
      return null;
    }
  };

  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ctx = getContext(req);
    if (!ctx) {
      return res.status(401).json({ success: false, error: 'Authorization header missing or invalid session.' });
    }
    (req as any).user = ctx;
    next();
  };

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ctx = getContext(req);
    if (!ctx || ctx.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access forbidden. Administrator clearance required.' });
    }
    (req as any).user = ctx;
    next();
  };

  // ── API ROUTES ──

  // 1. Authenticate user
  app.post('/api/auth/login', (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ success: false, error: 'User ID and Password are required.' });
    }

    const user = DB.users.find(u => u.userId.toLowerCase() === userId.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ success: false, error: 'Database verification failed. Invalid user ID.' });
    }
    if (user.passwordHash !== password) {
      return res.status(401).json({ success: false, error: 'Authentication failed. Incorrect password credentials.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account deactivated. Contact system administrator.' });
    }

    // Generate a simple base-64 claims token simulation
    const claims = { id: user.id, userId: user.userId, role: user.role, exp: Date.now() + 8*60*60*1000 };
    const token = Buffer.from(JSON.stringify(claims)).toString('base64');

    addAudit('USER_LOGIN', user.userId);

    const { passwordHash, ...safeUser } = user;
    res.json({
      success: true,
      data: {
        token,
        user: safeUser
      },
      message: `Welcome verified user: ${user.name}`
    });
  });

  // 2. Fetch Employment Records (Admin gets all, general gets only their permitted records)
  app.get('/api/records', requireAuth, (req, res) => {
    const userContext = (req as any).user;
    
    // In-Memory Filtration
    let recordsList: EmploymentRecordInDb[] = [];
    if (userContext.role === 'admin') {
      recordsList = [...DB.records];
    } else {
      // General user sees only their records. Under accessLevel restrictions, mask values
      recordsList = DB.records
        .filter(r => r.ownerId === userContext.userId)
        .map(r => {
          if (r.accessLevel === 'restricted') {
            return {
              ...r,
              salary: '*** Restricted Access ***',
              blockchainHash: '0x' + '*'.repeat(40)
            };
          }
          return r;
        });
    }

    res.json({
      success: true,
      data: recordsList
    });
  });

  // 3. Admin: Get Users List
  app.get('/api/users', requireAdmin, (req, res) => {
    const safeUsers = DB.users.map(({ passwordHash, ...u }) => u);
    res.json({
      success: true,
      data: safeUsers
    });
  });

  // 4. Admin: Create User
  app.post('/api/users', requireAdmin, (req, res) => {
    const { userId, password, name, email, role, department } = req.body;
    
    if (!userId || !password || !name || !email || !department) {
      return res.status(400).json({ success: false, error: 'All core parameters (User ID, password, name, email, department) are required.' });
    }

    const checkExists = DB.users.some(u => u.userId.toLowerCase() === userId.toLowerCase().trim());
    if (checkExists) {
      return res.status(409).json({ success: false, error: 'Pre-existing User ID is already occupied in the system.' });
    }

    const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
    const mockWallet = '0x' + Array.from({length:40}, () => Math.floor(Math.random()*16).toString(16)).join('');

    const newUser: UserInDb = {
      id: 'u' + Date.now(),
      userId: userId.trim(),
      passwordHash: password,
      role: role === 'admin' ? 'admin' : 'general',
      name,
      email,
      department,
      joinedAt: new Date().toISOString(),
      avatarInitials: initials,
      isActive: true,
      blockchainWalletAddress: mockWallet
    };

    DB.users.push(newUser);
    addAudit('USER_CREATED', (req as any).user.userId, userId);

    const { passwordHash, ...safeUser } = newUser;
    res.status(201).json({
      success: true,
      data: safeUser
    });
  });

  // 5. Admin: Update User Attributes
  app.put('/api/users/:targetUserId', requireAdmin, (req, res) => {
    const { targetUserId } = req.params;
    const { name, email, department, role, isActive } = req.body;

    const userIdx = DB.users.findIndex(u => u.userId.toLowerCase() === targetUserId.toLowerCase());
    if (userIdx === -1) {
      return res.status(404).json({ success: false, error: 'Target staff user ID not found.' });
    }

    const original = DB.users[userIdx];
    DB.users[userIdx] = {
      ...original,
      name: name ?? original.name,
      email: email ?? original.email,
      department: department ?? original.department,
      role: role ?? original.role,
      isActive: isActive !== undefined ? isActive : original.isActive,
      avatarInitials: name ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0,2) : original.avatarInitials
    };

    addAudit('USER_UPDATED', (req as any).user.userId, targetUserId);

    const { passwordHash, ...safeUser } = DB.users[userIdx];
    res.json({
      success: true,
      data: safeUser
    });
  });

  // 6. Admin: Delete User
  app.delete('/api/users/:targetUserId', requireAdmin, (req, res) => {
    const { targetUserId } = req.params;
    const sessionOwner = (req as any).user.userId;

    if (sessionOwner.toLowerCase() === targetUserId.toLowerCase()) {
      return res.status(400).json({ success: false, error: 'Deactivation security: Cannot delete your active administrator session.' });
    }

    const userIdx = DB.users.findIndex(u => u.userId.toLowerCase() === targetUserId.toLowerCase());
    if (userIdx === -1) {
      return res.status(404).json({ success: false, error: 'Target user not found.' });
    }

    DB.users.splice(userIdx, 1);
    addAudit('USER_DELETED', sessionOwner, targetUserId);

    res.json({
      success: true,
      message: `User '${targetUserId}' successfully deleted.`
    });
  });

  // 7. Admin: Get Audit Trail Logs
  app.get('/api/audit-logs', requireAdmin, (req, res) => {
    // Return logs in reverse chronological order
    const orderedLogs = [...DB.auditLogs].reverse();
    res.json({
      success: true,
      data: orderedLogs
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Platform backend database running live on http://localhost:${PORT}`);
  });
}

startServer();
