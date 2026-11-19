import React, { useState, useEffect, useCallback } from 'react';
import './Intakes.css';

const API_BASE_URL = `${process.env.REACT_APP_SMART_DOCS_API_URL || 'https://1apxtau0t6.execute-api.ap-south-1.amazonaws.com/dev'}/application`;

const REQUIRED_DOC_OPTIONS = [
  { value: 'Application Form',           label: 'Application Form' },
  { value: '10th Marksheet',             label: '10th Marksheet' },
  { value: '12th Marksheet',             label: '12th Marksheet' },
  { value: 'Aadhaar Card',               label: 'Aadhaar Card' },
  { value: 'Bachelor Marksheet',         label: 'Bachelor Marksheet (Semester-wise)' },
  { value: 'Bachelor Degree Certificate',label: 'Bachelor Degree Certificate' },
  { value: 'Work Experience Letter',     label: 'Work Experience Letter' },
  { value: 'Entrance Exam Scorecard',    label: 'Entrance Exam Scorecard' },
  { value: 'Domicile Certificate',       label: 'Domicile Certificate' },
  { value: 'Passport Photo',             label: 'Passport Photo' },
];

const PROGRAM_OPTIONS = [
  'MBA IN ADVANCED CONSTRUCTION MANAGEMENT',
  'PG DIP IN QUANTITY SURVEYING AND CONTRACT MANAGEMENT',
  'MBA IN PROJECT ENGINEERING & MANAGEMENT',
  'MBA IN REAL ESTATE AND URBAN INFRASTRUCTURE MANAGEMENT',
  'PG DIPLOMA IN ASSET AND FACILITIES MANAGEMENT',
  'MASTER OF PLANNING (URBAN PLANNING)',
  'MBA IN SUSTAINABLE ENERGY MANAGEMENT',
  'MBA IN ENVIRONMENTAL SUSTAINABILITY',
  'M.TECH IN CONSTRUCTION TECHNOLOGY AND MANAGEMENT',
  'M.TECH IN INFRASTRUCTURE PROJECT MANAGEMENT',
  'MBA',
  'MBA IN FAMILY BUSINESS AND ENTREPRENEURSHIP',
];

const emptyForm = {
  name: '',
  program: '',
  required_docs: [],
  deadline: '',
  description: '',
};

const Intakes = ({ refreshKey, onSelectIntake }) => {
  const [intakes, setIntakes]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [selectedIntake, setSelectedIntake] = useState(null);

  const fetchIntakes = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_BASE_URL}/api/intakes`);
      const data = await res.json();
      setIntakes(data.intakes || []);
    } catch (e) {
      console.error('Error fetching intakes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIntakes(); }, [fetchIntakes]);

  // Re-fetch when a decision is made in Dashboard
  useEffect(() => {
    if (refreshKey) fetchIntakes();
  }, [refreshKey, fetchIntakes]);

  const toggleDoc = (val) => {
    setForm(f => ({
      ...f,
      required_docs: f.required_docs.includes(val)
        ? f.required_docs.filter(d => d !== val)
        : [...f.required_docs, val],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.program || form.required_docs.length === 0 || !form.deadline) {
      alert('Please fill in name, program, deadline and select at least one required document.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/intakes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create intake');
      setForm(emptyForm);
      setShowForm(false);
      fetchIntakes();
    } catch (e) {
      alert('Failed to create intake: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':   return '#10b981';
      case 'CLOSED':   return '#ef4444';
      case 'ARCHIVED': return '#6b7280';
      default:         return '#f59e0b';
    }
  };

  const toggleStatus = async (intake) => {
    const nextStatus = intake.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    try {
      await fetch(`${API_BASE_URL}/api/intakes/${intake.intake_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchIntakes();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="intakes-page">
      <div className="intakes-header">
        <div>
          <h1>Admission Intakes</h1>
          <p>Manage admission drives and track application progress per intake</p>
        </div>
        <button className="create-intake-btn" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '+ New Intake'}
        </button>
      </div>

      {/* Create Intake Form */}
      {showForm && (
        <div className="intake-form-card">
          <h2>Create New Intake</h2>
          <form onSubmit={handleSubmit} className="intake-form">
            <div className="form-row">
              <div className="form-group">
                <label>Intake Name *</label>
                <input
                  type="text"
                  placeholder="e.g. MBA 2026-27 Admission"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Program *</label>
                <select
                  value={form.program}
                  onChange={e => setForm(f => ({ ...f, program: e.target.value }))}
                  required
                >
                  <option value="">Select program...</option>
                  {PROGRAM_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Application Deadline *</label>
                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Optional notes..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Required Documents * (select all that apply)</label>
              <div className="docs-checkbox-grid">
                {REQUIRED_DOC_OPTIONS.map(opt => (
                  <label key={opt.value} className="doc-checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.required_docs.includes(opt.value)}
                      onChange={() => toggleDoc(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={saving}>
                {saving ? 'Creating...' : 'Create Intake'}
              </button>
              <button type="button" className="cancel-btn" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Intakes List */}
      {loading ? (
        <div className="intakes-loading"><div className="loading-spinner" /><p>Loading intakes...</p></div>
      ) : intakes.length === 0 ? (
        <div className="no-intakes">
          <div className="no-intakes-icon">📋</div>
          <h3>No intakes yet</h3>
          <p>Create your first admission intake to get started.</p>
        </div>
      ) : (
        <div className="intakes-grid">
          {intakes.map(intake => (
            <div key={intake.intake_id} className="intake-card" onClick={() => onSelectIntake ? onSelectIntake(intake) : setSelectedIntake(selectedIntake?.intake_id === intake.intake_id ? null : intake)}>
              <div className="intake-card-header">
                <div>
                  <h3>{intake.name}</h3>
                  <p className="intake-program">{intake.program}</p>
                </div>
                <span className="intake-status-badge" style={{ backgroundColor: getStatusColor(intake.status) }}>
                  {intake.status}
                </span>
              </div>

              <div className="intake-stats-row">
                <div className="intake-stat approved">
                  <span className="stat-num">{intake.stats?.approved || 0}</span>
                  <span className="stat-lbl">Approved</span>
                </div>
                <div className="intake-stat rejected">
                  <span className="stat-num">{intake.stats?.rejected || 0}</span>
                  <span className="stat-lbl">Rejected</span>
                </div>
                <div className="intake-stat pending">
                  <span className="stat-num">{intake.stats?.pending || 0}</span>
                  <span className="stat-lbl">Pending</span>
                </div>
                <div className="intake-stat total">
                  <span className="stat-num">{intake.stats?.total || 0}</span>
                  <span className="stat-lbl">Total</span>
                </div>
              </div>

              {intake.deadline && (
                <div className="intake-deadline">
                  🗓 Deadline: {new Date(intake.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* Required documents list */}
              {intake.required_docs?.length > 0 && (
                <div className="intake-required-docs">
                  <span className="req-docs-label">Required Documents:</span>
                  <div className="req-docs-tags">
                    {intake.required_docs.map((doc, i) => (
                      <span key={i} className="req-doc-tag">📄 {doc}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedIntake?.intake_id === intake.intake_id && (
                <div className="intake-expanded" onClick={e => e.stopPropagation()}>
                  <div className="intake-docs">
                    <strong>Required Documents:</strong>
                    <ul>
                      {(intake.required_docs || []).map(d => <li key={d}>✅ {d}</li>)}
                    </ul>
                  </div>
                  {intake.description && <p className="intake-description">{intake.description}</p>}
                  <div className="intake-actions">
                    <button
                      className={`toggle-status-btn ${intake.status === 'ACTIVE' ? 'close-btn' : 'open-btn'}`}
                      onClick={() => toggleStatus(intake)}
                    >
                      {intake.status === 'ACTIVE' ? '🔒 Close Intake' : '🔓 Reopen Intake'}
                    </button>
                    <small className="intake-id-label">ID: {intake.intake_id}</small>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Intakes;
