import React, { useState, useEffect } from 'react';
import './BatchFileUploader.css';

const API_BASE_URL = `${process.env.REACT_APP_SMART_DOCS_API_URL || 'https://1apxtau0t6.execute-api.ap-south-1.amazonaws.com/dev'}/application`;
const UPLOAD_API_URL = `${process.env.REACT_APP_SMART_DOCS_API_URL || 'https://1apxtau0t6.execute-api.ap-south-1.amazonaws.com/dev'}/upload`;

const BatchFileUploader = ({ actorId }) => {
  const [files, setFiles]             = useState([]);
  const [sessionId]                   = useState(`sess_${Date.now()}`);
  const [status, setStatus]           = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Intake selection
  const [intakes, setIntakes]         = useState([]);
  const [selectedIntake, setSelectedIntake] = useState('');
  const [loadingIntakes, setLoadingIntakes] = useState(true);

  useEffect(() => {
    const fetchIntakes = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/api/intakes?status=ACTIVE`);
        const data = await res.json();
        setIntakes(data.intakes || []);
      } catch (e) {
        console.error('Failed to load intakes', e);
      } finally {
        setLoadingIntakes(false);
      }
    };
    fetchIntakes();
  }, []);

  const onFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setStatus('');
  };

  const removeFile = (index) => setFiles(files.filter((_, i) => i !== index));

  const startUpload = async () => {
    if (!selectedIntake) {
      alert('Please select an intake before uploading.');
      return;
    }
    if (files.length === 0) {
      alert('Please select files first!');
      return;
    }

    setIsUploading(true);
    setStatus(`Getting upload permissions for ${files.length} files...`);
    setUploadProgress(0);

    try {
      const response = await fetch(UPLOAD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor_id: actorId,
          session_id: sessionId,
          intake_id: selectedIntake,
          file_names: files.map(f => f.name),
        }),
      });

      const { uploadUrls } = await response.json();

      setStatus(`Uploading ${files.length} files...`);
      await Promise.all(
        files.map((file, i) =>
          fetch(uploadUrls[i], {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': 'application/pdf' },
          })
        )
      );

      setUploadProgress(100);
      const intakeName = intakes.find(i => i.intake_id === selectedIntake)?.name || selectedIntake;
      setStatus(`✅ All ${files.length} files uploaded for intake "${intakeName}". Processing started.`);
    } catch (err) {
      setStatus('❌ Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="batch-uploader">
      <div className="uploader-header">
        <div className="header-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        </div>
        <h2>Document Upload Center</h2>
        <p>Upload PDF documents for automated processing and analysis</p>
      </div>

      {/* Step 1: Select Intake */}
      <div className="intake-selector-section">
        <h3 className="step-label">Step 1 — Select Admission Intake</h3>
        {loadingIntakes ? (
          <p className="loading-text">Loading active intakes...</p>
        ) : intakes.length === 0 ? (
          <div className="no-intakes-warning">
            ⚠️ No active intake available. An admin needs to create an intake from the <strong>Intakes</strong> tab before documents can be uploaded.
          </div>
        ) : (
          <div className="intake-cards-row">
            {intakes.map(intake => (
              <div
                key={intake.intake_id}
                className={`intake-select-card ${selectedIntake === intake.intake_id ? 'selected' : ''}`}
                onClick={() => setSelectedIntake(intake.intake_id)}
              >
                <div className="intake-select-name">{intake.name}</div>
                <div className="intake-select-program">{intake.program}</div>
                {intake.deadline && (
                  <div className="intake-select-deadline">
                    🗓 {new Date(intake.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
                {selectedIntake === intake.intake_id && <div className="intake-selected-tick">✓</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Select Files — only show when an intake is selected */}
      {selectedIntake && (
      <div className="upload-section">
        <h3 className="step-label">Step 2 — Select Documents</h3>
        <div className="file-input-wrapper">
          <input
            type="file"
            multiple
            onChange={onFileChange}
            accept="application/pdf"
            className="file-input"
            id="file-upload"
            disabled={isUploading}
          />
          <label htmlFor="file-upload" className="file-input-label">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Choose PDF Files
          </label>
        </div>

        {files.length > 0 && (
          <div className="file-list">
            <h3>Selected Files ({files.length})</h3>
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <button onClick={() => removeFile(index)} className="remove-btn" disabled={isUploading}>×</button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={startUpload}
          disabled={files.length === 0 || isUploading}
          className="upload-btn"
        >
          {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
        </button>
      </div>
      )}

      {status && (
        <div className={`status-section ${status.includes('✅') ? 'success' : status.includes('❌') ? 'error' : 'info'}`}>
          <p>{status}</p>
          {isUploading && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
        </div>
      )}

      <div className="session-info">
        <small>Session ID: {sessionId}</small>
      </div>
    </div>
  );
};

export default BatchFileUploader;
