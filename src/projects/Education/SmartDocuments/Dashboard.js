import React, { useState, useEffect, useCallback } from 'react';
import './Dashboard.css';

const API_BASE = `${process.env.REACT_APP_SMART_DOCS_API_URL || 'https://1apxtau0t6.execute-api.ap-south-1.amazonaws.com/dev'}/application`;

// ─── helpers ────────────────────────────────────────────────────────────────
const statusColor = s => ({ ELIGIBLE: '#10b981', NOT_ELIGIBLE: '#ef4444', PENDING: '#f59e0b' }[s] || '#6b7280');
const recColor    = r => ({ APPROVE: '#10b981', HOLD_FOR_VERIFICATION: '#f59e0b', REVIEW_REQUIRED: '#3b82f6', REJECT: '#ef4444' }[r] || '#6b7280');
const fmtDate     = d => new Date(d).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
const severityColor = s => ({ HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' }[s] || '#6b7280');

// ─── Admin Decision Modal ────────────────────────────────────────────────────
const DecisionModal = ({ app, onClose, onSaved }) => {
  const [decision, setDecision]       = useState('');
  const [comment, setComment]         = useState('');
  const [rejReasons, setRejReasons]   = useState([]);
  const [discrepancies, setDisc]      = useState([]);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    // Load discrepancies to offer as pre-filled rejection reasons
    fetch(`${API_BASE}/api/applications/${app.actor_id}/${app.session_id}/validation-results`)
      .then(r => r.json())
      .then(d => setDisc(d.discrepancies || []))
      .catch(() => {});
  }, [app]);

  const toggleReason = (desc) =>
    setRejReasons(r => r.includes(desc) ? r.filter(x => x !== desc) : [...r, desc]);

  const submit = async () => {
    if (!decision) { alert('Please select Approve or Reject.'); return; }
    if (decision === 'REJECTED' && rejReasons.length === 0 && !comment.trim()) {
      alert('Please provide at least one rejection reason or comment.'); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/applications/${app.actor_id}/${app.session_id}/decision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reasons: rejReasons, admin_notes: comment }),
      });
      if (!res.ok) throw new Error('Failed to save decision');
      onSaved();
      onClose();
    } catch (e) {
      alert('Error saving decision: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content decision-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚖️ Admin Decision</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="decision-applicant-info">
            <strong>{app.applicant_name}</strong>
            <span>{app.application_number} · {app.program}</span>
            <span>AI Recommendation: <span className="rec-badge" style={{ background: recColor(app.final_recommendation) }}>{app.final_recommendation}</span></span>
          </div>

          <div className="decision-buttons">
            <button
              className={`decision-btn approve-btn ${decision === 'APPROVED' ? 'selected' : ''}`}
              onClick={() => setDecision('APPROVED')}
            >✅ Approve</button>
            <button
              className={`decision-btn reject-btn ${decision === 'REJECTED' ? 'selected' : ''}`}
              onClick={() => setDecision('REJECTED')}
            >❌ Reject</button>
          </div>

          {decision === 'REJECTED' && discrepancies.length > 0 && (
            <div className="rejection-reasons">
              <label className="reasons-label">Select rejection reasons (from validation issues):</label>
              {discrepancies.map((d, i) => (
                <label key={i} className="reason-checkbox">
                  <input
                    type="checkbox"
                    checked={rejReasons.includes(d.description || d.field)}
                    onChange={() => toggleReason(d.description || d.field)}
                  />
                  <span>
                    <strong style={{ color: severityColor(d.severity) }}>[{d.severity}]</strong>{' '}
                    {d.field}: {d.description}
                    {d.source_document && <em> ({d.source_document})</em>}
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="comment-section">
            <label className="comment-label">
              {decision === 'REJECTED' ? 'Additional comments (included in rejection email):' : 'Notes (optional):'}
            </label>
            <textarea
              rows={4}
              className="comment-textarea"
              placeholder={decision === 'REJECTED' ? 'Explain rejection reasons, next steps...' : 'Optional admin notes...'}
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="submit-decision-btn" onClick={submit} disabled={saving || !decision}>
            {saving ? 'Saving...' : 'Confirm Decision'}
          </button>
          <button className="cancel-decision-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ─── Validation Modal ────────────────────────────────────────────────────────
const ValidationModal = ({ app, data, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content validation-results-modal" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>✓ Validation Results</h2>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className="validation-summary-grid">
          <div className="summary-item">
            <span className="summary-label">Overall Status:</span>
            <span className={`summary-value ${data.overall_status?.toLowerCase()}`}>{data.overall_status}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Matches:</span>
            <span className="summary-value matches">{data.matches?.length || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Discrepancies:</span>
            <span className="summary-value discrepancies">{data.discrepancies?.length || 0}</span>
          </div>
        </div>

        {/* AI Recommendation Reason */}
        {data.overall_recommendation?.reason && (
          <div className="reason-block-modal rec-reason-modal">
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
              <span>🤖 <strong>AI Recommendation:</strong></span>
              <span style={{color: data.overall_recommendation.recommendation === 'APPROVE' ? '#16a34a' : data.overall_recommendation.recommendation === 'REJECT' ? '#dc2626' : '#d97706', fontWeight:700}}>
                {data.overall_recommendation.recommendation}
              </span>
              <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>({data.overall_recommendation.confidence} confidence)</span>
            </div>
            <p style={{margin:'0 0 6px',fontSize:'0.88rem',color:'#374151'}}>{data.overall_recommendation.reason}</p>
            {data.overall_recommendation.action_required && (
              <p style={{margin:0,fontSize:'0.82rem',color:'#64748b'}}>📌 {data.overall_recommendation.action_required}</p>
            )}
          </div>
        )}

        {/* Eligibility Reasons */}
        {data.eligibility_results && (
          <div className={`reason-block-modal ${data.eligibility_results.eligible ? 'elig-pass-modal' : 'elig-fail-modal'}`}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
              <span>{data.eligibility_results.eligible ? '✅' : '❌'} <strong>Eligibility:</strong></span>
              <span style={{color: data.eligibility_results.eligible ? '#16a34a' : '#dc2626', fontWeight:700}}>
                {data.eligibility_results.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
              </span>
            </div>
            {data.eligibility_results.requirements_met?.map((r,i) => (
              <div key={i} style={{fontSize:'0.82rem',color:'#16a34a',padding:'2px 0'}}>✅ {r}</div>
            ))}
            {data.eligibility_results.requirements_not_met?.map((r,i) => (
              <div key={i} style={{fontSize:'0.82rem',color:'#dc2626',padding:'2px 0'}}>❌ {r}</div>
            ))}
            {data.eligibility_results.warnings?.map((r,i) => (
              <div key={i} style={{fontSize:'0.82rem',color:'#d97706',padding:'2px 0'}}>⚠️ {r}</div>
            ))}
          </div>
        )}

        {data.discrepancies?.length > 0 && (
          <div className="validation-section discrepancies-section">
            <h3>❌ Document Discrepancies</h3>
            {data.discrepancies.map((d, i) => (
              <div key={i} className="validation-item discrepancy-item">
                <div className="validation-item-header">
                  <strong>{d.field}</strong>
                  <span className="severity-badge" style={{ background: severityColor(d.severity) }}>{d.severity}</span>
                  {d.source_document && <span className="source-doc-badge">📄 {d.source_document}</span>}
                </div>
                <div className="value-row">
                  <span className="value-label">Application:</span>
                  <span className="value-text app-value">{String(d.application_value)}</span>
                </div>
                <div className="value-row">
                  <span className="value-label">Document:</span>
                  <span className="value-text doc-value">{String(d.document_value)}</span>
                </div>
                {d.description && <p className="disc-description">{d.description}</p>}
              </div>
            ))}
          </div>
        )}

        {data.matches?.length > 0 && (
          <div className="validation-section matches-section">
            <h3>✅ Matches ({data.matches.length})</h3>
            {data.matches.map((m, i) => (
              <div key={i} className="validation-item match-item">
                <div className="validation-item-header">
                  <strong>{m.field}</strong>
                  {m.source_document && <span className="source-doc-badge">📄 {m.source_document}</span>}
                </div>
                <div className="value-row">
                  <span className="value-label">Application:</span>
                  <span className="value-text">{String(m.application_value)}</span>
                </div>
                <div className="value-row">
                  <span className="value-label">Document:</span>
                  <span className="value-text">{String(m.document_value)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const Dashboard = ({ onDecision }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [applications, setApplications]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterStatus, setFilterStatus]           = useState('all');
  const [filterRecommendation, setFilterRecommendation] = useState('all');

  // Modals
  const [detailApp,     setDetailApp]     = useState(null);
  const [jsonApp,       setJsonApp]       = useState(null);
  const [missingApp,    setMissingApp]    = useState(null);
  const [validateApp,   setValidateApp]   = useState(null);
  const [decisionApp,   setDecisionApp]   = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/dashboard/stats`);
      const data = await res.json();
      setDashboardData(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchApplications = useCallback(async (name = '', appNum = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: 100, status: filterStatus, recommendation: filterRecommendation });
      if (name)   params.set('name', name);
      if (appNum) params.set('application_number', appNum);
      const res  = await fetch(`${API_BASE}/api/applications?${params}`);
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (e) {
      console.error(e); setApplications([]);
    } finally { setLoading(false); }
  }, [filterStatus, filterRecommendation]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleSearch = () => {
    // Detect if the search term looks like an application number (starts with letters+digits)
    const looksLikeAppNum = /^[A-Za-z]{1,4}\d/i.test(searchTerm.trim());
    if (looksLikeAppNum) {
      fetchApplications('', searchTerm.trim());
    } else {
      fetchApplications(searchTerm.trim(), '');
    }
  };

  // Card click → apply filter
  const handleCardClick = (statusF, recF) => {
    if (statusF)  setFilterStatus(statusF);
    if (recF)     setFilterRecommendation(recF);
  };

  // Load modal data
  const loadDetail = async (app) => {
    const res  = await fetch(`${API_BASE}/api/applications/${app.actor_id}/${app.session_id}`);
    const data = await res.json();
    setDetailApp({ app, data });
  };
  const loadJson = async (app) => {
    const res  = await fetch(`${API_BASE}/api/applications/${app.actor_id}/${app.session_id}`);
    const data = await res.json();
    setJsonApp({ app, data });
  };
  const loadMissing = async (app) => {
    const res  = await fetch(`${API_BASE}/api/applications/${app.actor_id}/${app.session_id}/missing-docs`);
    const data = await res.json();
    setMissingApp({ app, data });
  };
  const loadValidation = async (app) => {
    const res  = await fetch(`${API_BASE}/api/applications/${app.actor_id}/${app.session_id}/validation-results`);
    const data = await res.json();
    setValidateApp({ app, data });
  };

  const adminDecision = (app) => setDecisionApp(app);

  if (loading && !dashboardData) return (
    <div className="dashboard-loading"><div className="loading-spinner"/><p>Loading dashboard...</p></div>
  );

  const ov = dashboardData?.overview || {};

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Document Processing Dashboard</h1>
        <p>Real-time application processing and validation status</p>
      </div>

      {/* Stats cards — clickable to filter, now shows admin decision stats */}
      {dashboardData && (
        <div className="stats-grid">
          <div className="stat-card clickable" title="Show all" onClick={() => handleCardClick('all', 'all')}>
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{ov.total_applications || 0}</h3>
              <p>Total Applications</p>
            </div>
          </div>
          <div className="stat-card eligible clickable" title="Filter eligible" onClick={() => handleCardClick('eligible', 'all')}>
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{ov.eligible_applications || 0}</h3>
              <p>Eligible</p>
              <span className="stat-percentage">{ov.eligibility_rate || 0}%</span>
            </div>
          </div>
          <div className="stat-card approved clickable" title="Filter admin approved" onClick={() => handleCardClick('all', 'all')}>
            <div className="stat-icon">🎓</div>
            <div className="stat-content">
              <h3>{ov.admin_approved || 0}</h3>
              <p>Admin Approved</p>
            </div>
          </div>
          <div className="stat-card pending clickable" title="Pending admin review" onClick={() => handleCardClick('all', 'all')}>
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <h3>{ov.admin_pending || 0}</h3>
              <p>Pending Review</p>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="dashboard-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by name or application number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-btn">🔍 Search</button>
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => { setSearchTerm(''); fetchApplications(); }}>✕</button>
          )}
        </div>
        <div className="filter-section">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
            <option value="all">All Status</option>
            <option value="eligible">Eligible</option>
            <option value="not_eligible">Not Eligible</option>
          </select>
          <select value={filterRecommendation} onChange={e => setFilterRecommendation(e.target.value)} className="filter-select">
            <option value="all">All Recommendations</option>
            <option value="approve">Approved</option>
            <option value="hold">Hold for Verification</option>
            <option value="review">Review Required</option>
            <option value="reject">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="applications-section">
        <h2>Applications ({applications.length})</h2>
        {loading ? (
          <div className="table-loading"><div className="loading-spinner"/><p>Loading...</p></div>
        ) : (
          <div className="applications-table-container">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Applicant Name</th>
                  <th>Application #</th>
                  <th>Program</th>
                  <th>Eligibility</th>
                  <th>AI Recommendation</th>
                  <th>Admin Decision</th>
                  <th>CGPA</th>
                  <th>Processed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, i) => (
                  <tr key={i} className="application-row">
                    <td className="applicant-name">
                      <strong>{app.applicant_name}</strong>
                      <small>{app.actor_id}</small>
                    </td>
                    <td>{app.application_number}</td>
                    <td className="program-cell"><span className="program-name">{app.program}</span></td>
                    <td>
                      <span className="status-badge" style={{ background: statusColor(app.eligibility_status) }}>
                        {app.eligibility_status}
                      </span>
                    </td>
                    <td>
                      <span className="recommendation-badge" style={{ background: recColor(app.final_recommendation) }}>
                        {app.final_recommendation}
                      </span>
                    </td>
                    <td>
                      {app.admin_decision ? (
                        <span className="recommendation-badge" style={{ background: app.admin_decision === 'APPROVED' ? '#10b981' : '#ef4444' }}>
                          {app.admin_decision}
                        </span>
                      ) : (
                        <span className="pending-decision-badge">Pending</span>
                      )}
                    </td>
                    <td>
                      {app.academic_performance?.average_cgpa ? (
                        <div className="cgpa-cell">
                          <strong>{app.academic_performance.average_cgpa}</strong>
                          {app.academic_performance.converted_percentage && (
                            <small>({app.academic_performance.converted_percentage}%)</small>
                          )}
                        </div>
                      ) : <span className="no-data">N/A</span>}
                    </td>
                    <td>{fmtDate(app.processing_timestamp)}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => loadDetail(app)} className="action-btn details-btn" title="Formatted Details">
                          <span className="btn-icon">👁️</span><span className="btn-text">Details</span>
                        </button>
                        <button onClick={() => loadJson(app)} className="action-btn json-btn" title="Raw JSON">
                          <span className="btn-icon">📄</span><span className="btn-text">JSON</span>
                        </button>
                        <button onClick={() => loadMissing(app)} className="action-btn missing-btn" title="Missing Docs">
                          <span className="btn-icon">📋</span><span className="btn-text">Missing</span>
                        </button>
                        <button onClick={() => loadValidation(app)} className="action-btn validation-btn" title="Validation">
                          <span className="btn-icon">✓</span><span className="btn-text">Validate</span>
                        </button>
                        <button onClick={() => adminDecision(app)} className="action-btn decide-btn" title="Admin Decision">
                          <span className="btn-icon">⚖️</span><span className="btn-text">Decide</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {applications.length === 0 && (
              <div className="no-applications"><p>No applications found.</p></div>
            )}
          </div>
        )}
      </div>

      {/* ── Details Modal (formatted) ── */}
      {detailApp && (
        <div className="modal-overlay" onClick={() => setDetailApp(null)}>
          <div className="modal-content detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👁️ Application Details</h2>
              <button className="modal-close" onClick={() => setDetailApp(null)}>×</button>
            </div>
            <div className="modal-body">
              {(() => {
                const fr = detailApp.data?.data?.final_response || {};
                const stats = fr.processing_statistics || {};
                return (
                  <div className="detail-formatted">
                    <div className="detail-section">
                      <h3>Applicant</h3>
                      <div className="detail-grid">
                        <div><span>Name</span><strong>{fr.applicant_name || '—'}</strong></div>
                        <div><span>Application #</span><strong>{fr.application_number || '—'}</strong></div>
                        <div><span>Program</span><strong>{fr.program || '—'}</strong></div>
                        <div><span>Processed</span><strong>{fr.processing_timestamp ? fmtDate(fr.processing_timestamp) : '—'}</strong></div>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h3>Assessment</h3>
                      <div className="detail-grid">
                        <div><span>Eligibility</span>
                          <span className="status-badge" style={{ background: statusColor(fr.eligibility_status) }}>{fr.eligibility_status}</span>
                        </div>
                        <div><span>Validation</span><strong>{fr.validation_status}</strong></div>
                        <div><span>Recommendation</span>
                          <span className="recommendation-badge" style={{ background: recColor(fr.final_recommendation) }}>{fr.final_recommendation}</span>
                        </div>
                        <div><span>Confidence</span><strong>{fr.confidence_level}</strong></div>
                        <div><span>Action Required</span><strong>{fr.action_required}</strong></div>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h3>Academic Performance</h3>
                      <div className="detail-grid">
                        <div><span>Average CGPA</span><strong>{fr.academic_performance?.average_cgpa || 'N/A'}</strong></div>
                        <div><span>Converted %</span><strong>{fr.academic_performance?.converted_percentage || 'N/A'}%</strong></div>
                      </div>
                    </div>
                    <div className="detail-section">
                      <h3>Processing Statistics</h3>
                      <div className="detail-grid">
                        <div><span>Docs Processed</span><strong>{stats.documents_processed}</strong></div>
                        <div><span>Validation Matches</span><strong>{stats.validation_matches}</strong></div>
                        <div><span>Critical Issues</span><strong style={{ color: '#ef4444' }}>{stats.critical_issues}</strong></div>
                        <div><span>Minor Issues</span><strong style={{ color: '#f59e0b' }}>{stats.minor_issues}</strong></div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── JSON Modal ── */}
      {jsonApp && (
        <div className="modal-overlay" onClick={() => setJsonApp(null)}>
          <div className="modal-content json-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 Raw JSON</h2>
              <div className="modal-actions">
                <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(JSON.stringify(jsonApp.data, null, 2)); alert('Copied!'); }}>📋 Copy</button>
                <button className="download-btn" onClick={() => {
                  const blob = new Blob([JSON.stringify(jsonApp.data, null, 2)], { type: 'application/json' });
                  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `app_${jsonApp.app.application_number}.json` });
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                }}>💾 Download</button>
                <button className="modal-close" onClick={() => setJsonApp(null)}>×</button>
              </div>
            </div>
            <div className="modal-body"><pre className="json-display">{JSON.stringify(jsonApp.data, null, 2)}</pre></div>
          </div>
        </div>
      )}

      {/* ── Missing Docs Modal ── */}
      {missingApp && (
        <div className="modal-overlay" onClick={() => setMissingApp(null)}>
          <div className="modal-content missing-docs-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Document Checklist</h2>
              <button className="modal-close" onClick={() => setMissingApp(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Progress bar */}
              {missingApp.data.total_required > 0 && (
                <div className="doc-progress-section">
                  <div className="doc-progress-label">
                    <span><strong>{missingApp.data.total_uploaded}</strong> of <strong>{missingApp.data.total_required}</strong> required documents uploaded</span>
                    {missingApp.data.intake_name && <span className="intake-tag">{missingApp.data.intake_name}</span>}
                  </div>
                  <div className="doc-progress-bar">
                    <div className="doc-progress-fill" style={{ width: `${(missingApp.data.total_uploaded / missingApp.data.total_required) * 100}%` }}/>
                  </div>
                </div>
              )}

              {/* Two-column grid: Available | Missing */}
              <div className="doc-checklist-grid">
                {/* Available */}
                {(missingApp.data.available_documents || []).map((d, i) => (
                  <div key={`a${i}`} className="doc-checklist-item available">
                    <span className="doc-check">✅</span>
                    <span className="doc-name">{d}</span>
                    <button className="doc-view-btn" onClick={() => {
                      const typeMap = {
                        'Application Form': 'main', '10th Marksheet': '10th_result',
                        '12th Marksheet': '12th_result', 'Aadhaar Card': 'aadhar_card',
                        'Bachelor Marksheet': 'bachelor_result',
                        'Bachelor Degree Certificate': 'bachelor_degree_certificate',
                        'Work Experience Letter': 'work_experience',
                        'Entrance Exam Scorecard': 'entrance_exam',
                      };
                      const docType = typeMap[d] || d.toLowerCase().replace(/ /g,'_');
                      fetch(`${API_BASE}/api/applications/${missingApp.app.actor_id}/${missingApp.app.session_id}/view-doc?doc_type=${docType}`)
                        .then(r => r.json())
                        .then(data => { if (data.url) window.open(data.url, '_blank'); else alert('Could not load document'); })
                        .catch(() => alert('Error loading document'));
                    }}>View</button>
                  </div>
                ))}
                {/* Missing */}
                {(missingApp.data.missing_documents || []).map((d, i) => (
                  <div key={`m${i}`} className="doc-checklist-item missing">
                    <span className="doc-check">❌</span>
                    <span className="doc-name">{d}</span>
                    <span className="doc-status-tag missing-tag">Not Uploaded</span>
                  </div>
                ))}
                {/* Extra */}
                {(missingApp.data.extra_documents || []).map((d, i) => (
                  <div key={`e${i}`} className="doc-checklist-item extra">
                    <span className="doc-check">⚠️</span>
                    <span className="doc-name">{d}</span>
                    <span className="doc-status-tag extra-tag">Not Required</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Validation Modal ── */}
      {validateApp && <ValidationModal app={validateApp.app} data={validateApp.data} onClose={() => setValidateApp(null)} />}

      {/* ── Admin Decision Modal ── */}
      {decisionApp && (
        <DecisionModal
          app={decisionApp}
          onClose={() => setDecisionApp(null)}
          onSaved={() => { fetchApplications(); fetchDashboard(); if (onDecision) onDecision(); }}
        />
      )}
    </div>
  );
};

export default Dashboard;
