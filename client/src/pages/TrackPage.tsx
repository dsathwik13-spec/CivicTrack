import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { complaintsApi } from '../lib/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import { SLACounter } from '../components/SLACounter';
import { 
  Search, ArrowLeft, Clock, MapPin, Building2, User, 
  Calendar, CheckCircle2, AlertCircle, Share2, Copy, 
  MessageSquare, FileText, Check, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export const TrackPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [searchId, setSearchId] = useState(id || '');
  const [complaint, setComplaint] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Demo grievance IDs for instant 1-click test
  const demoIds = ['CT-DEMO001', 'CT-DEMO002', 'CT-DEMO003', 'CT-DEMO004'];

  const fetchComplaint = async (targetId: string) => {
    if (!targetId.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await complaintsApi.track(targetId.trim());
      if (res.data?.success && res.data?.data) {
        setComplaint(res.data.data.complaint);
        setHistory(res.data.data.history || []);
        setUpdates(res.data.data.updates || []);
      } else {
        setError('No grievance found with this reference number.');
        setComplaint(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Grievance not found. Please verify the ID.');
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setSearchId(id);
      fetchComplaint(id);
    }
  }, [id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/track/${searchId.trim()}`);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Grievance link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4) var(--space-16)' }}>
      {/* Search Header */}
      <div style={{ maxWidth: '720px', margin: '0 auto var(--space-8)', textAlign: 'center' }}>
        <h1 className="page-title">Track Grievance Status</h1>
        <p className="page-description" style={{ margin: '0 auto var(--space-6)' }}>
          Enter your unique Grievance Reference Number to view real-time status, timeline history, and field actions.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              placeholder="e.g. CT-DEMO001, CT-..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px', fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        {/* Demo ID quick links */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
          <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={14} color="var(--color-amber)" /> Demo References:
          </span>
          {demoIds.map((dId) => (
            <button
              key={dId}
              type="button"
              onClick={() => {
                setSearchId(dId);
                navigate(`/track/${dId}`);
              }}
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                color: 'var(--color-forest)'
              }}
            >
              {dId}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="card empty-state" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <AlertCircle size={44} color="var(--color-critical)" />
          <h3>Reference Not Found</h3>
          <p>{error}</p>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Link to="/submit" className="btn btn-primary btn-sm">
              File a New Grievance
            </Link>
          </div>
        </div>
      ) : complaint ? (
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          {/* Top Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <button
              type="button"
              onClick={copyShareLink}
              className="btn btn-secondary btn-sm"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Share Tracking Link'}
            </button>
          </div>

          {/* Grievance Summary Card */}
          <div className="card" style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-forest)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: '6px' }}>
                  <span className="grievance-id" style={{ fontSize: '1.125rem' }}>
                    {complaint.grievance_id}
                  </span>
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority} />
                </div>
                <h2 style={{ fontSize: '1.375rem', lineHeight: 1.3, margin: 0 }}>
                  {complaint.title}
                </h2>
              </div>

              <div>
                <SLACounter
                  targetDate={complaint.target_resolution_date}
                  resolvedAt={complaint.resolved_at}
                  isOverdue={complaint.is_overdue}
                  status={complaint.status}
                />
              </div>
            </div>

            {/* Metadata Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
              backgroundColor: 'var(--color-bg-page)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              fontSize: '0.8125rem'
            }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Category</span>
                <CategoryBadge category={complaint.category} />
              </div>

              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Department</span>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Building2 size={14} color="var(--color-forest)" />
                  {complaint.department_name || 'Unassigned / Auto-Routing'}
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Location</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <MapPin size={14} color="var(--color-forest)" />
                  {complaint.location}, {complaint.city}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Registered On</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Calendar size={14} color="var(--color-forest)" />
                  {complaint.created_at}
                </span>
              </div>
            </div>

            {/* Resolution Notes if Resolved */}
            {complaint.resolution_notes && (
              <div style={{
                backgroundColor: 'var(--color-success-light)',
                border: '1px solid var(--color-success)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontWeight: 700, marginBottom: '4px' }}>
                  <CheckCircle2 size={16} /> Official Resolution Statement
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-charcoal)' }}>
                  {complaint.resolution_notes}
                </p>
              </div>
            )}
          </div>

          {/* Interactive Timeline & Public Updates Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
            {/* Visual Timeline */}
            <div className="card">
              <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Clock size={18} color="var(--color-forest)" />
                Audit Trail & Status Timeline
              </h3>

              {history.length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>No status changes recorded yet.</p>
              ) : (
                <div className="timeline">
                  {history.map((event, index) => (
                    <div key={index} className="timeline-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <StatusBadge status={event.new_status} />
                          {event.previous_status && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              (from {event.previous_status})
                            </span>
                          )}
                        </div>
                        <span className="timestamp">{event.created_at}</span>
                      </div>

                      {event.reason && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                          {event.reason}
                        </p>
                      )}

                      {event.changed_by && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          Updated by: {event.changed_by}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Official Updates Stream */}
            <div className="card">
              <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <MessageSquare size={18} color="var(--color-forest)" />
                Official Field Updates ({updates.length})
              </h3>

              {updates.length === 0 ? (
                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                  No public field updates posted yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {updates.map((u, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        backgroundColor: 'var(--color-bg-page)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '3px solid var(--color-amber)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.8125rem', color: 'var(--color-charcoal)' }}>
                          {u.author || 'Municipal Representative'}
                        </strong>
                        <span className="timestamp">{u.created_at}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        {u.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
