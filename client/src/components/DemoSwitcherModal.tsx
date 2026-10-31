import React from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { UserRole } from '../types';
import { User, Shield, Briefcase, UserCheck, Check, Sparkles, X } from 'lucide-react';

interface DemoSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoSwitcherModal: React.FC<DemoSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { user, quickLogin, isDemoMode } = useAuth();

  if (!isOpen || !isDemoMode) return null;

  const roles: { role: UserRole; title: string; subtitle: string; icon: any; desc: string; access: string }[] = [
    {
      role: 'citizen',
      title: 'Citizen',
      subtitle: DEMO_CREDENTIALS.citizen.title,
      icon: User,
      desc: 'Submit grievances with location, photo proof & track live resolution updates.',
      access: 'Public Tracking, Submit Grievance, My Grievances, Citizen Notifications',
    },
    {
      role: 'officer',
      title: 'Field Officer',
      subtitle: DEMO_CREDENTIALS.officer.title,
      icon: UserCheck,
      desc: 'Assigned to Roads & Infrastructure. Updates status, uploads fix proof & resolves tickets.',
      access: 'Officer Queue, Status Transitions, Internal Notes, Resolution Reports',
    },
    {
      role: 'manager',
      title: 'Department Manager',
      subtitle: DEMO_CREDENTIALS.manager.title,
      icon: Briefcase,
      desc: 'Supervises Roads & Infrastructure department, assigns staff, re-prioritizes & monitors SLAs.',
      access: 'Department Queue, Staff Assignment, SLA Countdown, Escalation Monitor',
    },
    {
      role: 'admin',
      title: 'System Administrator',
      subtitle: DEMO_CREDENTIALS.admin.title,
      icon: Shield,
      desc: 'City-wide administrative authority. Full analytics, user role management & immutable audit logs.',
      access: 'City Analytics, User & Dept Management, System Audit Logs, CSV Data Export',
    },
  ];

  const handleSelect = async (role: UserRole) => {
    await quickLogin(role);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '640px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-forest)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Hackathon Quick Switcher</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                1-Click switch between municipal roles & portals
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-ghost btn-sm" 
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {roles.map((item) => {
            const Icon = item.icon;
            const isCurrent = user?.role === item.role;

            return (
              <div
                key={item.role}
                onClick={() => handleSelect(item.role)}
                style={{
                  border: isCurrent ? '2px solid var(--color-forest)' : '1px solid var(--color-border)',
                  backgroundColor: isCurrent ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 'var(--space-3)',
                }}
              >
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isCurrent ? 'var(--color-forest)' : 'var(--color-border-light)',
                    color: isCurrent ? 'white' : 'var(--color-forest)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-charcoal)' }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        • {item.subtitle}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '4px 0' }}>
                      {item.desc}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-forest)', fontWeight: 500 }}>
                      🔑 {item.access}
                    </div>
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-forest)',
                      color: 'white',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                    }}>
                      <Check size={12} /> Active
                    </span>
                  ) : (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Switch
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
