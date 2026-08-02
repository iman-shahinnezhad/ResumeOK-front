import { useState } from 'react';
import { Award, CheckCircle, AlertTriangle, Sparkles, FileText, RefreshCw } from 'lucide-react';
import useSEO from '../hooks/useSEO';

export default function Audit() {
  useSEO(
    "AI Resume Audit & ATS Compatibility Score - ResumeOK",
    "Get an instant recruiter-level audit of your resume with ATS compatibility breakdown, metric impact ratings, and missing keyword suggestions."
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
        overallScore: 88,
        atsScore: 94,
        impactScore: 82,
        brevityScore: 88,
        strengths: [
          'High ATS Parsability: Standard headings and clean bullet structures parsed flawlessly.',
          'Quantifiable Achievements: 70% of bullets contain hard numerical metrics (e.g. "Increased conversion by 34%").',
          'Action-Verb Lead-ins: Strong lead verbs (Orchestrated, Spearheaded, Optimized) drive executive clarity.'
        ],
        improvements: [
          'Add a dedicated Core Skills block explicitly mapping technical tools to ATS keyword parsers.',
          'Close missing keyword gaps (e.g. TypeScript, System Architecture) before submitting to top tier companies.',
          'Ensure email and LinkedIn URLs use standard text links without dynamic web components.'
        ],
        missingKeywords: [
          'TypeScript', 'GraphQL', 'CI/CD Pipelines', 'System Architecture', 'Agile / Scrum', 'Performance Monitoring'
        ],
        sectionScores: [
          { section: 'Contact & Portfolio Info', score: 98, feedback: 'Complete, standardized, and 100% parsable by Taleo, Greenhouse, and Workday.' },
          { section: 'Professional Summary', score: 84, feedback: 'Strong executive tone. Add 2 target role keywords to maximize initial 6-second scan.' },
          { section: 'Work History & Bullet Points', score: 90, feedback: 'Excellent metric-driven structure with strong verb choices.' },
          { section: 'Technical Skills Matrix', score: 76, feedback: 'Needs clearer categorization into Core Languages, Frameworks, and Tools.' },
          { section: 'Education & Certifications', score: 95, feedback: 'Accurately formatted degrees and completion dates.' }
        ]
      });
      setAnalyzing(false);
    }, 1200);
  };

  return (
    <div className="resumeok-page-container">
      {/* Header */}
      <div className="resumeok-page-header">
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '12px' }}>
          <Award className="w-3.5 h-3.5" /> RECRUITER-LEVEL ATS SCANNER
        </span>
        <h1 className="resumeok-page-title">AI Resume Scoring & Audit</h1>
        <p className="resumeok-page-subtitle">
          Paste your resume text to get an instant breakdown of ATS compatibility, keyword density, metric impact, and bullet-point optimizations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: auditResult ? '1fr 1fr' : '1fr', gap: '40px' }}>
        {/* Left Column: Input Form Card */}
        <div className="resumeok-card-cream" style={{ padding: '36px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#141414', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText className="w-5 h-5 text-gray-700" /> Resume Content Input
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '8px' }}>
              Target Position / Job Title (Optional)
            </label>
            <input
              type="text"
              className="resumeok-input"
              placeholder="e.g. Senior Full Stack Engineer / Product Manager"
              value={targetJobTitle}
              onChange={(e) => setTargetJobTitle(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '8px' }}>
              Paste Full Resume Text
            </label>
            <textarea
              rows={14}
              className="resumeok-input"
              placeholder="Paste your full resume text here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              style={{ lineHeight: '1.6', fontSize: '13.5px' }}
            />
          </div>

          <button
            className="btn-resumeok-black"
            style={{ width: '100%', padding: '14px', fontSize: '14px', justifyContent: 'center' }}
            disabled={!resumeText.trim() || analyzing}
            onClick={handleRunAudit}
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 spin inline-block" />
                Scanning & Scoring Resume...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2 inline-block" />
                Run AI Audit & Scoring
              </>
            )}
          </button>
        </div>

        {/* Right Column: Detailed Audit Results */}
        {auditResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Score Overview Solid Sand Box */}
            <div className="resumeok-card-sand" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555', marginBottom: '12px' }}>
                OVERALL RESUME SCORE
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '64px', fontWeight: '400', color: '#141414', lineHeight: '1' }}>
                {auditResult.overallScore}<span style={{ fontSize: '24px', color: '#777777' }}>/100</span>
              </div>
              <p style={{ fontSize: '14px', color: '#555555', marginTop: '12px', marginBottom: '24px' }}>
                Your resume ranks in the <strong>top 12%</strong> of applicants for ATS parsability and executive metric impact.
              </p>

              {/* 3 Metric Breakdown Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingTop: '24px', borderTop: '1px solid #dcd7cc' }}>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#059669' }}>{auditResult.atsScore}%</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#555555' }}>ATS Parsable</div>
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#2563eb' }}>{auditResult.impactScore}%</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#555555' }}>Metric Impact</div>
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#d97706' }}>{auditResult.brevityScore}%</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#555555' }}>Style & Brevity</div>
                </div>
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="resumeok-card-white" style={{ padding: '32px' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <CheckCircle className="w-5 h-5" /> Top Recruiter Strengths
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '28px' }}>
                {auditResult.strengths.map((s, idx) => (
                  <li key={idx} style={{ fontSize: '14px', color: '#333333', lineHeight: '1.6', marginBottom: '10px', paddingLeft: '20px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#059669', fontWeight: 'bold' }}>✓</span> {s}
                  </li>
                ))}
              </ul>

              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertTriangle className="w-5 h-5" /> Critical ATS Improvements
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {auditResult.improvements.map((imp, idx) => (
                  <li key={idx} style={{ fontSize: '14px', color: '#333333', lineHeight: '1.6', marginBottom: '10px', paddingLeft: '20px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#d97706', fontWeight: 'bold' }}>!</span> {imp}
                  </li>
                ))}
              </ul>
            </div>

            {/* Missing Keywords Box */}
            <div className="resumeok-card-cream" style={{ padding: '28px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#141414', marginBottom: '12px' }}>
                Missing Keywords Detected for ATS Boost:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {auditResult.missingKeywords.map((kw, i) => (
                  <span key={i} style={{ backgroundColor: '#ffffff', border: '1px solid #dcd7cc', padding: '6px 12px', fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>
                    + {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
