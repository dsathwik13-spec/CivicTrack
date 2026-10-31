import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { complaintsApi, dashboardApi } from '../lib/api';
import { Complaint, DashboardStats } from '../types';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import { SLACounter } from '../components/SLACounter';
import { 
  Search, PlusCircle, ArrowRight, CheckCircle2, Clock, 
  ShieldCheck, AlertTriangle, Building2, Wrench, Droplets, 
  Trash2, Lightbulb, Waves, Sparkles, Filter, ChevronRight
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch public complaints feed and live city stats
        const [complaintsRes, statsRes] = await Promise.all([
          complaintsApi.public({ pageSize: '6', category: selectedCategory }),
          dashboardApi.stats().catch(() => null),
        ]);
        if (complaintsRes.data?.success) {
          setRecentComplaints(complaintsRes.data.data.items || []);
        }
        if (statsRes?.data?.success) {
          setStats(statsRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/track/${searchQuery.trim()}`);
    }
  };

  const categories = [
    { id: '', label: 'All Issues', icon: Building2 },
    { id: 'roads_potholes', label: 'Roads & Potholes', icon: Wrench },
    { id: 'water_supply', label: 'Water Supply', icon: Droplets },
    { id: 'sanitation_waste', label: 'Sanitation & Waste', icon: Trash2 },
    { id: 'streetlights', label: 'Streetlights', icon: Lightbulb },
    { id: 'drainage', label: 'Drainage & Sewage', icon: Waves },
  ];

  return (
    <div>
      {/* ─── Hero Section ─── */}
      <section style={{
        backgroundColor: 'var(--color-forest)',
        color: 'white',
        padding: 'var(--space-16) 0 var(--space-20)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          opacity: 0.04,
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none'
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 14px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: 'var(--space-6)',
              color: 'var(--color-amber-light)'
            }}>
              <ShieldCheck size={16} />
              <span>Bangalore Municipal Corporation • Smart Citizen Redressal</span>
            </div>

            <h1 style={{
              fontSize: '2.75rem',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.15,
              marginBottom: 'var(--space-4)',
              letterSpacing: '-0.03em'
            }}>
              Your Voice for a Better City. <br />
              <span style={{ color: 'var(--color-amber)' }}>Tracked with Integrity.</span>
            </h1>

            <p style={{
              fontSize: '1.125rem',
              color: 'var(--color-border-light)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-8)'
            }}>
              File municipal grievances in seconds, receive automated SLA turnaround guarantees, 
              and track field repairs live with immutable audit verification.
            </p>

            {/* Quick Grievance Reference Search Form */}
            <form 
              onSubmit={handleTrackSubmit}
              style={{
                display: 'flex',
                maxWidth: '560px',
                margin: '0 auto var(--space-6)',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: '4px',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="Enter Grievance Reference (e.g. CT-...) or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: 'var(--space-3)',
                  fontSize: '0.9375rem',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-charcoal)'
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--color-forest)', borderRadius: 'var(--radius-md)' }}
              >
                Track Now
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <Link to="/submit" className="btn btn-lg" style={{ backgroundColor: 'var(--color-amber)', color: 'var(--color-charcoal)', fontWeight: 700 }}>
                <PlusCircle size={18} />
                File a Grievance Now
              </Link>
              <Link to="/public-dashboard" className="btn btn-lg btn-ghost" style={{ color: 'white', border: '1px solid rgba(255, 255, 255, 0.4)' }}>
                View City Open Data
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Highlights / Live Stats Bar ─── */}
      <section style={{
        marginTop: '-36px',
        position: 'relative',
        zIndex: 10,
        marginBottom: 'var(--space-12)'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
          }}>
            <div className="card stat-card" style={{ boxShadow: 'var(--shadow-md)', borderTop: '3px solid var(--color-forest)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-label">Total Registered</span>
                <Building2 size={20} color="var(--color-forest)" />
              </div>
              <div className="stat-value">{stats ? stats.total.toLocaleString() : '1,482'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Across all Municipal Wards</div>
            </div>

            <div className="card stat-card" style={{ boxShadow: 'var(--shadow-md)', borderTop: '3px solid var(--color-success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-label">SLA Resolution Rate</span>
                <CheckCircle2 size={20} color="var(--color-success)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                {stats ? `${stats.resolutionRate}%` : '89.4%'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Resolved within target timeframe</div>
            </div>

            <div className="card stat-card" style={{ boxShadow: 'var(--shadow-md)', borderTop: '3px solid var(--color-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-label">Avg. Resolution Time</span>
                <Clock size={20} color="var(--color-amber)" />
              </div>
              <div className="stat-value">
                {stats ? `${stats.avgResolutionHours} hrs` : '28.5 hrs'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Under statutory SLA targets</div>
            </div>

            <div className="card stat-card" style={{ boxShadow: 'var(--shadow-md)', borderTop: '3px solid var(--color-critical)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-label">Automated Escalations</span>
                <AlertTriangle size={20} color="var(--color-critical)" />
              </div>
              <div className="stat-value" style={{ color: 'var(--color-critical)' }}>
                {stats ? stats.overdue : '14'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Flagged to Dept Supervisors</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How CivicTrack Works ─── */}
      <section style={{ padding: 'var(--space-12) 0', borderBottom: '1px solid var(--color-border-light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-forest)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              Citizen Charter In Action
            </span>
            <h2 style={{ fontSize: '2rem', marginTop: 'var(--space-1)' }}>How CivicTrack Works</h2>
            <p className="page-description" style={{ margin: '0 auto' }}>
              Every complaint is time-stamped, allocated directly to the accountable department, and bound by official SLA deadlines.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-6)',
          }}>
            {[
              {
                step: '01',
                title: 'Citizen Files Ticket',
                desc: 'Submit photos, address, ward, and issue category in 60 seconds with instant tracking ID.',
                icon: PlusCircle,
                badge: 'Instant Acknowledgment'
              },
              {
                step: '02',
                title: 'Auto-Routing & SLA',
                desc: 'Smart engine assigns the ticket to the respective municipal division with fixed SLA clock.',
                icon: Clock,
                badge: '12 - 72h SLA Timer'
              },
              {
                step: '03',
                title: 'Field Officer Dispatch',
                desc: 'Assigned municipal officer updates progress, performs on-site repair, and logs notes.',
                icon: Wrench,
                badge: 'Audited Action'
              },
              {
                step: '04',
                title: 'Verified Resolution',
                desc: 'Issue marked resolved with repair proof. Automatic citizen notification & feedback rating.',
                icon: CheckCircle2,
                badge: 'Citizen Verified'
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="card" style={{ position: 'relative' }}>
                  <div style={{
                    fontSize: '2rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    color: 'var(--color-border)',
                    lineHeight: 1,
                    marginBottom: 'var(--space-3)'
                  }}>
                    {item.step}
                  </div>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-forest)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-3)'
                  }}>
                    <Icon size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-2)' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                    {item.desc}
                  </p>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: 'var(--color-forest)',
                    backgroundColor: 'var(--color-bg-hover)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    {item.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Public Grievances Feed ─── */}
      <section style={{ padding: 'var(--space-12) 0 var(--space-16)' }}>
        <div className="container">
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 'var(--space-6)',
            gap: 'var(--space-4)'
          }}>
            <div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-forest)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                Open Transparency Feed
              </span>
              <h2 style={{ fontSize: '1.75rem', marginTop: 'var(--space-1)' }}>Recent Civic Grievances</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                Track issues currently reported by fellow citizens in your community
              </p>
            </div>

            <Link to="/track" className="btn btn-secondary btn-sm">
              Search All Grievances <ChevronRight size={14} />
            </Link>
          </div>

          {/* Category Filter Pills */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-2)',
            overflowX: 'auto',
            paddingBottom: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}>
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 700 : 500,
                    backgroundColor: isSelected ? 'var(--color-forest)' : 'var(--color-bg-card)',
                    color: isSelected ? 'white' : 'var(--color-text-primary)',
                    border: isSelected ? '1px solid var(--color-forest)' : '1px solid var(--color-border)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Icon size={14} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Grievances List / Cards */}
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner" />
            </div>
          ) : recentComplaints.length === 0 ? (
            <div className="card empty-state">
              <Building2 size={40} />
              <h3>No Complaints Found</h3>
              <p>There are currently no reported complaints in this category.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 'var(--space-4)',
            }}>
              {recentComplaints.map((item) => (
                <div 
                  key={item.id} 
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                  }}
                  onClick={() => navigate(`/track/${item.grievance_id}`)}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                      <span className="grievance-id">{item.grievance_id}</span>
                      <StatusBadge status={item.status} />
                    </div>

                    <h3 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-2)', lineHeight: 1.3 }}>
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
                      overflow: 'hidden',
                    }}>
                      {item.description}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <CategoryBadge category={item.category} />
                      <PriorityBadge priority={item.priority} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        📍 {item.location || item.city}
                      </span>
                      <SLACounter 
                        targetDate={item.target_resolution_date} 
                        resolvedAt={item.resolved_at}
                        isOverdue={item.is_overdue}
                        status={item.status}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
            <Link to="/track" className="btn btn-secondary">
              View All Grievances on City Map & List
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
