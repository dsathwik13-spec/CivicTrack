import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { complaintsApi } from '../lib/api';
import { Complaint } from '../types';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import { SLACounter } from '../components/SLACounter';
import { 
  LayoutDashboard, PlusCircle, Search, Filter, 
  ChevronRight, Calendar, MapPin, Building2 
} from 'lucide-react';

export const MyGrievancesPage: React.FC = () => {
  const { user, isAuthenticated, quickLogin } = useAuth();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMyComplaints = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { pageSize: '50' };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await complaintsApi.list(params);
      if (res.data?.success) {
        setComplaints(res.data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load my grievances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyComplaints();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMyComplaints();
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: 'var(--space-16) var(--space-4)', textAlign: 'center' }}>
        <div className="card empty-state" style={{ maxWidth: '560px', margin: '0 auto' }}>
          <LayoutDashboard size={48} color="var(--color-forest)" />
          <h2>Citizen Authentication Required</h2>
          <p style={{ marginBottom: 'var(--space-6)' }}>
            Please sign in to view the grievances you have registered, or use 1-click Demo Citizen Login.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => quickLogin('citizen')}
            >
              ⚡ Quick Login as Demo Citizen
            </button>
            <Link to="/login" className="btn btn-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4) var(--space-16)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-8)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-forest)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
            <LayoutDashboard size={16} />
            <span>Citizen Grievance History</span>
          </div>
          <h1 className="page-title">My Registered Grievances</h1>
          <p className="page-description">
            Track real-time progress, municipal responses, and resolution reports for your tickets.
          </p>
        </div>

        <Link to="/submit" className="btn btn-primary">
          <PlusCircle size={16} /> File New Grievance
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              placeholder="Search by ticket title, description, or grievance ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '160px' }}
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <button type="submit" className="btn btn-secondary">
            Filter
          </button>
        </form>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="card empty-state">
          <Building2 size={44} />
          <h3>No Grievances Found</h3>
          <p>You haven't filed any grievances matching this filter yet.</p>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Link to="/submit" className="btn btn-primary btn-sm">
              <PlusCircle size={14} /> File a Grievance
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {complaints.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                borderLeft: '4px solid var(--color-forest)',
              }}
              onClick={() => navigate(`/track/${item.grievance_id}`)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="grievance-id" style={{ fontSize: '0.9375rem' }}>
                    {item.grievance_id}
                  </span>
                  <StatusBadge status={item.status} />
                  <PriorityBadge priority={item.priority} />
                </div>

                <SLACounter
                  targetDate={item.target_resolution_date}
                  resolvedAt={item.resolved_at}
                  isOverdue={item.is_overdue}
                  status={item.status}
                />
              </div>

              <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-2)' }}>
                {item.title}
              </h3>

              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                marginBottom: 'var(--space-4)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {item.description}
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
                fontSize: '0.75rem',
                borderTop: '1px solid var(--color-border-light)',
                paddingTop: 'var(--space-3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <CategoryBadge category={item.category} />
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    📍 {item.location}, {item.city}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    📅 {item.created_at}
                  </span>
                </div>

                <span style={{ color: 'var(--color-forest)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                  View Full Audit Trail <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
