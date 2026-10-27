import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { UserRole } from '../types';
import { 
  Building2, Lock, Mail, Sparkles, User, Shield, 
  Briefcase, UserCheck, ArrowRight 
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, quickLogin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (isAuthenticated && user) {
    if (user.role === 'admin') navigate('/admin');
    else if (user.role === 'officer' || user.role === 'manager') navigate('/officer');
    else navigate('/my-grievances');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    const success = await login(email.trim(), password);
    setLoading(false);
    if (success) {
      navigate('/');
    }
  };

  const handleQuick = async (role: UserRole) => {
    setLoading(true);
    const success = await quickLogin(role);
    setLoading(false);
    if (success) {
      if (role === 'admin') navigate('/admin');
      else if (role === 'officer' || role === 'manager') navigate('/officer');
      else navigate('/my-grievances');
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-12) var(--space-4) var(--space-16)' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-forest)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-3)'
          }}>
            <Building2 size={26} />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-1)' }}>Sign in to CivicTrack</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Access your civic grievance dashboard and municipal records
          </p>
        </div>

        {/* 1-Click Demo Login Personas */}
        <div className="card" style={{
          backgroundColor: 'var(--color-ivory)',
          border: '2px solid var(--color-amber)',
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-3)' }}>
            <Sparkles size={16} color="var(--color-amber-dark)" />
            <strong style={{ fontSize: '0.875rem', color: 'var(--color-charcoal)' }}>
              Hackathon 1-Click Persona Login:
            </strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', fontSize: '0.75rem' }}
              onClick={() => handleQuick('citizen')}
              disabled={loading}
            >
              <User size={13} /> Demo Citizen
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', fontSize: '0.75rem' }}
              onClick={() => handleQuick('officer')}
              disabled={loading}
            >
              <UserCheck size={13} /> Field Officer
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', fontSize: '0.75rem' }}
              onClick={() => handleQuick('manager')}
              disabled={loading}
            >
              <Briefcase size={13} /> Dept Manager
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', fontSize: '0.75rem' }}
              onClick={() => handleQuick('admin')}
              disabled={loading}
            >
              <Shield size={13} /> System Admin
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="email"
                className="form-input"
                placeholder="citizen@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '36px' }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
            Don't have an account yet?{' '}
            <Link to="/register" style={{ fontWeight: 600, color: 'var(--color-forest)' }}>
              Create Citizen Account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
