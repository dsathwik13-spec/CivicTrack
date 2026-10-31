import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { 
  Building2, Lock, Mail, User, Shield, 
  Briefcase, UserCheck, ArrowRight, ArrowLeft,
  AlertCircle, CheckCircle2, Sparkles
} from 'lucide-react';

interface RoleMeta {
  role: UserRole;
  title: string;
  badge: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  description: string;
  emailPlaceholder: string;
  targetDashboard: string;
  dashboardLabel: string;
}

const ROLES: RoleMeta[] = [
  {
    role: 'citizen',
    title: 'Citizen',
    badge: 'PUBLIC ACCESS',
    icon: User,
    description: 'File civic complaints, track real-time resolution stages, interact with field officers, and view municipal SLA progress.',
    emailPlaceholder: 'citizen@domain.com or citizen1@civictrack.demo',
    targetDashboard: '/my-grievances',
    dashboardLabel: 'Citizen Grievances Dashboard',
  },
  {
    role: 'officer',
    title: 'Field Officer',
    badge: 'FIELD OPERATIONS',
    icon: UserCheck,
    description: 'Access assigned department work orders, record physical inspection notes, upload repair proof, and transition ticket statuses.',
    emailPlaceholder: 'officer.roads@civictrack.demo',
    targetDashboard: '/officer',
    dashboardLabel: 'Field Operations Queue',
  },
  {
    role: 'manager',
    title: 'Dept Manager',
    badge: 'EXECUTIVE OVERSIGHT',
    icon: Briefcase,
    description: 'Supervise departmental grievance queues, assign engineers, re-prioritize urgent community issues, and monitor SLA breach risks.',
    emailPlaceholder: 'roads.manager@civictrack.demo',
    targetDashboard: '/officer',
    dashboardLabel: 'Department Manager Portal',
  },
  {
    role: 'admin',
    title: 'System Admin',
    badge: 'CITY-WIDE CONSOLE',
    icon: Shield,
    description: 'City-wide administrative authority. Manage municipal departments, user roles, system analytics, and immutable audit logs.',
    emailPlaceholder: 'admin@civictrack.demo',
    targetDashboard: '/admin',
    dashboardLabel: 'Administrator Console',
  },
];

export const LoginPage: React.FC = () => {
  const { login, quickLogin, isAuthenticated, user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Determine initial role from query parameter (e.g. /login?role=admin)
  const initialRoleParam = searchParams.get('role') as UserRole | null;
  const initialRole: UserRole = (initialRoleParam && ['citizen', 'officer', 'manager', 'admin'].includes(initialRoleParam))
    ? initialRoleParam
    : 'citizen';

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect to the user's role dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'officer' || user.role === 'manager') navigate('/officer');
      else navigate('/my-grievances');
    }
  }, [isAuthenticated, user, navigate]);

  const activeMeta = ROLES.find(r => r.role === selectedRole) || ROLES[0];

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    const authenticatedUser = await login(cleanEmail, cleanPassword);
    setLoading(false);

    if (authenticatedUser) {
      // Direct navigation to appropriate portal based strictly on server-authenticated role
      if (authenticatedUser.role === 'admin') {
        navigate('/admin');
      } else if (authenticatedUser.role === 'officer' || authenticatedUser.role === 'manager') {
        navigate('/officer');
      } else {
        navigate('/my-grievances');
      }
    } else {
      setErrorMessage('Invalid email or password. Please verify your credentials.');
    }
  };

  // Optional 1-click test helper when in development / demo mode
  const handleQuickFill = (role: UserRole) => {
    if (isDemoMode) {
      quickLogin(role);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-10) var(--space-4) var(--space-16)' }}>
      <div style={{ maxWidth: '540px', margin: '0 auto' }}>
        
        {/* Back Navigation */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Link 
            to="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.8125rem', 
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            <ArrowLeft size={14} /> Back to Public Grievance Portal
          </Link>
        </div>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-forest)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-3)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Building2 size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-1)', fontWeight: 800 }}>
            CivicTrack Portal Access
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Select your municipal role to sign in to your authorized workspace
          </p>
        </div>

        {/* Role Selector Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
          backgroundColor: 'var(--color-ivory)',
          padding: '6px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)'
        }}>
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isSelected = selectedRole === r.role;
            return (
              <button
                key={r.role}
                type="button"
                onClick={() => handleRoleChange(r.role)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 'var(--space-2) var(--space-1)',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1px solid var(--color-forest)' : '1px solid transparent',
                  backgroundColor: isSelected ? 'var(--color-forest)' : 'transparent',
                  color: isSelected ? 'white' : 'var(--color-charcoal)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.75rem'
                }}
              >
                <Icon size={16} color={isSelected ? 'white' : 'var(--color-forest)'} />
                <span>{r.title}</span>
              </button>
            );
          })}
        </div>

        {/* Role Description Card */}
        <div className="card" style={{
          backgroundColor: 'var(--color-ivory)',
          borderLeft: '4px solid var(--color-forest)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ 
              fontWeight: 700, 
              fontSize: '0.875rem', 
              color: 'var(--color-forest)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {React.createElement(activeMeta.icon, { size: 16 })}
              {activeMeta.title} Access
            </span>
            <span style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '2px',
              backgroundColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.04em'
            }}>
              {activeMeta.badge}
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
            {activeMeta.description}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            color: '#991b1b',
            fontSize: '0.8125rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--color-text-muted)' 
                }} 
              />
              <input
                type="email"
                className="form-input"
                placeholder={activeMeta.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '38px' }}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--color-text-muted)' 
                }} 
              />
              <input
                type="password"
                className="form-input"
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '38px' }}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 'var(--space-2)', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : `Sign In as ${activeMeta.title}`}
          </button>

          {/* Role specific auxiliary links */}
          {selectedRole === 'citizen' ? (
            <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
              New citizen user?{' '}
              <Link to="/register" style={{ fontWeight: 600, color: 'var(--color-forest)' }}>
                Register Free Citizen Account
              </Link>
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
              Municipal staff accounts are provisioned by your Department Manager or System Administrator.
            </div>
          )}
        </form>

        {/* Development Quick-Fill Helper (only active when demo mode is enabled) */}
        {isDemoMode && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => handleQuickFill(selectedRole)}
              style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}
            >
              <Sparkles size={12} color="var(--color-amber-dark)" />
              Development Quick-Fill for {activeMeta.title}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
