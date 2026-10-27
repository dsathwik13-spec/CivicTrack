import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Phone, ShieldCheck, Clock, ExternalLink, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--color-charcoal)',
      color: 'var(--color-text-inverse)',
      borderTop: '4px solid var(--color-forest)',
      marginTop: 'auto',
      paddingTop: 'var(--space-12)',
      paddingBottom: 'var(--space-8)'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-8)',
          marginBottom: 'var(--space-10)'
        }}>
          {/* Col 1: Brand & Purpose */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-forest)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building2 size={18} color="white" />
              </div>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'white'
              }}>
                CivicTrack
              </span>
            </div>
            <p style={{
              fontSize: '0.8125rem',
              color: 'var(--color-border)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-4)'
            }}>
              Citizen-first Municipal Grievance Redressal System powered by automated SLA tracking, 
              transparent timeline auditing, and verified civic resolution.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-amber)' }}>
              <ShieldCheck size={14} />
              <span>Right to Public Service Guaranteed</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 style={{ color: 'white', fontSize: '0.9375rem', marginBottom: 'var(--space-4)' }}>
              Citizen Portals
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <li>
                <Link to="/submit" style={{ color: 'var(--color-border)', fontSize: '0.8125rem' }}>
                  → File New Grievance
                </Link>
              </li>
              <li>
                <Link to="/track" style={{ color: 'var(--color-border)', fontSize: '0.8125rem' }}>
                  → Track Complaint Reference
                </Link>
              </li>
              <li>
                <Link to="/public-dashboard" style={{ color: 'var(--color-border)', fontSize: '0.8125rem' }}>
                  → City Transparency Dashboard
                </Link>
              </li>
              <li>
                <Link to="/my-grievances" style={{ color: 'var(--color-border)', fontSize: '0.8125rem' }}>
                  → My Grievances History
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: SLA & Citizen Charter */}
          <div>
            <h4 style={{ color: 'white', fontSize: '0.9375rem', marginBottom: 'var(--space-4)' }}>
              SLA Commitments
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.8125rem', color: 'var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="var(--color-amber)" />
                <span>Water Supply / Drainage: 12 - 48 hrs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="var(--color-amber)" />
                <span>Roads & Potholes: 24 - 72 hrs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="var(--color-amber)" />
                <span>Streetlights & Power: 24 - 48 hrs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="var(--color-amber)" />
                <span>Waste Collection: 12 - 36 hrs</span>
              </div>
            </div>
          </div>

          {/* Col 4: Emergency Helplines */}
          <div>
            <h4 style={{ color: 'white', fontSize: '0.9375rem', marginBottom: 'var(--space-4)' }}>
              Emergency Civic Helplines
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: '0.8125rem', color: 'var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={13} color="var(--color-critical)" />
                <span><strong>1913</strong> — Municipal Control Room (24/7)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={13} color="var(--color-critical)" />
                <span><strong>112</strong> — Police & Disaster Emergency</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={13} color="var(--color-critical)" />
                <span><strong>108</strong> — Medical Ambulance</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Toll-free numbers accessible across all telecom networks.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: 'var(--space-6)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)'
        }}>
          <div>
            © {new Date().getFullYear()} CivicTrack Public Grievance Redressal System • Built for Hackathon HACK-P243
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <span>Privacy Policy</span>
            <span>Citizen Charter</span>
            <span>Open Data Standard</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-amber)' }}>
              Built with <Heart size={12} fill="currentColor" /> for Smart Cities
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
