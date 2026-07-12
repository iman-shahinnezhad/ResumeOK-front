import { useState, useEffect } from 'react';
import { User, Briefcase, GraduationCap, FileText, Layout, Plus, Trash2, ArrowLeft, ArrowRight, Printer, Sparkles, Upload } from 'lucide-react';
import useSEO from '../hooks/useSEO';

interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  id: string;
  school: string;
  degree: string;
  gradDate: string;
  description: string;
}


export default function Builder() {
  useSEO(
    "AI Resume Builder - Create A4 PDF Resumes",
    "Build clean, minimalist, and ATS-compatible resumes with A4 print preview. Add work experience, education, and professional skills."
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('modern_slate');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    jobTitle: '',
    email: '',
    phone: '',
    city: '',
    website: '',
    nationality: '',
    summary: '',
    skills: [] as string[],
    languages: [] as string[],
    experiences: [] as Experience[],
    educations: [] as Education[],
    profileImage: ''
  });

  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');

  useEffect(() => {
    const draft = localStorage.getItem('resume_builder_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        // Clear draft if it contains old prefilled mock data
        if (
          parsed.email === 'sarah.conner@example.com' || 
          parsed.nationality === 'British' || 
          (parsed.experiences && parsed.experiences.some((e: any) => e.company === 'Apex Digital Corp')) ||
          (parsed.educations && parsed.educations.some((edu: any) => edu.school === 'Imperial College London'))
        ) {
          localStorage.removeItem('resume_builder_draft');
          setCurrentStep(0);
        } else {
          setFormData(parsed);
          setCurrentStep(1); // Draft exists, skip template chooser
        }
      } catch (e) {
        console.error(e);
        setCurrentStep(0);
      }
    } else {
      setCurrentStep(0);
    }
  }, []);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplate(id);
    const cleanData = {
      firstName: '',
      lastName: '',
      jobTitle: '',
      email: '',
      phone: '',
      city: '',
      website: '',
      nationality: '',
      summary: '',
      skills: [],
      languages: [],
      experiences: [],
      educations: [],
      profileImage: ''
    };
    setFormData(cleanData);
    localStorage.setItem('resume_builder_draft', JSON.stringify(cleanData));
    setCurrentStep(1);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear your resume and start over?")) {
      localStorage.removeItem('resume_builder_draft');
      setFormData({
        firstName: '',
        lastName: '',
        jobTitle: '',
        email: '',
        phone: '',
        city: '',
        website: '',
        nationality: '',
        summary: '',
        skills: [],
        languages: [],
        experiences: [],
        educations: [],
        profileImage: ''
      });
      setCurrentStep(0);
    }
  };

  // Autosave to localStorage
  const saveDraft = (data: typeof formData) => {
    setFormData(data);
    localStorage.setItem('resume_builder_draft', JSON.stringify(data));
  };

  const handleInputChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    saveDraft(updated);
  };

  // Experiences Handlers
  const addExperience = () => {
    const newExp: Experience = {
      id: 'exp_' + Date.now(),
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    const updated = { ...formData, experiences: [...formData.experiences, newExp] };
    saveDraft(updated);
  };

  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    const updatedExps = formData.experiences.map(exp => {
      if (exp.id === id) {
        return { ...exp, [field]: value };
      }
      return exp;
    });
    saveDraft({ ...formData, experiences: updatedExps });
  };

  const deleteExperience = (id: string) => {
    const filtered = formData.experiences.filter(exp => exp.id !== id);
    saveDraft({ ...formData, experiences: filtered });
  };

  // Education Handlers
  const addEducation = () => {
    const newEdu: Education = {
      id: 'edu_' + Date.now(),
      school: '',
      degree: '',
      gradDate: '',
      description: ''
    };
    const updated = { ...formData, educations: [...formData.educations, newEdu] };
    saveDraft(updated);
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    const updatedEdus = formData.educations.map(edu => {
      if (edu.id === id) {
        return { ...edu, [field]: value };
      }
      return edu;
    });
    saveDraft({ ...formData, educations: updatedEdus });
  };

  const deleteEducation = (id: string) => {
    const filtered = formData.educations.filter(edu => edu.id !== id);
    saveDraft({ ...formData, educations: filtered });
  };

  // Skill Tags
  const addSkill = () => {
    if (!skillInput.trim()) return;
    if (formData.skills.includes(skillInput.trim())) {
      setSkillInput('');
      return;
    }
    const updated = { ...formData, skills: [...formData.skills, skillInput.trim()] };
    saveDraft(updated);
    setSkillInput('');
  };

  const deleteSkill = (skill: string) => {
    const filtered = formData.skills.filter(s => s !== skill);
    saveDraft({ ...formData, skills: filtered });
  };

  // Language Tags
  const addLanguage = () => {
    if (!langInput.trim()) return;
    if (formData.languages.includes(langInput.trim())) {
      setLangInput('');
      return;
    }
    const updated = { ...formData, languages: [...formData.languages, langInput.trim()] };
    saveDraft(updated);
    setLangInput('');
  };

  const deleteLanguage = (lang: string) => {
    const filtered = formData.languages.filter(l => l !== lang);
    saveDraft({ ...formData, languages: filtered });
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        handleInputChange('profileImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    // Save to built resumes library list first
    const built = localStorage.getItem('built_resumes') || '[]';
    try {
      const parsed = JSON.parse(built);
      const name = `${formData.firstName} ${formData.lastName}`.trim() || "Untitled Resume";
      let updatedList = [...parsed];
      
      const newRecord = {
        id: 'built_' + Date.now(),
        name: name,
        jobTitle: formData.jobTitle || 'No Title',
        date: new Date().toLocaleDateString(),
        data: formData,
        template: selectedTemplate
      };

      updatedList = [newRecord, ...parsed.filter((r: any) => r.id !== 'built_current')];
      localStorage.setItem('built_resumes', JSON.stringify(updatedList));
    } catch (e) {}

    window.print();
  };

  if (currentStep === 0) {
    return (
      <div className="container animate-fade-in no-print" style={{ maxWidth: '900px', margin: '40px auto' }}>
        <div className="page-header" style={{ marginBottom: '40px' }}>
          <h1 className="page-title">Choose Your Base Template</h1>
          <p className="page-subtitle">Select a professional design style to prefill with live sample data.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '40px' }}>
          {[
            {
              id: 'modern_slate',
              name: 'Modern Slate',
              desc: 'Clean layouts with slate-gray accents and clear separators.',
              tags: ['Recommended', 'Minimalist'],
              color: '#475569'
            },
            {
              id: 'executive_classic',
              name: 'Executive Classic',
              desc: 'Traditional corporate styling with balanced structures.',
              tags: ['Professional', 'Corporate'],
              color: '#1e3a8a'
            },
            {
              id: 'creative_column',
              name: 'Creative Columns',
              desc: 'Premium two-column layout with colored sidebar details.',
              tags: ['Creative', 'Tech / Design'],
              color: '#4f46e5'
            },
            {
              id: 'elegant_warm',
              name: 'Elegant Warm',
              desc: 'Refined spacing, typography, and warm aesthetic accents.',
              tags: ['Editorial', 'Arts / Writing'],
              color: '#b45309'
            }
          ].map(t => (
            <div 
              key={t.id}
              className="card"
              style={{ 
                cursor: 'pointer',
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                padding: '28px',
                border: '1.5px solid var(--dark-border)',
                transition: 'all var(--transition-normal)'
              }}
              onClick={() => handleSelectTemplate(t.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = t.color;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--dark-border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  {t.tags.map(tag => (
                    <span key={tag} style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '12px', color: 'var(--dark-text-secondary)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>{t.name}</h3>
                <p style={{ color: 'var(--dark-text-secondary)', fontSize: '13.5px', lineHeight: '1.5' }}>{t.desc}</p>
              </div>
              
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '24px', borderColor: 'rgba(255,255,255,0.1)' }}>
                Select {t.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const SAMPLE_EXPERIENCES = [
    {
      id: 'sample_exp_1',
      company: 'Apex Digital Corp',
      role: 'Lead Project Manager',
      startDate: 'Mar 2022',
      endDate: 'Present',
      description: '• Managed a portfolio of 4 concurrent software products with budgets exceeding $1.5M.\n• Directed daily Scrum standups, sprint reviews, and retrospective sessions for 15+ team members.\n• Boosted on-time project delivery rates from 78% to 94% through strict capacity planning.'
    },
    {
      id: 'sample_exp_2',
      company: 'Global Tech Inc',
      role: 'Project Manager',
      startDate: 'Jul 2019',
      endDate: 'Feb 2022',
      description: '• Coordinated the migration of legacy operations database to secure AWS architecture.\n• Formulated detailed product delivery roadmaps alongside product managers and client sponsors.\n• Reduced project bottleneck delays by 25% using automated Jira workflow notifications.'
    }
  ];

  const SAMPLE_EDUCATIONS = [
    {
      id: 'sample_edu_1',
      school: 'Imperial College London',
      degree: 'M.S. in Management Science',
      gradDate: '2018',
      description: 'Specialization in Software Engineering and Distributed Systems.'
    },
    {
      id: 'sample_edu_2',
      school: 'University College London',
      degree: 'B.S. in Information Management',
      gradDate: '2016',
      description: 'Graduated with honors. Key coursework: Data Structures, Algorithms, Databases.'
    }
  ];

  const resolvedFirstName = formData.firstName || "Sarah";
  const resolvedLastName = formData.lastName || "Conner";
  const resolvedJobTitle = formData.jobTitle || "Senior Project Manager";
  const resolvedEmail = formData.email || "sarah.conner@example.com";
  const resolvedPhone = formData.phone || "+1 (555) 789-0123";
  const resolvedCity = formData.city || "London, UK";
  const resolvedWebsite = formData.website || "sarahconner.dev";
  const resolvedNationality = formData.nationality || "British";
  const resolvedSummary = formData.summary || "Dynamic and results-driven Senior Project Manager with over 7 years of experience leading cross-functional engineering teams. Specialized in Agile methodologies, client relations, and delivery of high-budget software products.";
  
  const resolvedSkills = formData.skills.length > 0 ? formData.skills : ['Agile / Scrum', 'Jira', 'Resource Planning', 'Budget Forecasting', 'Risk Management', 'Stakeholder Communication', 'Product Roadmap'];
  const resolvedLanguages = formData.languages.length > 0 ? formData.languages : ['English (Native)', 'French (Conversational)'];
  const resolvedExperiences = formData.experiences.length > 0 ? formData.experiences : SAMPLE_EXPERIENCES;
  const resolvedEducations = formData.educations.length > 0 ? formData.educations : SAMPLE_EDUCATIONS;

  const renderTemplateContent = () => {
    return (
      <>
        {selectedTemplate === 'modern_slate' && (
          <div>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #475569', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ color: '#0f172a', fontSize: '32px', fontWeight: '800', textTransform: 'uppercase', margin: 0 }}>
                  {resolvedFirstName} {resolvedLastName}
                </h1>
                <p style={{ color: '#475569', fontSize: '15px', fontWeight: '600', marginTop: '4px', margin: '4px 0 0 0' }}>
                  {resolvedJobTitle}
                </p>
              </div>
              {formData.profileImage && (
                <img src={formData.profileImage} style={{ width: '70px', height: '70px', borderRadius: '35px', objectFit: 'cover' }} alt="" />
              )}
            </div>

            {/* 2-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '30px' }}>
              {/* Sidebar details */}
              <div>
                <h4 style={{ color: '#475569', fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '10px', marginTop: 0 }}>Contact</h4>
                <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#334155', marginBottom: '20px' }}>
                  <div>{resolvedEmail}</div>
                  <div>{resolvedPhone}</div>
                  <div>{resolvedCity}</div>
                  {resolvedWebsite && <div>{resolvedWebsite}</div>}
                  {resolvedNationality && <div>Nationality: {resolvedNationality}</div>}
                </div>

                <h4 style={{ color: '#475569', fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '10px' }}>Skills</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  {resolvedSkills.map(s => (
                    <span key={s} style={{ fontSize: '12px', color: '#334155' }}>• {s}</span>
                  ))}
                </div>

                {resolvedLanguages.length > 0 && (
                  <>
                    <h4 style={{ color: '#475569', fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '10px' }}>Languages</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {resolvedLanguages.map(l => (
                        <span key={l} style={{ fontSize: '12px', color: '#334155' }}>• {l}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Main Column */}
              <div>
                <h4 style={{ color: '#0f172a', fontSize: '14px', textTransform: 'uppercase', borderBottom: '1.5px solid #475569', paddingBottom: '4px', marginBottom: '10px', marginTop: 0 }}>Professional Summary</h4>
                <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.6', marginBottom: '24px', margin: '0 0 24px 0' }}>
                  {resolvedSummary}
                </p>

                <h4 style={{ color: '#0f172a', fontSize: '14px', textTransform: 'uppercase', borderBottom: '1.5px solid #475569', paddingBottom: '4px', marginBottom: '10px' }}>Work Experience</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  {resolvedExperiences.map(exp => (
                    <div key={exp.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '13px' }}>
                        <span>{exp.role} at {exp.company}</span>
                        <span style={{ color: '#64748b' }}>{exp.startDate} - {exp.endDate}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#475569', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: '4px 0 0 0' }}>
                        {exp.description}
                      </p>
                    </div>
                  ))}
                </div>

                <h4 style={{ color: '#0f172a', fontSize: '14px', textTransform: 'uppercase', borderBottom: '1.5px solid #475569', paddingBottom: '4px', marginBottom: '10px' }}>Education</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {resolvedEducations.map(edu => (
                    <div key={edu.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '13px' }}>
                        <span>{edu.degree}, {edu.school}</span>
                        <span style={{ color: '#64748b' }}>{edu.gradDate}</span>
                      </div>
                      {edu.description && <p style={{ fontSize: '12px', color: '#475569', marginTop: '4px', margin: '4px 0 0 0' }}>{edu.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTemplate === 'executive_classic' && (
          <div style={{ padding: '10px' }}>
            {/* Centered Classic Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 style={{ color: '#000000', fontSize: '30px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>
                {resolvedFirstName} {resolvedLastName}
              </h1>
              <p style={{ color: '#4b5563', fontSize: '13px', fontWeight: '700', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1.5px', margin: '4px 0 0 0' }}>
                {resolvedJobTitle}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: '#4b5563', marginTop: '8px', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 0' }}>
                <span>{resolvedEmail}</span> • 
                <span>{resolvedPhone}</span> • 
                <span>{resolvedCity}</span>
                {resolvedWebsite && <> • <span>{resolvedWebsite}</span></>}
              </div>
            </div>

            {/* Summary */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '8px', color: '#000', marginTop: 0 }}>Professional Summary</h3>
              <p style={{ fontSize: '12px', lineHeight: '1.5', color: '#1f2937', margin: 0 }}>{resolvedSummary}</p>
            </div>

            {/* Experience */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '8px', color: '#000' }}>Experience</h3>
              {resolvedExperiences.map(exp => (
                <div key={exp.id} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '12px' }}>
                    <span>{exp.company} — {exp.role}</span>
                    <span>{exp.startDate} - {exp.endDate}</span>
                  </div>
                  <p style={{ fontSize: '11.5px', marginTop: '4px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: '4px 0 0 0' }}>{exp.description}</p>
                </div>
              ))}
            </div>

            {/* Education */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '8px', color: '#000' }}>Education</h3>
              {resolvedEducations.map(edu => (
                <div key={edu.id} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '12px' }}>
                    <span>{edu.school} — {edu.degree}</span>
                    <span>{edu.gradDate}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Skills Grid */}
            <div>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '8px', color: '#000' }}>Skills & Languages</h3>
              <div style={{ fontSize: '12px', color: '#1f2937' }}>
                <strong>Skills: </strong> {resolvedSkills.join(', ')}
              </div>
              {resolvedLanguages.length > 0 && (
                <div style={{ fontSize: '12px', color: '#1f2937', marginTop: '4px' }}>
                  <strong>Languages: </strong> {resolvedLanguages.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Creative Columns */}
        {selectedTemplate === 'creative_column' && (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '0', margin: '-40px', minHeight: '1123px' }}>
            {/* Left Sidebar */}
            <div style={{ backgroundColor: '#1e1b4b', color: '#e0e7ff', padding: '40px 24px' }}>
              {formData.profileImage && (
                <img src={formData.profileImage} style={{ width: '90px', height: '90px', borderRadius: '45px', objectFit: 'cover', border: '3px solid #6366f1', marginBottom: '24px' }} alt="" />
              )}
              
              <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '900', marginBottom: '24px', marginTop: 0 }}>
                {resolvedFirstName}<br />{resolvedLastName}
              </h2>

              <h4 style={{ color: '#a5b4fc', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Contact</h4>
              <div style={{ fontSize: '11px', lineHeight: '1.6', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>{resolvedEmail}</div>
                <div>{resolvedPhone}</div>
                <div>{resolvedCity}</div>
              </div>

              <h4 style={{ color: '#a5b4fc', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Expertise</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
                {resolvedSkills.map(s => (
                  <span key={s} style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px' }}>{s}</span>
                ))}
              </div>

              {resolvedLanguages.length > 0 && (
                <>
                  <h4 style={{ color: '#a5b4fc', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Languages</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                    {resolvedLanguages.map(l => (
                      <div key={l}>{l}</div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right Main Panel */}
            <div style={{ padding: '40px 32px', backgroundColor: '#ffffff', color: '#000000' }}>
              <h3 style={{ color: '#1e1b4b', fontSize: '16px', fontWeight: '800', borderBottom: '2px solid #6366f1', paddingBottom: '6px', marginBottom: '16px', marginTop: 0 }}>Professional summary</h3>
              <p style={{ fontSize: '12px', lineHeight: '1.6', color: '#334155', marginBottom: '28px', margin: '0 0 28px 0' }}>{resolvedSummary}</p>

              <h3 style={{ color: '#1e1b4b', fontSize: '16px', fontWeight: '800', borderBottom: '2px solid #6366f1', paddingBottom: '6px', marginBottom: '16px' }}>Work Experience</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
                {resolvedExperiences.map(exp => (
                  <div key={exp.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '12.5px', color: '#1e1b4b' }}>
                      <span>{exp.role} — {exp.company}</span>
                      <span style={{ color: '#6366f1' }}>{exp.startDate} - {exp.endDate}</span>
                    </div>
                    <p style={{ fontSize: '11.5px', color: '#475569', marginTop: '6px', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: '6px 0 0 0' }}>{exp.description}</p>
                  </div>
                ))}
              </div>

              <h3 style={{ color: '#1e1b4b', fontSize: '16px', fontWeight: '800', borderBottom: '2px solid #6366f1', paddingBottom: '6px', marginBottom: '16px' }}>Education</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {resolvedEducations.map(edu => (
                  <div key={edu.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '12px', color: '#1e1b4b' }}>
                      <span>{edu.degree} — {edu.school}</span>
                      <span style={{ color: '#6366f1' }}>{edu.gradDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Elegant Warm */}
        {selectedTemplate === 'elegant_warm' && (
          <div style={{ padding: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #d97706', paddingBottom: '16px', marginBottom: '24px' }}>
              <div>
                <h1 style={{ color: '#b45309', fontFamily: 'Georgia, serif', fontSize: '32px', fontWeight: '400', fontStyle: 'italic', margin: 0 }}>
                  {resolvedFirstName} {resolvedLastName}
                </h1>
                <p style={{ color: '#451a03', fontSize: '13px', fontWeight: '600', letterSpacing: '1px', marginTop: '4px', textTransform: 'uppercase', margin: '4px 0 0 0' }}>
                  {resolvedJobTitle}
                </p>
              </div>
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#78350f', lineHeight: '1.5' }}>
                <div>{resolvedEmail}</div>
                <div>{resolvedPhone}</div>
                <div>{resolvedCity}</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#b45309', fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: '600', borderBottom: '1px solid #f59e0b', paddingBottom: '4px', marginBottom: '8px', marginTop: 0 }}>Profile</h3>
              <p style={{ fontSize: '12px', color: '#451a03', lineHeight: '1.6', margin: 0 }}>{resolvedSummary}</p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#b45309', fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: '600', borderBottom: '1px solid #f59e0b', paddingBottom: '4px', marginBottom: '8px' }}>Experience</h3>
              {resolvedExperiences.map(exp => (
                <div key={exp.id} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Georgia, serif', fontWeight: '600', fontSize: '12.5px', color: '#78350f' }}>
                    <span>{exp.role} | {exp.company}</span>
                    <span>{exp.startDate} - {exp.endDate}</span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: '#451a03', marginTop: '6px', whiteSpace: 'pre-wrap', lineHeight: '1.5', margin: '6px 0 0 0' }}>{exp.description}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#b45309', fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: '600', borderBottom: '1px solid #f59e0b', paddingBottom: '4px', marginBottom: '8px' }}>Education</h3>
              {resolvedEducations.map(edu => (
                <div key={edu.id} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Georgia, serif', fontWeight: '600', fontSize: '12px', color: '#78350f' }}>
                    <span>{edu.degree} | {edu.school}</span>
                    <span>{edu.gradDate}</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ color: '#b45309', fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: '600', borderBottom: '1px solid #f59e0b', paddingBottom: '4px', marginBottom: '8px' }}>Skills</h3>
              <p style={{ fontSize: '11.5px', color: '#451a03', margin: 0 }}>
                {resolvedSkills.join(', ')}
              </p>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="page-wrapper container">
      {/* Wizard Steps indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '40px', flexWrap: 'wrap' }} className="no-print">
        {[
          { step: 1, label: 'Personal Details', icon: User },
          { step: 2, label: 'Experiences', icon: Briefcase },
          { step: 3, label: 'Education & Skills', icon: GraduationCap },
          { step: 4, label: 'Profile Summary', icon: FileText },
          { step: 5, label: 'Export Resume', icon: Layout }
        ].map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <button 
              key={s.step}
              onClick={() => setCurrentStep(s.step)}
              className={`btn ${isActive ? 'nav-link-active' : ''}`}
              style={{ 
                padding: '10px 16px', 
                borderRadius: '24px', 
                fontSize: '13px', 
                backgroundColor: isDone ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', 
                color: isDone ? '#10b981' : '#fff',
                border: isDone ? '1px solid rgba(16,185,129,0.2)' : '1px solid var(--dark-border)'
              }}
            >
              <Icon className="w-4 h-4 mr-1.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: currentStep === 5 ? '1fr' : '1.3fr 1fr', gap: '32px' }}>
        {/* Step Content */}
        {currentStep < 5 && (
          <div className="card animate-fade-in no-print">
            
            {/* STEP 1: Personal Details */}
            {currentStep === 1 && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '24px' }}>Personal Contact Information</h2>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>First Name</label>
                    <input type="text" placeholder="e.g. Sarah" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Last Name</label>
                    <input type="text" placeholder="e.g. Conner" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Professional Title</label>
                  <input type="text" placeholder="e.g. Senior Project Manager" value={formData.jobTitle} onChange={(e) => handleInputChange('jobTitle', e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Email</label>
                    <input type="email" placeholder="e.g. sarah.conner@example.com" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Phone</label>
                    <input type="text" placeholder="e.g. +1 (555) 789-0123" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Location</label>
                    <input type="text" placeholder="e.g. London, UK" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Website / Portfolio</label>
                    <input type="text" placeholder="e.g. sarahconner.dev" value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Nationality</label>
                    <input type="text" placeholder="e.g. British" value={formData.nationality} onChange={(e) => handleInputChange('nationality', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Profile Photo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {formData.profileImage && <img src={formData.profileImage} style={{ width: '48px', height: '48px', borderRadius: '24px', objectFit: 'cover', border: '2px solid var(--primary)' }} alt="" />}
                      <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => document.getElementById('photo-upload-input')?.click()}>
                        <Upload className="w-4 h-4 mr-1.5" />
                        Upload Photo
                      </button>
                      <input type="file" id="photo-upload-input" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Work Experience */}
            {currentStep === 2 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Work History</h2>
                  <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={addExperience}>
                    <Plus className="w-4 h-4 mr-1" /> Add Job
                  </button>
                </div>

                {formData.experiences.length === 0 ? (
                  <p style={{ color: 'var(--dark-text-secondary)', textAlign: 'center', padding: '40px 0' }}>
                    No jobs added yet. Click "Add Job" to describe your work history.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {formData.experiences.map((exp, index) => (
                      <div key={exp.id} style={{ border: '1px solid var(--dark-border)', padding: '20px', borderRadius: '12px', position: 'relative', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                        <button 
                          onClick={() => deleteExperience(exp.id)}
                          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                        
                        <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '14px' }}>Experience #{index + 1}</h4>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Company</label>
                            <input type="text" placeholder="e.g. Apex Digital Corp" value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Role / Title</label>
                            <input type="text" placeholder="e.g. Lead Project Manager" value={exp.role} onChange={(e) => updateExperience(exp.id, 'role', e.target.value)} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Start Date</label>
                            <input type="text" placeholder="e.g. Mar 2022" value={exp.startDate} onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>End Date</label>
                            <input type="text" placeholder="e.g. Present" value={exp.endDate} onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)} />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Description</label>
                          <textarea rows={3} placeholder="Describe your achievements and key responsibilities..." value={exp.description} onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Education & Skills */}
            {currentStep === 3 && (
              <div>
                {/* Academic History */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Academic Background</h2>
                  <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={addEducation}>
                    <Plus className="w-4 h-4 mr-1" /> Add Degree
                  </button>
                </div>

                {formData.educations.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                    {formData.educations.map((edu, index) => (
                      <div key={edu.id} style={{ border: '1px solid var(--dark-border)', padding: '20px', borderRadius: '12px', position: 'relative', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                        <button 
                          onClick={() => deleteEducation(edu.id)}
                          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                        
                        <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '14px' }}>Degree #{index + 1}</h4>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>School / University</label>
                            <input type="text" placeholder="e.g. Imperial College London" value={edu.school} onChange={(e) => updateEducation(edu.id, 'school', e.target.value)} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Degree / Major</label>
                            <input type="text" placeholder="e.g. M.S. in Management Science" value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                          <div style={{ width: '50%' }}>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: 'var(--dark-text-secondary)' }}>Graduation Year</label>
                            <input type="text" placeholder="e.g. 2018" value={edu.gradDate} onChange={(e) => updateEducation(edu.id, 'gradDate', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills tags selection */}
                <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px', borderTop: '1px solid var(--dark-border)', paddingTop: '24px' }}>Skills & Expertise</h2>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <input type="text" placeholder="Add a skill (e.g. React, Python)" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSkill()} />
                  <button className="btn btn-primary" onClick={addSkill}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.skills.map(s => (
                    <span key={s} style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--dark-border)', padding: '6px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      {s}
                      <Trash2 className="w-3.5 h-3.5 text-red-400 cursor-pointer" onClick={() => deleteSkill(s)} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Summary & Languages */}
            {currentStep === 4 && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Professional Summary</h2>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--dark-text-secondary)' }}>
                    Describe your professional value proposition
                  </label>
                  <textarea rows={6} placeholder="e.g. Experienced software engineer specializing in building scaleable apps..." value={formData.summary} onChange={(e) => handleInputChange('summary', e.target.value)} />
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px', borderTop: '1px solid var(--dark-border)', paddingTop: '24px' }}>Languages</h2>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <input type="text" placeholder="Add a language (e.g. English, French)" value={langInput} onChange={(e) => setLangInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLanguage()} />
                  <button className="btn btn-primary" onClick={addLanguage}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.languages.map(l => (
                    <span key={l} style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--dark-border)', padding: '6px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      {l}
                      <Trash2 className="w-3.5 h-3.5 text-red-400 cursor-pointer" onClick={() => deleteLanguage(l)} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Step navigation buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', borderTop: '1px solid var(--dark-border)', paddingTop: '20px' }}>
              <button className="btn btn-secondary" disabled={currentStep === 1} onClick={() => setCurrentStep(prev => prev - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </button>
              <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.15)' }} onClick={handleReset}>
                Reset & Start Over
              </button>
              <button className="btn btn-primary" onClick={() => setCurrentStep(prev => prev + 1)}>
                Next Step <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Choose Template & Export (Full page width) */}
        {currentStep === 5 && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px' }}>
            {/* Sidebar controls */}
            <div className="card no-print" style={{ height: 'fit-content' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Templates</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {[
                  { id: 'modern_slate', name: 'Modern Slate', color: '#4b5563' },
                  { id: 'executive_classic', name: 'Executive Classic', color: '#1e3a8a' },
                  { id: 'creative_column', name: 'Creative Columns', color: '#4f46e5' },
                  { id: 'elegant_warm', name: 'Elegant Warm', color: '#b45309' }
                ].map(t => (
                  <button 
                    key={t.id}
                    className={`btn ${selectedTemplate === t.id ? 'nav-link-active' : 'btn-secondary'}`}
                    style={{ justifyContent: 'flex-start', width: '100%', padding: '12px 16px' }}
                    onClick={() => setSelectedTemplate(t.id)}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '6px', backgroundColor: t.color, marginRight: '10px' }} />
                    {t.name}
                  </button>
                ))}
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setCurrentStep(4)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Edit Resume Data
              </button>
            </div>

            {/* Print Area Preview */}
            <div className="resume-preview-container card" style={{ padding: '0', backgroundColor: '#e2e8f0', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
              <div className="print-area" style={{ 
                width: '794px', 
                minHeight: '1123px', 
                backgroundColor: '#ffffff', 
                color: '#000000', 
                padding: '40px', 
                textAlign: 'left',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                boxSizing: 'border-box',
                fontFamily: selectedTemplate === 'elegant_warm' ? 'Georgia, serif' : 'Helvetica Neue, Helvetica, Arial, sans-serif'
              }}>
                {renderTemplateContent()}
              </div>
            </div>
          </div>
        )}

        {/* Real-time Preview Pane on the right (Steps 1-4) */}
        {currentStep < 5 && (
          <div className="card no-print" style={{ height: 'fit-content', padding: '20px', border: '1px solid var(--dark-border)', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
                Live Preview
              </h3>
            </div>
            
            {/* Template Selector Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--dark-border)', paddingBottom: '12px', overflowX: 'auto' }}>
              {[
                { id: 'modern_slate', name: 'Modern' },
                { id: 'executive_classic', name: 'Classic' },
                { id: 'creative_column', name: 'Columns' },
                { id: 'elegant_warm', name: 'Elegant' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`btn ${selectedTemplate === t.id ? 'nav-link-active' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '16px', whiteSpace: 'nowrap' }}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Scaled A4 Preview Sheet */}
            <div style={{ 
              overflow: 'hidden', 
              border: '1px solid var(--dark-border)', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(15, 23, 42, 0.4)', 
              width: '100%', 
              height: '495px', 
              position: 'relative',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ 
                width: '794px', 
                height: '1123px', 
                transform: 'scale(0.44)', 
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: '#ffffff', 
                color: '#000000', 
                padding: '40px', 
                textAlign: 'left',
                boxSizing: 'border-box',
                fontFamily: selectedTemplate === 'elegant_warm' ? 'Georgia, serif' : 'Helvetica Neue, Helvetica, Arial, sans-serif'
              }}>
                {renderTemplateContent()}
              </div>
            </div>
            
            <p style={{ fontSize: '11px', color: 'var(--dark-text-secondary)', marginTop: '12px', textAlign: 'center', margin: '12px 0 0 0' }}>
              Autosaved Draft • Real-time Sync
            </p>
          </div>
        )}
      </div>

      {/* CSS style block for print layouts */}
      <style>{`
        @media print {
          body, html {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide everything in body */
          body * {
            visibility: hidden;
          }
          /* Make only the print-area visible */
          .print-area, .print-area * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 40px !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>
    </div>
  );
}
