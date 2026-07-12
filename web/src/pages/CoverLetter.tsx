import { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, Copy, Check, Download, ShieldAlert, ListRestart } from 'lucide-react';
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

export default function CoverLetter({ credits, deductCredits, refundCredits }: Props) {
  useSEO(
    "AI Cover Letter Generator",
    "Write highly personalized, human-sounding cover letters matching any job posting. Get interview strategies and background highlights."
  );

  const [jobUrl, setJobUrl] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const [generatedLetter, setGeneratedLetter] = useState('');
  const [analysisText, setAnalysisText] = useState('');

  useEffect(() => {
    // Load resumes
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

  const handleGenerateClick = () => {
    if (!selectedResumeId || (!jobUrl.trim() && !jobDesc.trim())) {
      setShowValidationErrors(true);
      return;
    }

    if (!privacyAgreed) {
      setShowPrivacyModal(true);
    } else {
      generateCoverLetter();
    }
  };

  const handleAgreePrivacy = () => {
    localStorage.setItem('privacy_agreed', 'true');
    setPrivacyAgreed(true);
    setShowPrivacyModal(false);
    generateCoverLetter();
  };

  const generateCoverLetter = async () => {
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

      const promptText = `I want you to act as an experienced recruiter and hiring manager.

I will provide:
1. The job details/description
2. My resume

Your tasks:
* Analyze the job requirements and identify the required skills.
* Find the strongest connections with my resume experiences.
* Write a conversational, natural, and professional cover letter (250-400 words) without buzzwords or robotic AI phrases.
* IMPORTANT: Do not use any markdown formatting symbols such as bolding (**), headings (###), or asterisks (*) for lists in your entire response. Keep all text plain and professionally formatted with standard spacing.

After writing the cover letter, also provide:
1. A short explanation of why this version matches the role.
2. 3 key points from my background that I should mention during an interview.
3. Any weaknesses or missing skills compared to the job description and how I can address them.

Job URL: ${jobUrl}
Job Description Text: ${jobDesc}

OUTPUT FORMAT:
Enclose the sections in tags as follows:

[START_COVER_LETTER]
(Write the actual Cover Letter here. Do not include any markdown headers, tags or comments inside.)
[END_COVER_LETTER]

[START_ANALYSIS]
(Write the additional details here: Match explanation, 3 key interview points, and weaknesses & how to address them. DO NOT use markdown characters like ###, **, *, or ***. Use simple, clean text layout and plain bullet points like • if needed.)
[END_ANALYSIS]`;

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
        coverLetter = rawText; // Fallback
      }

      if (analysisStart !== -1 && analysisEnd !== -1) {
        analysis = rawText.substring(analysisStart + '[START_ANALYSIS]'.length, analysisEnd).trim();
      }

      setGeneratedLetter(coverLetter);
      setAnalysisText(analysis);

      // Save to saved cover letters list
      const savedLetters = localStorage.getItem('cover_letters') || '[]';
      try {
        const parsed = JSON.parse(savedLetters);
        const newLetter = {
          id: 'cl_' + Date.now(),
          title: `Cover Letter - ${selectedResume.name.replace(/\.[^/.]+$/, "")}`,
          content: coverLetter,
          analysis: analysis,
          date: new Date().toLocaleDateString()
        };
        localStorage.setItem('cover_letters', JSON.stringify([newLetter, ...parsed]));
      } catch (e) {}

    } catch (err) {
      console.error(err);
      if (deducted) {
        await refundCredits(10);
      }
      
      const fallbackLetter = `Dear Hiring Team,\n\nI am writing to express my strong interest in the open position. With my background as detailed in the attached resume, I have developed key competencies matching your search. I look forward to discussing how I can add value to your team.\n\nSincerely,\nCandidate`;
      setGeneratedLetter(fallbackLetter);
      setAnalysisText("Verification Warning: Could not complete custom AI generation. Displaying fallback template letter.");
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
    element.download = "Cover_Letter.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="page-wrapper container">
      <div className="page-header">
        <h1 className="page-title">Generate Cover Letter</h1>
        <p className="page-subtitle">Write an impressive, human-written cover letter tailored to any job specification.</p>
      </div>

      {!generatedLetter && !isGenerating ? (
        <div className="card animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 className="card-title">Configure Details</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--dark-text-secondary)' }}>
              1. Select Source Resume
            </label>
            {resumes.length === 0 ? (
              <div style={{ color: 'var(--warning)', fontSize: '13.5px', padding: '12px', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', backgroundColor: 'rgba(245,158,11,0.05)' }}>
                Please upload a resume on the <span style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: '600' }} onClick={() => window.location.hash = '/match'}>Match Page</span> first.
              </div>
            ) : (
              <select 
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value);
                  if (showValidationErrors) setShowValidationErrors(false);
                }}
              >
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
            {showValidationErrors && !selectedResumeId && (
              <div style={{ color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <AlertCircle className="w-4 h-4" /> Please select a resume.
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--dark-text-secondary)' }}>
              2. Job Posting URL (Optional)
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--dark-text-secondary)' }}>
              3. Job Details / Description
            </label>
            <textarea 
              rows={6}
              placeholder="Paste the job post description, title, requirements, or outline here..."
              value={jobDesc}
              onChange={(e) => {
                setJobDesc(e.target.value);
                if (showValidationErrors) setShowValidationErrors(false);
              }}
              style={{ resize: 'vertical' }}
            />
            {showValidationErrors && !jobDesc.trim() && !jobUrl.trim() && (
              <div style={{ color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <AlertCircle className="w-4 h-4" /> Please provide a job URL or description text.
              </div>
            )}
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px' }}
            onClick={handleGenerateClick}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Cover Letter (10 Credits)
          </button>
        </div>
      ) : isGenerating ? (
        <div className="card loading-overlay animate-fade-in" style={{ maxWidth: '600px', margin: '60px auto' }}>
          <Sparkles className="w-12 h-12 text-indigo-400 animate-spin" />
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginTop: '24px', color: '#fff' }}>
            Crafting Cover Letter
          </h2>
          <div className="loading-bar-container">
            <div className="loading-bar-fill animate-pulse" style={{ width: '100%' }} />
          </div>
          <p style={{ color: 'var(--dark-text-secondary)', fontSize: '15px' }}>
            Matching experiences with role priorities...
          </p>
        </div>
      ) : (
        <div className="animate-fade-in" style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
            
            {/* The Letter */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--dark-border)', paddingBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '750' }}>Generated Letter</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={copyToClipboard}>
                    {copiedText ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    <span style={{ marginLeft: '4px' }}>{copiedText ? "Copied" : "Copy"}</span>
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={downloadTextFile}>
                    <Download className="w-4 h-4" />
                    <span style={{ marginLeft: '4px' }}>Download</span>
                  </button>
                </div>
              </div>

              <div style={{ whiteSpace: 'pre-wrap', color: '#fff', fontSize: '14.5px', lineHeight: '1.7', fontFamily: 'inherit', padding: '16px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '10px', maxHeight: '550px', overflowY: 'auto' }}>
                {generatedLetter}
              </div>
            </div>

            {/* The Analysis */}
            <div className="card" style={{ height: 'fit-content' }}>
              <h3 className="card-title" style={{ color: '#10b981', fontSize: '16px', borderBottom: '1px solid var(--dark-border)', paddingBottom: '12px' }}>
                <Sparkles className="w-5 h-5" />
                AI Interview Strategy
              </h3>

              <div style={{ whiteSpace: 'pre-wrap', color: 'var(--dark-text-secondary)', fontSize: '13.5px', lineHeight: '1.6', marginTop: '16px', maxHeight: '480px', overflowY: 'auto' }}>
                {analysisText || "No strategic analysis generated. Use the cover letter above to adapt."}
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '24px' }}
                onClick={() => {
                  setGeneratedLetter('');
                  setAnalysisText('');
                }}
              >
                <ListRestart className="w-4 h-4 mr-2" />
                Create Another
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Privacy Notice Modal */}
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
              This feature matches your resume PDF and job post details securely.
              The text content will be sent to the Gemini AI API to compile a personalized cover letter. 
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
