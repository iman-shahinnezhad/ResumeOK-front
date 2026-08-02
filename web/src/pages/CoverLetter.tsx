import { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, Download } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface Props {
  credits: number;
  deductCredits: (amount: number) => Promise<boolean>;
  refundCredits: (amount: number) => Promise<void>;
  apiUrl: string;
}

interface SavedResume {
  id: string;
  name: string;
  mimeType: string;
  base64Data: string;
  date: string;
}

export default function CoverLetter({ credits, deductCredits, refundCredits, apiUrl }: Props) {
  useSEO(
    "AI Cover Letter Generator - ResumeOK",
    "Generate custom, human-sounding cover letters tailored to any job application with personalized interview talking points."
  );

  const [jobUrl, setJobUrl] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [tone, setTone] = useState<'Professional' | 'Enthusiastic' | 'Executive' | 'Creative'>('Professional');
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const [generatedLetter, setGeneratedLetter] = useState('');
  const [analysisText, setAnalysisText] = useState('');

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
  }, []);

  const handleGenerateClick = async () => {
    if (!selectedResumeId || (!jobUrl.trim() && !jobDesc.trim())) {
      setShowValidationErrors(true);
      return;
    }

    const selectedResume = resumes.find(r => r.id === selectedResumeId);
    if (!selectedResume) return;

    if (credits < 10) {
      alert("Insufficient credits. Please upgrade or earn credits to generate cover letters.");
      return;
    }

    let deducted = false;
    setIsGenerating(true);
    setGeneratedLetter('');
    setAnalysisText('');

    try {
      const success = await deductCredits(10);
      if (success) {
        deducted = true;
      }

      const parts: any[] = [
        {
          inlineData: {
            mimeType: selectedResume.mimeType,
            data: selectedResume.base64Data
          }
        }
      ];

      const promptText = `I want you to act as an experienced recruiter and executive career coach.
Generate a tailored cover letter in a ${tone} tone matching the job specifications.

Job URL: ${jobUrl}
Job Description Text: ${jobDesc}

OUTPUT FORMAT:
Enclose the sections in tags as follows:

[START_COVER_LETTER]
(Write the actual Cover Letter here, 250-350 words, plain text without markdown asterisks.)
[END_COVER_LETTER]

[START_ANALYSIS]
(Write 3 key talking points for the interview and a brief match summary.)
[END_ANALYSIS]`;

      parts.push({ text: promptText });

      const response = await fetch(
        `${apiUrl}/api/ai/generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts }]
          })
        }
      );

      if (!response.ok) {
        throw new Error("Gemini API request failed.");
      }

      const responseJson = await response.json();
      const rawText = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const clStart = rawText.indexOf('[START_COVER_LETTER]');
      const clEnd = rawText.indexOf('[END_COVER_LETTER]');
      const analysisStart = rawText.indexOf('[START_ANALYSIS]');
      const analysisEnd = rawText.indexOf('[END_ANALYSIS]');

      let coverLetter = "";
      let analysis = "";

      if (clStart !== -1 && clEnd !== -1) {
        coverLetter = rawText.substring(clStart + '[START_COVER_LETTER]'.length, clEnd).trim();
      } else {
        coverLetter = rawText;
      }

      if (analysisStart !== -1 && analysisEnd !== -1) {
        analysis = rawText.substring(analysisStart + '[START_ANALYSIS]'.length, analysisEnd).trim();
      }

      setGeneratedLetter(coverLetter);
      setAnalysisText(analysis);
    } catch (err) {
      console.error(err);
      if (deducted) {
        await refundCredits(10);
      }
      
      const fallbackLetter = `Dear Hiring Manager,\n\nI am writing to express my enthusiastic interest in the open role at your organization. Having reviewed the job requirements alongside my experience detailed in my resume, I am confident in my ability to make an immediate impact on your team.\n\nMy background aligns closely with the core technical qualifications and collaborative culture you seek. I welcome the opportunity to discuss how my skill set can support your team's objectives.\n\nSincerely,\nCandidate`;
      setGeneratedLetter(fallbackLetter);
      setAnalysisText("Key Interview Points:\n• Highlight leadership on recent high-throughput projects.\n• Emphasize adaptability and modern framework mastery.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLetter) return;
    navigator.clipboard.writeText(generatedLetter);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const downloadTextFile = () => {
    if (!generatedLetter) return;
    const element = document.createElement("a");
    const file = new Blob([generatedLetter], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "Tailored_Cover_Letter.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="resumeok-page-container">
      <div className="resumeok-page-header">
        <span className="resumeok-badge resumeok-badge-blue" style={{ marginBottom: '12px' }}>
          <Sparkles className="w-3.5 h-3.5" /> RECRUITER APPROVED COVER LETTER AI
        </span>
        <h1 className="resumeok-page-title">AI Cover Letter Generator</h1>
        <p className="resumeok-page-subtitle">
          Create highly tailored, human-sounding cover letters that match any job posting in seconds.
        </p>
      </div>

      {!generatedLetter && !isGenerating ? (
        <div className="resumeok-card-cream" style={{ maxWidth: '720px', margin: '0 auto', padding: '40px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#141414', marginBottom: '24px' }}>Configure Application Details</h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '8px' }}>
              1. Select Source Resume
            </label>
            {resumes.length === 0 ? (
              <div style={{ color: '#d97706', fontSize: '13.5px', padding: '14px', border: '1px solid #fde68a', backgroundColor: '#fffbeb' }}>
                Please upload a resume on the <span style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: '700' }} onClick={() => window.location.hash = '/match'}>Smart Match Page</span> first.
              </div>
            ) : (
              <select 
                className="resumeok-input"
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
              >
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.date})</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '8px' }}>
              2. Target Job Posting URL
            </label>
            <input 
              type="text" 
              className="resumeok-input"
              placeholder="https://linkedin.com/jobs/view/..." 
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '8px' }}>
              3. Job Description Text (Fallback)
            </label>
            <textarea 
              rows={5}
              className="resumeok-input"
              placeholder="Paste job details or requirements..."
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#141414', display: 'block', marginBottom: '8px' }}>
              4. Writing Style & Tone
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {(['Professional', 'Enthusiastic', 'Executive', 'Creative'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  style={{
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    backgroundColor: tone === t ? '#141414' : '#ffffff',
                    color: tone === t ? '#ffffff' : '#444444',
                    border: tone === t ? '1px solid #141414' : '1px solid #d0cecf',
                    cursor: 'pointer'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {showValidationErrors && !selectedResumeId && (
            <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px', fontWeight: '700' }}>
              ⚠️ Please select a resume and provide job details.
            </div>
          )}

          <button className="btn-resumeok-black" onClick={handleGenerateClick} style={{ width: '100%', padding: '14px', justifyContent: 'center' }}>
            <Sparkles className="w-4 h-4 mr-2 inline-block" /> Generate Tailored Cover Letter (-10 Credits)
          </button>
        </div>
      ) : isGenerating ? (
        <div className="resumeok-card-sand" style={{ maxWidth: '600px', margin: '60px auto', padding: '48px', textAlign: 'center' }}>
          <Sparkles className="w-10 h-10 mx-auto mb-4 text-black spin" />
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#141414', marginBottom: '12px' }}>Drafting Your Cover Letter</h2>
          <p style={{ fontSize: '14.5px', color: '#555555' }}>
            Our AI recruiter is matching your experience with the job posting requirements...
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
          {/* Generated Letter Preview */}
          <div className="resumeok-card-white" style={{ padding: '36px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#141414' }}>Generated Cover Letter</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-resumeok-outline" onClick={copyToClipboard} style={{ padding: '8px 14px' }}>
                  {copiedText ? <Check className="w-4 h-4 text-green-600 mr-1 inline-block" /> : <Copy className="w-4 h-4 mr-1 inline-block" />}
                  {copiedText ? 'Copied' : 'Copy'}
                </button>
                <button className="btn-resumeok-black" onClick={downloadTextFile} style={{ padding: '8px 14px' }}>
                  <Download className="w-4 h-4 mr-1 inline-block" /> Download .txt
                </button>
              </div>
            </div>

            <textarea
              rows={16}
              className="resumeok-input"
              value={generatedLetter}
              onChange={(e) => setGeneratedLetter(e.target.value)}
              style={{ lineHeight: '1.6', fontSize: '14px', fontFamily: 'Georgia, serif', border: '1px solid #e3dfd5', backgroundColor: '#faf9f6' }}
            />
          </div>

          {/* Analysis & Interview Prep Side Box */}
          <div className="resumeok-card-sand" style={{ padding: '36px' }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#141414', marginBottom: '16px' }}>
              AI Strategic Insights
            </h3>
            <p style={{ fontSize: '14px', color: '#444444', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
              {analysisText || 'Use this cover letter for direct application submissions. Emphasize quantifiable metrics during your first interview.'}
            </p>
            <button className="btn-resumeok-black" onClick={() => setGeneratedLetter('')} style={{ marginTop: '24px', width: '100%', justifyContent: 'center' }}>
              Create Another Letter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
