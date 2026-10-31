import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { complaintsApi } from '../lib/api';
import { ComplaintCategory } from '../types';
import { 
  PlusCircle, Wrench, Droplets, Trash2, Lightbulb, Waves, 
  Building2, HelpCircle, CheckCircle2, Copy, ArrowRight, 
  MapPin, Clock, Sparkles, AlertCircle, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SubmitPage: React.FC = () => {
  const { user, isAuthenticated, quickLogin } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('roads_potholes');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('Bangalore');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(false);
  const [createdGrievanceId, setCreatedGrievanceId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories: { id: ComplaintCategory; label: string; desc: string; sla: string; icon: any }[] = [
    {
      id: 'roads_potholes',
      label: 'Roads & Potholes',
      desc: 'Craters, road cave-ins, asphalt erosion, open manhole covers',
      sla: '48 Hours SLA',
      icon: Wrench,
    },
    {
      id: 'water_supply',
      label: 'Water Supply',
      desc: 'Pipeline bursts, contaminated water, low pressure, tanker delays',
      sla: '24 Hours SLA',
      icon: Droplets,
    },
    {
      id: 'sanitation_waste',
      label: 'Sanitation & Waste',
      desc: 'Overflowing dumpsters, uncollected garbage, public littering',
      sla: '24 Hours SLA',
      icon: Trash2,
    },
    {
      id: 'streetlights',
      label: 'Streetlights & Electrical',
      desc: 'Dark streets, flickering bulbs, hanging cables, blown fuses',
      sla: '48 Hours SLA',
      icon: Lightbulb,
    },
    {
      id: 'drainage',
      label: 'Drainage & Sewage',
      desc: 'Stormwater overflow, clogged storm drains, raw sewage backup',
      sla: '48 Hours SLA',
      icon: Waves,
    },
    {
      id: 'public_infrastructure',
      label: 'Public Infrastructure',
      desc: 'Damaged sidewalks, broken park benches, missing road signs',
      sla: '72 Hours SLA',
      icon: Building2,
    },
  ];

  // Presets for 1-click hackathon test
  const loadPreset = (preset: 'pothole' | 'water' | 'light') => {
    if (preset === 'pothole') {
      setTitle('Dangerous Crater-Sized Pothole on 80 Feet Road');
      setDescription('A large 3-foot deep pothole has formed near the bus stop causing severe traffic slowdowns and motorbike accidents during rainy hours. Immediate cold-mix patching required.');
      setCategory('roads_potholes');
      setLocation('Opposite Sony World Signal, 80 Feet Road, Koramangala 4th Block');
      setCity('Bangalore');
    } else if (preset === 'water') {
      setTitle('Major Main Pipeline Leakage Flooding Residential Street');
      setDescription('Fresh drinking water is gushing out of a cracked BWSSB main pipeline since 6:00 AM this morning. Over thousands of liters wasted and basement parking flooded.');
      setCategory('water_supply');
      setLocation('12th Main Road, Near BDA Complex, Indiranagar');
      setCity('Bangalore');
    } else if (preset === 'light') {
      setTitle('Series of 5 Streetlights Out Along School Cross Road');
      setDescription('Entire 200m stretch of road outside the government primary school has been completely dark for 3 days. Safety hazard for students and pedestrians in evening.');
      setCategory('streetlights');
      setLocation('15th Cross, 5th Phase, J.P. Nagar');
      setCity('Bangalore');
    }
    toast.success('Loaded demo grievance details!');
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters long.';
    }
    if (!description.trim() || description.trim().length < 20) {
      errs.description = 'Description must be at least 20 characters long to provide sufficient detail.';
    }
    if (!location.trim() || location.trim().length < 3) {
      errs.location = 'Specific location or address is required.';
    }
    if (!city.trim()) {
      errs.city = 'City is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please sign in or use 1-click Demo Citizen Login to register a grievance.');
      return;
    }

    if (!validate()) return;

    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        city: city.trim(),
        incident_date: incidentDate || undefined,
      };

      const res = await complaintsApi.create(payload);
      if (res.data?.success && res.data?.data?.complaint) {
        const gid = res.data.data.complaint.grievance_id;
        setCreatedGrievanceId(gid);
        toast.success(`Grievance registered successfully: ${gid}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to submit grievance. Please verify fields.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4) var(--space-16)' }}>
      {/* Success Modal */}
      {createdGrievanceId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '520px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success-light)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
              Grievance Registered Successfully!
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-6)' }}>
              Your ticket has been officially logged with the municipal redressal board and routed under SLA guarantee.
            </p>

            <div style={{
              backgroundColor: 'var(--color-ivory)',
              border: '2px dashed var(--color-forest)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Unique Tracking Reference
              </span>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--color-forest)',
                marginTop: '4px'
              }}>
                {createdGrievanceId}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(createdGrievanceId);
                  toast.success('Copied tracking ID!');
                }}
              >
                <Copy size={16} /> Copy ID
              </button>
              <Link to="/my-grievances" className="btn btn-secondary">
                My Grievances
              </Link>
              <Link to={`/track/${createdGrievanceId}`} className="btn btn-primary">
                View Live Progress <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-forest)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
            <PlusCircle size={16} />
            <span>Public Civic Grievance Portal</span>
          </div>
          <h1 className="page-title">File a Municipal Grievance</h1>
          <p className="page-description">
            Submit issues directly to accountable municipal engineers. Guaranteed SLA tracking and status transparency.
          </p>
        </div>

        {/* Demo Fast-Fill Bar */}
        <div style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>
            <Sparkles size={16} color="var(--color-amber)" />
            <span>Hackathon Quick-Fill Presets:</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => loadPreset('pothole')}
              className="btn btn-ghost btn-sm"
              style={{ border: '1px solid var(--color-border-light)' }}
            >
              🚧 Pothole Incident
            </button>
            <button
              type="button"
              onClick={() => loadPreset('water')}
              className="btn btn-ghost btn-sm"
              style={{ border: '1px solid var(--color-border-light)' }}
            >
              💧 Water Pipe Burst
            </button>
            <button
              type="button"
              onClick={() => loadPreset('light')}
              className="btn btn-ghost btn-sm"
              style={{ border: '1px solid var(--color-border-light)' }}
            >
              💡 Streetlight Blackout
            </button>
          </div>
        </div>

        {/* Auth notice if citizen not logged in */}
        {!isAuthenticated && (
          <div style={{
            backgroundColor: 'var(--color-amber-light)',
            border: '1px solid var(--color-amber)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <AlertCircle size={20} color="var(--color-charcoal)" />
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Login Recommended for Verified Tracking</strong>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-charcoal)' }}>
                  Sign in or use 1-click Demo Citizen Login to receive automated SMS/status updates.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => quickLogin('citizen')}
            >
              ⚡ Quick Login as Demo Citizen
            </button>
          </div>
        )}

        {/* Main Grievance Form */}
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* 1. Category Selection */}
          <div>
            <label className="form-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
              Select Grievance Category <span className="required">*</span>
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-3)'
            }}>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;

                return (
                  <div
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      border: isSelected ? '2px solid var(--color-forest)' : '1px solid var(--color-border)',
                      backgroundColor: isSelected ? 'var(--color-bg-hover)' : 'var(--color-bg-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon size={16} color={isSelected ? 'var(--color-forest)' : 'var(--color-text-secondary)'} />
                        <strong style={{ fontSize: '0.875rem' }}>{cat.label}</strong>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '4px 0' }}>
                      {cat.desc}
                    </p>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-forest)' }}>
                      ⏱️ {cat.sla}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Grievance Title */}
          <div className="form-group">
            <label className="form-label">
              Grievance Headline / Summary <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.title ? 'error' : ''}`}
              placeholder="e.g. Broken water pipeline leaking near Sony World Signal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>

          {/* 3. Detailed Description */}
          <div className="form-group">
            <label className="form-label">
              Detailed Description & Nature of Issue <span className="required">*</span>
            </label>
            <textarea
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              placeholder="Provide specific details: size, severity, how long it has been an issue, potential hazards to traffic or pedestrians..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <span>Minimum 20 characters required</span>
              <span>{description.length} characters</span>
            </div>
            {errors.description && <span className="form-error">{errors.description}</span>}
          </div>

          {/* 4. Location Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">
                Street Address / Landmark <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  className={`form-input ${errors.location ? 'error' : ''}`}
                  placeholder="e.g. 100 Feet Road, Near Metro Pillar #42"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                />
              </div>
              {errors.location && <span className="form-error">{errors.location}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                City / Municipality <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date Noticed</label>
              <input
                type="date"
                className="form-input"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>
          </div>

          {/* SLA Commitment Card */}
          <div style={{
            backgroundColor: 'var(--color-ivory)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Clock size={20} color="var(--color-forest)" />
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Statutory Right to Service (RTS) Guarantee</strong>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  This category is bound by a maximum resolution deadline of {category.includes('water') || category.includes('sanitation') ? '24' : '48'} hours.
                </p>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-forest)', backgroundColor: 'white', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
              SLA Enforced
            </span>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  Registering Grievance...
                </>
              ) : (
                <>
                  <PlusCircle size={18} />
                  Submit Grievance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
