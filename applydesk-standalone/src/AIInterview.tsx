import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, Bot, Play, Briefcase } from 'lucide-react';
import './ai-interview.css';

export default function AIInterview({ user, selectedJob, userResumes }: { user: any, selectedJob: any, userResumes: any[] }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const defaultResume = userResumes?.find(r => r.isDefault) || userResumes?.[0] || null;
  const jobTitle = selectedJob?.title?.name || selectedJob?.title || 'the open position';
  const companyName = selectedJob?.company?.name || selectedJob?.company || 'our company';
  
  const initialGreeting = `Hello! I am the hiring manager from ${companyName}. I have reviewed your resume for the ${jobTitle} position. Could you start by introducing yourself?`;
  
  const [interviewerText, setInterviewerText] = useState(initialGreeting);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synth = window.speechSynthesis;
  
  const conversationHistory = useRef([
    { role: 'model', parts: [{ text: initialGreeting }] }
  ]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };
    }
  }, []);

  const startInterview = () => {
    speakText(interviewerText);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      recognitionRef.current?.stop();
      if (transcript.trim()) {
        handleSendToAI(transcript);
      }
    } else {
      synth.cancel();
      setTranscript('');
      setIsRecording(true);
      recognitionRef.current?.start();
    }
  };

  const handleSendToAI = async (userText: string) => {
      setIsProcessing(true);
      
      const newHistory = [...conversationHistory.current, { role: 'user', parts: [{ text: userText }] }];
      // Ensure the history sent to Gemini starts with a user message
      const validHistory = newHistory[0].role === 'model' ? newHistory.slice(1) : newHistory;
      
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const systemPrompt = `You are a real, expert hiring manager from "${companyName}" conducting a voice interview for the "${jobTitle}" position. 
The candidate's name is ${user?.profile?.firstName || 'the candidate'}. 
${selectedJob?.description ? `The job description is: ${selectedJob.description.substring(0, 800)}...` : ''}
${defaultResume ? `The candidate's resume summary: They have a resume titled "${defaultResume.name}".` : ''}

Rules:
1. Act entirely like a human interviewer. Be conversational, natural, and concise. 
2. DO NOT use formatting, asterisks, bolding, or markdown because your output will be read aloud by a text-to-speech engine.
3. Respond directly to what they just said.
4. Using the Google Search tool, search the internet for professional, highly technical, and up-to-date interview questions for this specific role (e.g. if the role requires React, search for advanced React interview questions).
5. Ask exactly ONE hard, professional follow-up question related to the job requirements, and keep your total response under 3 sentences.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: validHistory,
                tools: [{ googleSearch: {} }]
            })
        });
        
        const data = await res.json();
        if (data.error) {
           console.error("Gemini API Error:", data.error);
        }
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I see. Let's move on to the next question.";
        
        setInterviewerText(aiResponse);
        conversationHistory.current = [...newHistory, { role: 'model', parts: [{ text: aiResponse }] }];
        
        speakText(aiResponse);
      } catch (err) {
         console.error("Fetch error:", err);
         setInterviewerText("Sorry, I had a connection issue. Can you repeat that?");
      } finally {
         setIsProcessing(false);
         setTranscript('');
      }
  };

  const speakText = (text: string) => {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.lang === 'en-US');
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    synth.speak(utterance);
  };

  if (!selectedJob) {
      return (
          <div className="ai-interview-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
              <Briefcase size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
              <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>No Job Selected</h2>
              <p style={{ color: '#64748b', textAlign: 'center' }}>Please go to the "Jobs List" tab, click on a job you want to practice for, and then come back here.</p>
          </div>
      );
  }

  return (
    <div className="ai-interview-container">
      <div className="ai-interview-header">
        <h2>AI Voice Interview for {jobTitle}</h2>
        <p>Practicing for <b>{companyName}</b>. Your tailored resume context is loaded.</p>
        <button className="start-btn" onClick={startInterview}>
          <Play size={16} /> Hear Intro
        </button>
      </div>

      <div className="ai-interview-content">
        <div className="ai-avatar-section">
           <div className={`ai-avatar-circle ${isProcessing || synth.speaking ? 'pulsing' : ''}`}>
               <Bot size={80} color="#2563EB" />
           </div>
           <p className="interviewer-text">"{interviewerText}"</p>
        </div>

        <div className="user-interaction-section">
           <div className="transcript-box">
               {transcript || (isRecording ? "Listening..." : "Click the microphone to start speaking.")}
           </div>

           <button 
             className={`mic-button ${isRecording ? 'recording' : ''}`}
             onClick={toggleRecording}
             disabled={isProcessing}
           >
             {isProcessing ? <Loader2 className="spinner" size={28} /> : (isRecording ? <Square fill="currentColor" size={28} /> : <Mic size={28} />)}
           </button>
           <p className="mic-hint">{isRecording ? "Tap to stop & send" : "Tap to speak"}</p>
        </div>
      </div>
    </div>
  );
}
