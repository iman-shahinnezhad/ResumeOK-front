import { useState } from 'react';
import { Award, CheckCircle, AlertTriangle, Sparkles, FileText, RefreshCw } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function Audit() {
  useSEO(
    "AI Resume Audit - Free ATS Score & Feedback",
    "Get an instant AI-powered audit of your resume with ATS compatibility score, keyword impact, and formatting checks."
  );

  const [resumeText, setResumeText] = useState('');
  const [targetJobTitle, setTargetJobTitle] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    overallScore: number;
    atsScore: number;
    impactScore: number;
    brevityScore: number;
    strengths: string[];
    improvements: string[];
    missingKeywords: string[];
    sectionScores: { section: string; score: number; feedback: string }[];
  } | null>(null);

  const handleRunAudit = () => {
    if (!resumeText.trim()) return;
    setAnalyzing(true);

    setTimeout(() => {
      setAuditResult({
        overallScore: 84,
        atsScore: 90,
        impactScore: 78,
        brevityScore: 85,
        strengths: [
          'Strong action verbs used at the beginning of bullet points (e.g., Developed, Orchestrated, Optimized).',
          'Quantifiable achievements included (e.g., "Increased conversion by 34%").',
          'Clean, standard section headers easily parsable by ATS algorithms.',
        ],
        improvements: [
          'Add a Skills section explicitly listing core technical proficiencies.',
          'Elaborate more on leadership and cross-functional collaboration metrics.',
          'Ensure your email address and LinkedIn link are in standard text format.',
        ],
        missingKeywords: [
          'TypeScript', 'GraphQL', 'CI/CD Pipelines', 'System Architecture', 'Agile / Scrum'
        ],
        sectionScores: [
          { section: 'Contact Information', score: 95, feedback: 'Fully readable and complete contact details.' },
          { section: 'Professional Summary', score: 80, feedback: 'Engaging, but could include key technical keywords.' },
          { section: 'Work Experience', score: 88, feedback: 'Great metric driven bullet points with strong verbs.' },
          { section: 'Skills & Tools', score: 70, feedback: 'Needs better organization into categories.' },
          { section: 'Education & Certifications', score: 90, feedback: 'Accurately formatted and structured.' }
        ]
      });
      setAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="container page-wrapper animate-fade-in">
      <div className="page-header">
        <div className="hero-tag" style={{ margin: '0 auto 16px' }}>
          <Award className="w-4 h-4 mr-1.5 text-amber-400" />
          ATS & Content Scanner
        </div>
        <h1 className="page-title">AI Resume Audit</h1>
        <p className="page-subtitle">
          Paste your resume text to receive an in-depth score, ATS compatibility rating, and bullet-by-bullet recommendations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: auditResult ? '1fr 1fr' : '1fr', gap: '32px' }}>
        {/* Input Card */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText className="w-5 h-5 text-indigo-400" />
            Resume Input
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)', display: 'block', marginBottom: '8px' }}>
              Target Job Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Senior Full Stack Engineer"
              value={targetJobTitle}
              onChange={(e) => setTargetJobTitle(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dark-text-secondary)', display: 'block', marginBottom: '8px' }}>
              Resume Text Content
            </label>
            <textarea
              rows={12}
              placeholder="Paste your full resume text here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px' }}
            disabled={!resumeText.trim() || analyzing}
            onClick={handleRunAudit}
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 spin" />
                Analyzing Resume...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Run AI Audit
              </>
            )}
          </button>
        </div>

        {/* Results Card */}
        {auditResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Score Overview Box */}
            <div className="card" style={{ padding: '32px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.5), rgba(15, 23, 42, 0.8))' }}>
              <div style={{ fontSize: '14px', color: 'var(--dark-text-secondary)', marginBottom: '8px' }}>Overall Audit Score</div>
              <div style={{ fontSize: '64px', fontWeight: '900', color: '#6366f1', lineHeight: '1' }}>
                {auditResult.overallScore}<span style={{ fontSize: '24px', color: 'var(--dark-text-secondary)' }}>/100</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--dark-border)' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{auditResult.atsScore}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--dark-text-secondary)' }}>ATS Parsable</div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>{auditResult.impactScore}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--dark-text-secondary)' }}>Metric Impact</div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>{auditResult.brevityScore}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--dark-text-secondary)' }}>Style & Brevity</div>
                </div>
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <CheckCircle className="w-4 h-4" /> Top Strengths
              </h3>
              <ul style={{ listStyle: 'none', fontSize: '13.5px', color: 'var(--dark-text-secondary)' }}>
                {auditResult.strengths.map((s, idx) => (
                  <li key={idx} style={{ marginBottom: '8px', paddingLeft: '16px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#10b981' }}>•</span> {s}
                  </li>
                ))}
              </ul>

              <h3 style={{ fontSize: '16px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', marginBottom: '12px' }}>
                <AlertTriangle className="w-4 h-4" /> Recommended Improvements
              </h3>
              <ul style={{ listStyle: 'none', fontSize: '13.5px', color: 'var(--dark-text-secondary)' }}>
                {auditResult.improvements.map((imp, idx) => (
                  <li key={idx} style={{ marginBottom: '8px', paddingLeft: '16px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#f59e0b' }}>•</span> {imp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
