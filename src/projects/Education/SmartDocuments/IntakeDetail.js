import React, { useState, useEffect, useCallback } from 'react';
import './IntakeDetail.css';

const API_BASE = `${process.env.REACT_APP_SMART_DOCS_API_URL || 'https://1apxtau0t6.execute-api.ap-south-1.amazonaws.com/dev'}/application`;

const statusColor = s => ({ ELIGIBLE: '#10b981', NOT_ELIGIBLE: '#ef4444' }[s] || '#6b7280');
const recColor    = r => ({ APPROVE: '#10b981', HOLD_FOR_VERIFICATION: '#f59e0b', REVIEW_REQUIRED: '#3b82f6', REJECT: '#ef4444' }[r] || '#6b7280');
const severityColor = s => ({ HIGH: '#ef4444', MEDIUM: '#f59e0b' }[s] || '#6b7280');
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── Expanded application detail panel ──────────────────────────────────────
const AppDetailPanel = ({ app, onDecide, onDecided }) => {
  const [tab, setTab]           = useState('summary');
  const [missingData, setMissing] = useState(null);
  const [valData, setVal]         = useState(null);
  const [loadingMissing, setLM]   = useState(false);
  const [loadingVal, setLV]       = useState(false);

  const loadMissing = useCallback(async () => {
    if (missingData) return;
    setLM(true);
    try {
      const res = await fetch(`${API_BASE}/api/applications/${app.actor_id}/${app.session_id}/missing-docs`);
      setMissing(await res.json());
    } catch(e) {} finally { setLM(false); }
  }, [app, missingData]);

  const loadVal = useCallback(async () => {
    if (valData) return;
    setLV(true);
    try {
      const res = await fetch(`${API_BASE}/api/applications/${app.actor_id}/${app.session_id}/validation-results`);
      setVal(await res.json());
    } catch(e) {} finally { setLV(false); }
  }, [app, valData]);

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'docs')     loadMissing();
    if (t === 'validate') loadVal();
  };

  const stats = app.processing_statistics || {};
  const acad  = app.academic_performance  || {};

  return (
    <div className="app-card-body">
      <div className="app-detail-tabs">
        {['summary','docs','validate'].map(t => (
          <button key={t} className={`app-detail-tab ${tab===t?'active':''}`} onClick={() => handleTabChange(t)}>
            {t === 'summary' ? '📊 Summary' : t === 'docs' ? '📋 Documents' : '✓ Validation'}
          </button>
        ))}
      </div>

      <div className="detail-tab-content">
        {/* Summary Tab */}
        {tab === 'summary' && (
          <div className="summary-grid">
            <div className="summary-item"><span>Application #</span><strong>{app.application_number}</strong></div>
            <div className="summary-item"><span>Program</span><strong>{app.program || '—'}</strong></div>
            <div className="summary-item"><span>Eligibility</span>
              <span style={{ color: statusColor(app.eligibility_status), fontWeight:700 }}>{app.eligibility_status}</span>
            </div>
            <div className="summary-item"><span>AI Recommendation</span>
              <span style={{ color: recColor(app.final_recommendation), fontWeight:700 }}>{app.final_recommendation}</span>
            </div>
            <div className="summary-item"><span>CGPA</span><strong>{acad.average_cgpa || 'N/A'}</strong></div>
            <div className="summary-item"><span>Percentage</span><strong>{acad.converted_percentage ? `${acad.converted_percentage}%` : 'N/A'}</strong></div>
            <div className="summary-item"><span>Docs Processed</span><strong>{stats.documents_processed || 0}</strong></div>
            <div className="summary-item"><span>Validation Matches</span><strong>{stats.validation_matches || 0}</strong></div>
            <div className="summary-item"><span>Critical Issues</span><strong style={{color:'#ef4444'}}>{stats.critical_issues || 0}</strong></div>
            <div className="summary-item"><span>Processed On</span><strong>{fmtDate(app.processing_timestamp)}</strong></div>
            {app.admin_notes && <div className="summary-item" style={{gridColumn:'1/-1'}}><span>Admin Notes</span><strong>{app.admin_notes}</strong></div>}
          </div>
        )}

        {/* Documents Tab */}
        {tab === 'docs' && (
          loadingMissing ? <p style={{color:'#64748b'}}>Loading...</p> :
          !missingData   ? <p style={{color:'#64748b'}}>Loading documents...</p> :
          <div>
            {missingData.total_required > 0 && (
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.82rem',color:'#64748b',marginBottom:6}}>
                  <span><strong style={{color:'#1e293b'}}>{missingData.total_uploaded}</strong> of <strong style={{color:'#1e293b'}}>{missingData.total_required}</strong> required uploaded</span>
                  {missingData.intake_name && <span>{missingData.intake_name}</span>}
                </div>
                <div style={{background:'#e2e8f0',borderRadius:99,height:6}}>
                  <div style={{background:'#10b981',borderRadius:99,height:6,width:`${(missingData.total_uploaded/missingData.total_required)*100}%`,transition:'width 0.3s'}}/>
                </div>
              </div>
            )}
            <div className="docs-grid">
              {(missingData.available_documents || []).map((d,i) => (
                <div key={`a${i}`} className="doc-item available" style={{justifyContent:'space-between'}}>
                  <span>✅ {d}</span>
                  <button className="doc-view-btn-sm" onClick={() => {
                    const typeMap = {
                      'Application Form':'main','10th Marksheet':'10th_result',
                      '12th Marksheet':'12th_result','Aadhaar Card':'aadhar_card',
                      'Bachelor Marksheet':'bachelor_result',
                      'Bachelor Degree Certificate':'bachelor_degree_certificate',
                      'Work Experience Letter':'work_experience',
                      'Entrance Exam Scorecard':'entrance_exam',
                    };
                    const docType = typeMap[d] || d.toLowerCase().replace(/ /g,'_');
                    fetch(`${API_BASE}/api/applications/${app.actor_id}/${app.session_id}/view-doc?doc_type=${docType}`)
                      .then(r=>r.json())
                      .then(data=>{ if(data.url) window.open(data.url,'_blank'); })
                      .catch(()=>alert('Error loading document'));
                  }}>View</button>
                </div>
              ))}
              {(missingData.missing_documents || []).map((d,i) => (
                <div key={`m${i}`} className="doc-item missing">❌ {d} <span style={{marginLeft:'auto',fontSize:'0.72rem',color:'#dc2626'}}>Not uploaded</span></div>
              ))}
              {(missingData.extra_documents || []).map((d,i) => (
                <div key={`e${i}`} className="doc-item extra">⚠️ {d} <span style={{marginLeft:'auto',fontSize:'0.72rem'}}>Not required</span></div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Tab */}
        {tab === 'validate' && (
          loadingVal ? <p style={{color:'#64748b'}}>Loading...</p> :
          !valData   ? <p style={{color:'#64748b'}}>Loading validation...</p> :
          <div>
            {/* AI Recommendation Reason */}
            {valData.overall_recommendation?.reason && (
              <div className="reason-block rec-reason">
                <div className="reason-block-header">
                  <span className="reason-icon">🤖</span>
                  <strong>AI Recommendation: </strong>
                  <span style={{color: valData.overall_recommendation.recommendation === 'APPROVE' ? '#16a34a' : valData.overall_recommendation.recommendation === 'REJECT' ? '#dc2626' : '#d97706', fontWeight:700}}>
                    {valData.overall_recommendation.recommendation}
                  </span>
                  <span style={{fontSize:'0.75rem',color:'#94a3b8',marginLeft:8}}>Confidence: {valData.overall_recommendation.confidence}</span>
                </div>
                <p className="reason-text">{valData.overall_recommendation.reason}</p>
                {valData.overall_recommendation.action_required && (
                  <p className="reason-action">📌 Action: {valData.overall_recommendation.action_required}</p>
                )}
              </div>
            )}

            {/* Eligibility Reasons */}
            {valData.eligibility_results && (
              <div className={`reason-block ${valData.eligibility_results.eligible ? 'elig-pass' : 'elig-fail'}`}>
                <div className="reason-block-header">
                  <span className="reason-icon">{valData.eligibility_results.eligible ? '✅' : '❌'}</span>
                  <strong>Eligibility: </strong>
                  <span style={{color: valData.eligibility_results.eligible ? '#16a34a' : '#dc2626', fontWeight:700}}>
                    {valData.eligibility_results.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                  </span>
                </div>
                {valData.eligibility_results.requirements_met?.length > 0 && (
                  <div className="req-list">
                    {valData.eligibility_results.requirements_met.map((r, i) => (
                      <div key={i} className="req-item pass">✅ {r}</div>
                    ))}
                  </div>
                )}
                {valData.eligibility_results.requirements_not_met?.length > 0 && (
                  <div className="req-list">
                    {valData.eligibility_results.requirements_not_met.map((r, i) => (
                      <div key={i} className="req-item fail">❌ {r}</div>
                    ))}
                  </div>
                )}
                {valData.eligibility_results.warnings?.length > 0 && (
                  <div className="req-list">
                    {valData.eligibility_results.warnings.map((r, i) => (
                      <div key={i} className="req-item warn">⚠️ {r}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(valData.discrepancies || []).length > 0 && (
              <>
                <p style={{fontSize:'0.82rem',fontWeight:700,color:'#dc2626',margin:'12px 0 8px'}}>
                  ❌ {valData.discrepancies.length} Document Discrepancies
                </p>
                {valData.discrepancies.map((d,i) => (
                  <div key={i} className="val-item disc">
                    <div className="val-item-header">
                      <strong>{d.field}</strong>
                      <span>
                        <span style={{background:severityColor(d.severity),color:'#fff',padding:'1px 7px',borderRadius:4,fontSize:'0.7rem',fontWeight:700}}>{d.severity}</span>
                        {d.source_document && <span className="val-src"> · 📄 {d.source_document}</span>}
                      </span>
                    </div>
                    <div className="val-values">
                      <span>Application: <strong>{String(d.application_value)}</strong></span>
                      <span>Document: <strong>{String(d.document_value)}</strong></span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {(valData.matches || []).length > 0 && (
              <>
                <p style={{fontSize:'0.82rem',fontWeight:700,color:'#16a34a',margin:'12px 0 8px'}}>
                  ✅ {valData.matches.length} Matches
                </p>
                {valData.matches.map((m,i) => (
                  <div key={i} className="val-item match">
                    <div className="val-item-header">
                      <strong>{m.field}</strong>
                      {m.source_document && <span className="val-src">📄 {m.source_document}</span>}
                    </div>
                    <div className="val-values">
                      <span>Application: <strong>{String(m.application_value)}</strong></span>
                      <span>Document: <strong>{String(m.document_value)}</strong></span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Decide button */}
      {(!app.admin_decision || app.admin_decision === '' || app.admin_decision === 'PENDING') && (
        <button className="card-decide-btn" onClick={() => onDecide(app)}>⚖️ Make Decision</button>
      )}
    </div>
  );
};

// ─── Application Card ────────────────────────────────────────────────────────
const AppCard = ({ app, onDecide, onDecided }) => {
  const [expanded, setExpanded] = useState(false);

  const initials = (app.applicant_name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const adminDecision = app.admin_decision || '';

  return (
    <div className="app-card">
      <div className="app-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="app-card-left">
          <div className="app-avatar">{initials}</div>
          <div>
            <div className="app-card-name">{app.applicant_name}</div>
            <div className="app-card-sub">{app.application_number} · CGPA {app.academic_performance?.average_cgpa || 'N/A'}</div>
          </div>
        </div>
        <div className="app-card-badges">
          <span className="mini-badge" style={{ background: statusColor(app.eligibility_status) }}>
            {app.eligibility_status}
          </span>
          <span className="mini-badge" style={{ background: recColor(app.final_recommendation) }}>
            {app.final_recommendation}
          </span>
          <span className={`admin-badge ${adminDecision === 'APPROVED' ? 'approved' : adminDecision === 'REJECTED' ? 'rejected' : 'pending'}`}>
            {adminDecision || 'PENDING'}
          </span>
          <span className={`expand-icon ${expanded ? 'open' : ''}`}>▼</span>
        </div>
      </div>

      {expanded && <AppDetailPanel app={app} onDecide={onDecide} onDecided={onDecided} />}
    </div>
  );
};

// ─── Admin Decision Modal (reused from Dashboard) ────────────────────────────
const DecisionModal = ({ app, onClose, onSaved }) => {
  const [decision, setDecision] = useState('');
  const [comment, setComment]   = useState('');
  const [saving, setSaving]     = useState(false);

  const submit = async () => {
    if (!decision) { alert('Select Approve or Reject.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/applications/${app.actor_id}/${app.session_id}/decision`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reasons: [], admin_notes: comment }),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved(); onClose();
    } catch(e) { alert('Error: ' + e.message); } finally { setSaving(false); }
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
            <span>{app.application_number}</span>
          </div>
          <div className="decision-buttons">
            <button className={`decision-btn approve-btn ${decision==='APPROVED'?'selected':''}`} onClick={() => setDecision('APPROVED')}>✅ Approve</button>
            <button className={`decision-btn reject-btn ${decision==='REJECTED'?'selected':''}`} onClick={() => setDecision('REJECTED')}>❌ Reject</button>
          </div>
          <div className="comment-section">
            <label className="comment-label">Notes:</label>
            <textarea rows={3} className="comment-textarea" value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional admin notes..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="submit-decision-btn" onClick={submit} disabled={saving || !decision}>{saving ? 'Saving...' : 'Confirm Decision'}</button>
          <button className="cancel-decision-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main IntakeDetail Page ──────────────────────────────────────────────────
const IntakeDetail = ({ intake, onBack, onDecision }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [decideApp, setDecideApp]       = useState(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_BASE}/api/applications?intake_id=${intake.intake_id}&limit=200`);
      const data = await res.json();
      setApplications(data.applications || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [intake.intake_id]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const filtered = applications.filter(app => {
    if (activeFilter === 'all')      return true;
    if (activeFilter === 'approved') return app.admin_decision === 'APPROVED';
    if (activeFilter === 'rejected') return app.admin_decision === 'REJECTED';
    if (activeFilter === 'pending')  return !app.admin_decision || app.admin_decision === '' || app.admin_decision === 'PENDING';
    return true;
  });

  const counts = {
    approved: applications.filter(a => a.admin_decision === 'APPROVED').length,
    rejected: applications.filter(a => a.admin_decision === 'REJECTED').length,
    pending:  applications.filter(a => !a.admin_decision || a.admin_decision === '' || a.admin_decision === 'PENDING').length,
    total:    applications.length,
  };

  const handleDecided = () => {
    fetchApplications();
    if (onDecision) onDecision();
  };

  return (
    <div className="intake-detail">
      <button className="back-btn" onClick={onBack}>← Back to Intakes</button>

      {/* Header */}
      <div className="intake-detail-header">
        <div className="intake-detail-title">
          <h1>{intake.name}</h1>
          <p>{intake.program}</p>
          {intake.deadline && (
            <span className="deadline">
              🗓 Deadline: {new Date(intake.deadline).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
            </span>
          )}
          {intake.required_docs?.length > 0 && (
            <div className="detail-required-docs">
              <span className="detail-req-label">Required Documents:</span>
              <div className="detail-req-tags">
                {intake.required_docs.map((doc, i) => (
                  <span key={i} className="detail-req-tag">📄 {doc}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="intake-detail-stats">
          <div className="detail-stat approved"><span className="num">{counts.approved}</span><span className="lbl">Approved</span></div>
          <div className="detail-stat rejected"><span className="num">{counts.rejected}</span><span className="lbl">Rejected</span></div>
          <div className="detail-stat pending"> <span className="num">{counts.pending}</span> <span className="lbl">Pending</span></div>
          <div className="detail-stat total">   <span className="num">{counts.total}</span>   <span className="lbl">Total</span></div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="intake-filter-tabs">
        {[['all','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']].map(([val,lbl]) => (
          <button key={val} className={`filter-tab ${activeFilter===val?'active':''}`} onClick={() => setActiveFilter(val)}>
            {lbl} {val !== 'all' && `(${counts[val]})`}
          </button>
        ))}
      </div>

      {/* Applications */}
      {loading ? (
        <div className="loading-intake"><div className="loading-spinner"/><p>Loading applications...</p></div>
      ) : filtered.length === 0 ? (
        <div className="no-applications">
          <p>No {activeFilter !== 'all' ? activeFilter : ''} applications found for this intake.</p>
        </div>
      ) : (
        <div className="applications-list">
          {filtered.map((app, i) => (
            <AppCard key={i} app={app} onDecide={setDecideApp} onDecided={handleDecided} />
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {decideApp && (
        <DecisionModal
          app={decideApp}
          onClose={() => setDecideApp(null)}
          onSaved={handleDecided}
        />
      )}
    </div>
  );
};

export default IntakeDetail;
