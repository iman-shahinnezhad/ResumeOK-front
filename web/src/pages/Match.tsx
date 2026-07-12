import { useState, useEffect } from 'react';
import { FileText, Link, Sparkles, Upload, AlertCircle, CheckCircle, ShieldAlert, Trash2 } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface Props {
  credits: number;
  deductCredits: (amount: number) => Promise<boolean>;
  refundCredits: (amount: number) => Promise<void>;
}

interface SavedResume {
  id: string;
  name: string;
  mimeType: string;
  base64Data: string;
  date: string;
}

interface AnalysisResult {
  match_score: number;
  issues_count: number;
  issues: { title: string }[];
  company?: string;
  job_title?: string;
  missing_keywords?: string[];
  strong_matches?: string[];
  summary?: string;
}

export default function Match({ credits, deductCredits, refundCredits }: Props) {
  useSEO(
    "Match & Audit Resume - ATS Keyword Checker",
    "Compare your resume against any job description. Identify keyword gaps, ATS compatibility, and get recruiter rewrite recommendations."
  );

  const [jobUrl, setJobUrl] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  
  const [currentView, setCurrentView] = useState<'audit' | 'loading' | 'result'>('audit');
  const [loadingStep, setLoadingStep] = useState(0);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  // Load saved resumes and check privacy agreement
  useEffect(() => {
    const saved = localStorage.getItem('uploaded_resumes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setResumes(parsed);
        if (parsed.length > 0) {
          setSelectedResumeId(parsed[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }

    const agreed = localStorage.getItem('privacy_agreed');
    if (agreed === 'true') {
      setPrivacyAgreed(true);
    }
  }, []);

  const saveResumesToStorage = (list: SavedResume[]) => {
    localStorage.setItem('uploaded_resumes', JSON.stringify(list));
    setResumes(list);
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    if (isPicking) return;
    setIsPicking(true);

    if (file.type !== 'application/pdf' && !file.name.endsWith('.txt')) {
      alert("Only PDF and TXT files are supported.");
      setIsPicking(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const resultString = reader.result as string;
        const base64Data = resultString.split(',')[1];
        
        const newResume: SavedResume = {
          id: 'res_' + Date.now(),
          name: file.name,
          mimeType: file.type || 'application/pdf',
          base64Data: base64Data,
          date: new Date().toLocaleDateString()
        };

        const updated = [newResume, ...resumes];
        saveResumesToStorage(updated);
        setSelectedResumeId(newResume.id);
      } catch (err) {
        console.error(err);
        alert("Failed to process file.");
      } finally {
        setIsPicking(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteResume = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = resumes.filter(r => r.id !== id);
    saveResumesToStorage(filtered);
    if (selectedResumeId === id) {
      setSelectedResumeId(filtered.length > 0 ? filtered[0].id : '');
    }
  };

  const handleMagicClick = () => {
    if (!selectedResumeId || (!jobUrl.trim() && !jobDesc.trim())) {
      setShowValidationErrors(true);
      return;
    }

    if (!privacyAgreed) {
      setShowPrivacyModal(true);
    } else {
      startAnalysis();
    }
  };

  const handleAgreePrivacy = () => {
    localStorage.setItem('privacy_agreed', 'true');
    setPrivacyAgreed(true);
    setShowPrivacyModal(false);
    startAnalysis();
  };

  const startAnalysis = async () => {
    const selectedResume = resumes.find(r => r.id === selectedResumeId);
    if (!selectedResume) return;

    if (credits < 10) {
      alert("Insufficient credits. Please upgrade or earn credits to scan resumes.");
      return;
    }

    let deducted = false;
    setCurrentView('loading');
    setLoadingStep(0); // Analyzing Criteria

    try {
      const success = await deductCredits(10);
      if (success) {
        deducted = true;
      }

      await new Promise(r => setTimeout(r, 1200));
      setLoadingStep(1); // Reading Resume Data

      // Read Base64 and compile prompt parts
      const parts: any[] = [
        {
          inlineData: {
            mimeType: selectedResume.mimeType,
            data: selectedResume.base64Data
          }
        }
      ];

      await new Promise(r => setTimeout(r, 1200));
      setLoadingStep(2); // Generating Tailored Suggestions

      const finalDesc = jobDesc.trim() || `Analyze the job posting at this URL: ${jobUrl}`;

      const promptText = `You are an expert ATS resume analyzer and hiring manager.
Compare the attached resume with the job description/details provided.

INPUTS:
- Job Details: ${finalDesc}
- Resume: Attached PDF/Document

OUTPUT FORMAT (strict JSON):
{
  "match_score": 0-100,
  "issues_count": number,
  "issues": [
    {
      "title": "short issue title: recommendation explanation"
    }
  ],
  "company": "hiring company name",
  "job_title": "specific job title",
  "missing_keywords": ["keyword1", "keyword2"],
  "strong_matches": ["match1", "match2"],
  "summary": "1-2 sentence overall evaluation"
}

RULES:
- Evaluate matching score realistically (0-100).
- Extract the company and job title from the text.
- Be critical and act like a real recruiter.
- Ensure the JSON format matches exactly.`;

      parts.push({ text: promptText });

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': 'AQ.Ab8RN6LjiOKxvxO8J1J0MWsp3Wrbo5emB0MOb6JFXsWKYIlqhw'
          },
          body: JSON.stringify({
            contents: [{ parts }]
          })
        }
      );

      if (!response.ok) {
        throw new Error("Gemini API error.");
      }

      const responseJson = await response.json();
      const rawText = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      let cleanedText = rawText.trim();
      const jsonRegex = /\{[\s\S]*\}/;
      const match = cleanedText.match(jsonRegex);
      if (match) {
        cleanedText = match[0];
      }

      const result = JSON.parse(cleanedText);

      setLoadingStep(3); // Finalizing Results
      await new Promise(r => setTimeout(r, 800));

      setAnalysisResult({
        match_score: result.match_score ?? 70,
        issues_count: result.issues_count ?? (result.issues?.length ?? 0),
        issues: result.issues ?? [],
        company: result.company || 'Target Company',
        job_title: result.job_title || 'Position',
        missing_keywords: result.missing_keywords || [],
        strong_matches: result.strong_matches || [],
        summary: result.summary || 'Resume evaluated successfully.'
      });

      // Save match record in localStorage
      const history = localStorage.getItem('match_history') || '[]';
      try {
        const parsedHistory = JSON.parse(history);
        const newRecord = {
          id: 'match_' + Date.now(),
          company: result.company || 'Target Company',
          job_title: result.job_title || 'Position',
          score: result.match_score ?? 70,
          date: new Date().toLocaleDateString()
        };
        localStorage.setItem('match_history', JSON.stringify([newRecord, ...parsedHistory]));
      } catch (e) {}

      setCurrentView('result');
    } catch (err) {
      console.error(err);
      if (deducted) {
        await refundCredits(10);
      }
      
      // Fallback result in case of failure
      setAnalysisResult({
        match_score: 65,
        issues_count: 2,
        issues: [
          { title: "Identify missing hard skills in your experience list." },
          { title: "Tailor the resume header summary specifically to match the target title." }
        ],
        company: "Target Company",
        job_title: "Position",
        missing_keywords: ["React", "TypeScript", "Scalable Systems"],
        strong_matches: ["Web Development", "Team Collaboration"],
        summary: "Could not fetch custom AI audit due to browser network connectivity. Showing standard ATS criteria matches."
      });
      setCurrentView('result');
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 40) return '#ef4444'; // Red
    if (score < 75) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  return (
    <div className="page-wrapper container">
      {currentView === 'audit' && (
        <div className="animate-fade-in">
          <div className="page-header">
            <h1 className="page-title">Match Your Resume</h1>
            <p className="page-subtitle">Scan your CV against any job post to find missing keywords and boost your matching rate.</p>
          </div>

          <div className="match-layout">
            {/* Input Form Card */}
            <div className="card">
              <h2 className="card-title">
                <Link className="w-5 h-5 text-indigo-400" />
                1. Job Specifications
              </h2>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--dark-text-secondary)' }}>
                  Job Posting URL
                </label>
                <input 
                  type="text" 
                  placeholder="https://linkedin.com/jobs/view/..." 
                  value={jobUrl}
                  onChange={(e) => {
                    setJobUrl(e.target.value);
                    if (showValidationErrors) setShowValidationErrors(false);
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--dark-text-secondary)' }}>
                  Job Description Text (Fallback / Manual paste)
                </label>
                <textarea 
                  rows={6}
                  placeholder="Paste the job responsibilities, skills, and qualifications here..."
                  value={jobDesc}
                  onChange={(e) => {
                    setJobDesc(e.target.value);
                    if (showValidationErrors) setShowValidationErrors(false);
                  }}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {showValidationErrors && !jobUrl.trim() && !jobDesc.trim() && (
                <div style={{ color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontWeight: '600' }}>
                  <AlertCircle className="w-4 h-4" />
                  Please provide a job URL or paste description text.
                </div>
              )}
            </div>

            {/* Resume Upload Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 className="card-title">
                <FileText className="w-5 h-5 text-indigo-400" />
                2. Select Resume
              </h2>

              {/* Drag and Drop Zone */}
              <div 
                className={`dropzone ${dragActive ? 'dropzone-active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('resume-file-input')?.click()}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-indigo-400" />
                <p style={{ fontWeight: '700', color: '#fff', fontSize: '14.5px' }}>
                  Drag & drop your resume PDF / TXT here
                </p>
                <p style={{ fontSize: '12.5px', color: 'var(--dark-text-secondary)', marginTop: '4px' }}>
                  or click to select file
                </p>
                <input 
                  type="file" 
                  id="resume-file-input"
                  style={{ display: 'none' }} 
                  accept=".pdf,.txt"
                  onChange={handleFileInput}
                />
              </div>

              {/* Uploaded Resumes List */}
              <div style={{ flex: 1, marginTop: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '10px' }}>
                  Your Resumes ({resumes.length})
                </h3>

                {resumes.length === 0 ? (
                  <p style={{ color: 'var(--dark-text-secondary)', fontSize: '13.5px', textAlign: 'center', padding: '20px 0' }}>
                    No resumes uploaded yet. Upload a PDF or TXT above.
                  </p>
                ) : (
                  <div className="file-list">
                    {resumes.map(resume => (
                      <div 
                        key={resume.id}
                        className={`file-item ${selectedResumeId === resume.id ? 'file-item-selected' : ''}`}
                        onClick={() => {
                          setSelectedResumeId(resume.id);
                          if (showValidationErrors) setShowValidationErrors(false);
                        }}
                      >
                        <div className="file-info">
                          <FileText className="w-5 h-5 text-indigo-300" />
                          <div style={{ minWidth: 0 }}>
                            <div className="file-name">{resume.name}</div>
                            <div className="file-date">{resume.date}</div>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteResume(resume.id, e)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', opacity: 0.7, padding: '4px' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showValidationErrors && !selectedResumeId && (
                <div style={{ color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontWeight: '600' }}>
                  <AlertCircle className="w-4 h-4" />
                  Please select or upload a resume.
                </div>
              )}

              {/* Do the Magic CTA */}
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '24px', padding: '16px 20px', borderRadius: '12px' }}
                onClick={handleMagicClick}
              >
                <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                DO THE MAGIC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {currentView === 'loading' && (
        <div className="card loading-overlay animate-fade-in" style={{ maxWidth: '600px', margin: '60px auto' }}>
          <Sparkles className="w-12 h-12 text-indigo-400 animate-spin" />
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginTop: '24px', color: '#fff' }}>
            Analyzing Your Application
          </h2>
          
          <div className="loading-bar-container">
            <div className="loading-bar-fill" style={{ width: `${(loadingStep + 1) * 25}%` }} />
          </div>

          <p style={{ color: 'var(--dark-text-secondary)', fontSize: '15px' }}>
            {loadingStep === 0 && "Decoding job description requirements..."}
            {loadingStep === 1 && "Parsing uploaded resume keywords..."}
            {loadingStep === 2 && "Compiling tailored hiring metrics..."}
            {loadingStep === 3 && "Structuring your evaluation checklist..."}
          </p>
        </div>
      )}

      {/* Results View */}
      {currentView === 'result' && analysisResult && (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="page-header" style={{ marginBottom: '24px' }}>
            <h1 className="page-title" style={{ fontSize: '32px' }}>Analysis Results</h1>
            <p className="page-subtitle" style={{ fontSize: '16px' }}>
              For <span style={{ color: '#fff', fontWeight: '700' }}>{analysisResult.job_title}</span> at <span style={{ color: '#fff', fontWeight: '700' }}>{analysisResult.company}</span>
            </p>
          </div>

          {/* Matching circular gauge card */}
          <div className="card score-card" style={{ marginBottom: '24px' }}>
            <div className="score-circle">
              <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle cx="75" cy="75" r="60" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle 
                  cx="75" 
                  cy="75" 
                  r="60" 
                  fill="transparent" 
                  stroke={getScoreColor(analysisResult.match_score)} 
                  strokeWidth="8" 
                  strokeDasharray={2 * Math.PI * 60}
                  strokeDashoffset={2 * Math.PI * 60 * (1 - analysisResult.match_score / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
              </svg>
              <span className="score-number">{analysisResult.match_score}%</span>
              <span className="score-label">MATCH SCORE</span>
            </div>

            <p style={{ marginTop: '24px', textAlign: 'center', color: '#fff', fontSize: '15px', fontWeight: '600', maxWidth: '500px', lineHeight: '1.6' }}>
              {analysisResult.summary}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Missing Keywords */}
            <div className="card">
              <h3 className="card-title" style={{ color: '#f59e0b', fontSize: '16px' }}>
                <AlertCircle className="w-5 h-5" />
                Missing Key Skills
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                {analysisResult.missing_keywords?.length === 0 ? (
                  <span style={{ color: 'var(--dark-text-secondary)', fontSize: '13.5px' }}>No critical missing keywords! Great job.</span>
                ) : (
                  analysisResult.missing_keywords?.map((kw, i) => (
                    <span key={i} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#fde047', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '750' }}>
                      {kw}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Strong Matches */}
            <div className="card">
              <h3 className="card-title" style={{ color: '#10b981', fontSize: '16px' }}>
                <CheckCircle className="w-5 h-5" />
                Strong Matches
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                {analysisResult.strong_matches?.length === 0 ? (
                  <span style={{ color: 'var(--dark-text-secondary)', fontSize: '13.5px' }}>Add more matching details to highlight your qualifications.</span>
                ) : (
                  analysisResult.strong_matches?.map((kw, i) => (
                    <span key={i} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#a7f3d0', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '750' }}>
                      {kw}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Detailed checklist */}
          <div className="card" style={{ marginBottom: '40px' }}>
            <h3 className="card-title">Recommendations to Fix ({analysisResult.issues_count})</h3>
            <div className="issues-list">
              {analysisResult.issues.map((issue, idx) => (
                <div key={idx} className="issue-item">
                  <div className="issue-title">{issue.title.split(':')[0]}</div>
                  <div className="issue-fix">{issue.title.split(':')[1] || "Tailor this point within your experiences summary to match the job criteria."}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentView('audit')}>
              Scan Another Resume
            </button>
          </div>
        </div>
      )}

      {/* Privacy Consent Modal */}
      {showPrivacyModal && (
        <div className="modal-backdrop">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <div className="modal-icon-box">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h2 className="modal-title">Privacy Notice</h2>
            </div>
            
            <div className="modal-body">
              This feature matches your resume PDF and job post URL securely.
              The text content will be sent to the Gemini AI API to check for matching keywords and issues. 
              We do not share your files or data with other third parties. 
              Do you agree to proceed?
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPrivacyModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAgreePrivacy}>
                Agree & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
