import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../lib/api';
import { Notification } from '../types';
import { DemoSwitcherModal } from './DemoSwitcherModal';
import { 
  Building2, Search, PlusCircle, LayoutDashboard, Bell, 
  User, LogOut, Sparkles, Shield, Briefcase, UserCheck, 
  Menu, X, CheckCheck, BarChart3
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsApi.list({ pageSize: '5' });
      if (res.data?.success) {
        setNotifications(res.data.data.items || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch {
      // Ignore background notification fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {
      // Ignore error
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--color-bg-card)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Top Government banner bar */}
        <div style={{
          backgroundColor: 'var(--color-forest)',
          color: 'var(--color-text-inverse)',
          padding: '4px var(--space-6)',
          fontSize: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{
              backgroundColor: 'var(--color-amber)',
              color: 'var(--color-charcoal)',
              padding: '1px 6px',
              borderRadius: '2px',
              fontWeight: 700,
              fontSize: '0.625rem',
              letterSpacing: '0.05em'
            }}>
              OFFICIAL CIVIC PORTAL
            </span>
            <span style={{ opacity: 0.9 }}>
              Government Municipal Grievance Redressal & SLA Tracking System
            </span>
          </div>

          {isDemoMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 8px',
                  fontSize: '0.6875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                }}
              >
                <Sparkles size={11} color="var(--color-amber)" />
                {user ? `Persona: ${user.role.toUpperCase()}` : '⚡ Quick Demo Switcher'}
              </button>
            </div>
          )}
        </div>

        {/* Main Navbar */}
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 'var(--header-height)'
        }}>
          {/* Logo & Brand */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-forest)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--color-forest)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em'
              }}>
                CivicTrack
              </div>
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                Public Grievance Tracker
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }} className="desktop-nav">
            <Link 
              to="/" 
              className="btn btn-ghost btn-sm"
              style={{ fontWeight: isActive('/') ? 700 : 500, color: isActive('/') ? 'var(--color-forest)' : undefined }}
            >
              Home
            </Link>

            <Link 
              to="/track" 
              className="btn btn-ghost btn-sm"
              style={{ fontWeight: isActive('/track') ? 700 : 500, color: isActive('/track') ? 'var(--color-forest)' : undefined }}
            >
              <Search size={14} />
              Track Grievance
            </Link>

            <Link 
              to="/public-dashboard" 
              className="btn btn-ghost btn-sm"
              style={{ fontWeight: isActive('/public-dashboard') ? 700 : 500, color: isActive('/public-dashboard') ? 'var(--color-forest)' : undefined }}
            >
              <BarChart3 size={14} />
              City Dashboard
            </Link>

            {/* Role specific portals */}
            {user?.role === 'citizen' && (
              <Link 
                to="/my-grievances" 
                className="btn btn-ghost btn-sm"
                style={{ fontWeight: isActive('/my-grievances') ? 700 : 500, color: isActive('/my-grievances') ? 'var(--color-forest)' : undefined }}
              >
                <LayoutDashboard size={14} />
                My Grievances
              </Link>
            )}

            {(user?.role === 'officer' || user?.role === 'manager') && (
              <Link 
                to="/officer" 
                className="btn btn-ghost btn-sm"
                style={{ 
                  fontWeight: isActive('/officer') ? 700 : 500, 
                  color: isActive('/officer') ? 'var(--color-forest)' : undefined,
                  backgroundColor: 'var(--color-bg-hover)'
                }}
              >
                {user.role === 'manager' ? <Briefcase size={14} /> : <UserCheck size={14} />}
                {user.role === 'manager' ? 'Dept Manager Portal' : 'Officer Queue'}
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link 
                to="/admin" 
                className="btn btn-ghost btn-sm"
                style={{ 
                  fontWeight: isActive('/admin') ? 700 : 500, 
                  color: isActive('/admin') ? 'var(--color-forest)' : undefined,
                  backgroundColor: 'var(--color-bg-hover)'
                }}
              >
                <Shield size={14} />
                Admin Console
              </Link>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Link to="/submit" className="btn btn-primary btn-sm">
              <PlusCircle size={15} />
              File Grievance
            </Link>

            {/* Notifications Menu */}
            {isAuthenticated && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  style={{ position: 'relative', padding: '8px' }}
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      backgroundColor: 'var(--color-critical)',
                      color: 'white',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-full)',
                      padding: '1px 5px',
                      lineHeight: 1
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '320px',
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    marginTop: '8px',
                    zIndex: 200,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: 'var(--space-3) var(--space-4)',
                      borderBottom: '1px solid var(--color-border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--color-ivory)'
                    }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-forest)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CheckCheck size={12} /> Mark read
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            style={{
                              padding: 'var(--space-3) var(--space-4)',
                              borderBottom: '1px solid var(--color-border-light)',
                              backgroundColor: !n.is_read ? 'var(--color-bg-hover)' : 'transparent',
                              fontSize: '0.8125rem'
                            }}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>{n.title}</div>
                            <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>{n.message}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                              {n.created_at}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile / Auth */}
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-ivory)'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-forest)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {user?.first_name?.charAt(0) || 'U'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2 }}>
                      {user?.first_name}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                      {user?.role}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-ghost btn-sm"
                  title="Logout"
                  style={{ padding: '6px' }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-secondary btn-sm">
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="btn btn-ghost btn-sm mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{ display: 'none' }}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div style={{
            backgroundColor: 'var(--color-bg-card)',
            borderTop: '1px solid var(--color-border)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)'
          }}>
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
              Home
            </Link>
            <Link to="/track" onClick={() => setIsMobileMenuOpen(false)} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
              <Search size={16} /> Track Grievance
            </Link>
            <Link to="/public-dashboard" onClick={() => setIsMobileMenuOpen(false)} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
              <BarChart3 size={16} /> City Dashboard
            </Link>
            {user?.role === 'citizen' && (
              <Link to="/my-grievances" onClick={() => setIsMobileMenuOpen(false)} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <LayoutDashboard size={16} /> My Grievances
              </Link>
            )}
            {(user?.role === 'officer' || user?.role === 'manager') && (
              <Link to="/officer" onClick={() => setIsMobileMenuOpen(false)} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <Briefcase size={16} /> Officer Queue
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                <Shield size={16} /> Admin Console
              </Link>
            )}
            {isDemoMode && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsDemoModalOpen(true);
                }}
                style={{ justifyContent: 'flex-start' }}
              >
                <Sparkles size={16} /> Switch Demo Persona
              </button>
            )}
          </div>
        )}
      </header>

      {/* Demo Persona Switcher Modal */}
      <DemoSwitcherModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </>
  );
};
