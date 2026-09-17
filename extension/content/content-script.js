// ResumeOK Content Script — ATS Form Detection, 1-Click Autofill & Job Match Extractor

(function() {
  if (window.__resumeokContentScriptLoaded) return;
  window.__resumeokContentScriptLoaded = true;

  // Helper: Set native input value with synthetic events
  function setVal(el, val) {
    if (!el || !val) return;
    try {
      if (el.tagName === 'SELECT') {
        const opts = Array.from(el.options || []);
        const vLower = String(val).toLowerCase();
        const match = opts.find(o => (o.value || '').toLowerCase().includes(vLower) || (o.text || '').toLowerCase().includes(vLower));
        if (match) {
          el.value = match.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set || Object.getOwnPropertyDescriptor(el, 'value')?.set;
      if (setter) setter.call(el, val);
      else el.value = val;
    } catch(e) {
      el.value = val;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // Base64 to Blob helper
  function b64ToBlob(b64, type) {
    try {
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) { bytes[i] = bin.charCodeAt(i); }
      return new Blob([bytes], { type: type || 'application/pdf' });
    } catch(e) { return null; }
  }

  // Detect Job Details on Active Page
  function extractJobDetails() {
    let title = '';
    let company = '';
    let description = '';

    // Title heuristics
    const h1 = document.querySelector('h1, .job-title, [class*="title" i]');
    if (h1) title = h1.innerText.trim();
    if (!title) title = document.title.split('-')[0].split('|')[0].trim();

    // Company heuristics
    const companyEl = document.querySelector('.company-name, [class*="company" i], meta[property="og:site_name"]');
    if (companyEl) {
      company = companyEl.getAttribute('content') || companyEl.innerText || '';
    }
    if (!company) {
      const host = window.location.hostname.replace('www.', '');
      company = host.split('.')[0].toUpperCase();
    }

    // Description
    const descEl = document.querySelector('#job-description, .job-description, [class*="description" i], article, main');
    if (descEl) description = descEl.innerText.substring(0, 3000);

    return {
      title: title || 'Software Engineer',
      company: company || 'Company',
      location: location || 'Kota',
      industry: industry || 'Computer Software',
      description,
      url: window.location.href
    };
  }

  // Real Job & Resume Match Scoring Calculation Algorithm
  function calculateRealJobMatch(job, profile) {
    const jobText = `${job.title} ${job.description} ${job.industry || ''}`.toLowerCase();
    
    // User skills array
    let userSkills = [];
    if (typeof profile.skills === 'string') {
      userSkills = profile.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    } else if (Array.isArray(profile.skills)) {
      userSkills = profile.skills.map(s => String(s).trim().toLowerCase()).filter(Boolean);
    }

    const userTitle = (profile.jobTitle || '').toLowerCase();
    const userSummary = (profile.workSummary || '').toLowerCase();
    const userFullText = `${userTitle} ${userSummary} ${userSkills.join(' ')}`.toLowerCase();

    // Extract key technical/domain keywords from job description
    const commonKeywords = [
      'react', 'react native', 'javascript', 'typescript', 'node.js', 'node', 'express',
      'python', 'java', 'c++', 'sql', 'postgresql', 'mongodb', 'docker', 'kubernetes',
      'aws', 'git', 'html', 'css', 'tailwind', 'ui/ux', 'design', 'figma', 'agile',
      'scrum', 'testing', 'cypress', 'jest', 'graphql', 'rest', 'api', 'frontend', 'backend', 'fullstack', 'web developer'
    ];

    const jobKeywords = commonKeywords.filter(k => jobText.includes(k));

    let matchedSkillsCount = 0;
    jobKeywords.forEach(k => {
      if (userFullText.includes(k)) {
        matchedSkillsCount++;
      }
    });

    const totalJobKeywords = Math.max(1, jobKeywords.length);
    const skillsRatio = matchedSkillsCount / totalJobKeywords;
    const skillsScore = Math.min(98, Math.max(30, Math.round(skillsRatio * 100)));

    // Role / Title Alignment
    const titleWords = job.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let titleMatches = 0;
    titleWords.forEach(w => {
      if (userFullText.includes(w)) titleMatches++;
    });
    const titleScore = titleWords.length > 0 ? Math.round((titleMatches / titleWords.length) * 100) : 60;

    // Resume Quality Score
    let rawResume = 30;
    if (profile.resumeFileName || profile.resumeFile || profile.resumeBase64) rawResume += 25;
    if (userSkills.length > 3) rawResume += 20;
    if (profile.firstName && profile.email && profile.phone) rawResume += 15;
    if (profile.workSummary && profile.workSummary.length > 20) rawResume += 10;
    const resumeScore = Math.min(98, Math.max(20, rawResume));

    // Combined Job Match Score
    const jobMatch = Math.min(98, Math.max(25, Math.round(skillsScore * 0.40 + titleScore * 0.40 + resumeScore * 0.20)));

    return {
      jobMatch,
      skillsScore,
      resumeScore,
      matchedSkillsCount,
      totalJobKeywords
    };
  }

  // Perform 1-Click Autofill
  function runAutofill(profile) {
    if (!profile) return { count: 0 };
    let filled = 0;

    const docs = [document];
    document.querySelectorAll('iframe').forEach(f => {
      try { if (f.contentDocument) docs.push(f.contentDocument); } catch(e) {}
    });

    const fn = (profile.firstName || '').trim();
    const ln = (profile.lastName || '').trim();
    const full = `${fn} ${ln}`.trim();
    const em = (profile.email || '').trim();
    const ph = (profile.phone || '').trim();
    const li = (profile.linkedinUrl || '').trim();
    const po = (profile.portfolioUrl || '').trim();
    const ci = (profile.city || '').trim();

    const sch = (profile.schoolName || '').trim();
    const deg = (profile.degree || '').trim();
    const dis = (profile.discipline || '').trim();
    const edStart = (profile.eduStartDate || '').trim();
    const edEnd = (profile.eduEndDate || '').trim();

    const emp = (profile.companyName || '').trim();
    const tit = (profile.jobTitle || '').trim();
    const wkStart = (profile.workStartDate || '').trim();
    const wkEnd = (profile.workEndDate || '').trim();

    const gen = (profile.gender || '').trim();
    const race = (profile.race || '').trim();
    const vet = (profile.veteranStatus || '').trim();
    const disab = (profile.disabilityStatus || '').trim();

    docs.forEach(doc => {
      // First Name
      if (fn) {
        doc.querySelectorAll('input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]').forEach(e => {
          if (!e.value) { setVal(e, fn); filled++; }
        });
      }
      // Last Name
      if (ln) {
        doc.querySelectorAll('input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]').forEach(e => {
          if (!e.value) { setVal(e, ln); filled++; }
        });
      }
      // Full Name
      if (full) {
        doc.querySelectorAll('input[name="name" i], input[id="name" i]').forEach(e => {
          if (!e.value) { setVal(e, full); filled++; }
        });
      }
      // Email
      if (em) {
        doc.querySelectorAll('input[type="email" i], input[name*="email" i], input[id*="email" i]').forEach(e => {
          if (!e.value) { setVal(e, em); filled++; }
        });
      }
      // Phone
      if (ph) {
        doc.querySelectorAll('input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]').forEach(e => {
          if (!e.value) { setVal(e, ph); filled++; }
        });
      }
      // LinkedIn
      if (li) {
        doc.querySelectorAll('input[name*="linkedin" i], input[id*="linkedin" i]').forEach(e => {
          if (!e.value) { setVal(e, li); filled++; }
        });
      }
      // Portfolio
      if (po) {
        doc.querySelectorAll('input[name*="website" i], input[name*="portfolio" i], input[id*="website" i]').forEach(e => {
          if (!e.value) { setVal(e, po); filled++; }
        });
      }
      // City
      if (ci) {
        doc.querySelectorAll('input[name*="city" i], input[id*="city" i], input[name*="location" i]').forEach(e => {
          if (!e.value) { setVal(e, ci); filled++; }
        });
      }
      // Education
      if (sch) {
        doc.querySelectorAll('input[name*="school" i], input[name*="university" i], input[id*="school" i]').forEach(e => {
          if (!e.value) { setVal(e, sch); filled++; }
        });
      }
      if (deg) {
        doc.querySelectorAll('input[name*="degree" i], input[id*="degree" i]').forEach(e => {
          if (!e.value) { setVal(e, deg); filled++; }
        });
      }
      if (dis) {
        doc.querySelectorAll('input[name*="discipline" i], input[name*="major" i]').forEach(e => {
          if (!e.value) { setVal(e, dis); filled++; }
        });
      }
      // Current Employer & Title
      if (emp) {
        doc.querySelectorAll('input[name*="company" i], input[name*="employer" i], input[id*="company" i]').forEach(e => {
          if (!e.value) { setVal(e, emp); filled++; }
        });
      }
      if (tit) {
        doc.querySelectorAll('input[name*="title" i], input[id*="title" i], input[name*="position" i]').forEach(e => {
          if (!e.value) { setVal(e, tit); filled++; }
        });
      }
      // Demographics
      if (gen) {
        doc.querySelectorAll('select[name*="gender" i], select[id*="gender" i], select[name*="sex" i]').forEach(s => setVal(s, gen));
      }
      if (race) {
        doc.querySelectorAll('select[name*="race" i], select[name*="ethnicity" i]').forEach(s => setVal(s, race));
      }

      // File attachments (PDF Resume & PDF Cover Letter)
      if (profile.resumeBase64) {
        try {
          const resBlob = b64ToBlob(profile.resumeBase64, 'application/pdf');
          if (resBlob) {
            const resFile = new File([resBlob], profile.resumeFileName || "Resume.pdf", { type: 'application/pdf' });
            const dt = new DataTransfer();
            dt.items.add(resFile);
            doc.querySelectorAll('input[type="file"]').forEach(inp => {
              const n = (inp.name || inp.id || '').toLowerCase();
              if (n.includes('resume') || n.includes('cv') || (!n.includes('cover') && !inp.files.length)) {
                inp.files = dt.files;
                inp.dispatchEvent(new Event('change', { bubbles: true }));
                filled++;
              }
            });
          }
        } catch(e) {}
      }
    });

    return { count: filled };
  }

  // Detect & Analyze Form Fields on Active Page for progress checklist
  function scanFormFields(profile) {
    const fields = [];
    const docs = [document];
    document.querySelectorAll('iframe').forEach(f => {
      try { if (f.contentDocument) docs.push(f.contentDocument); } catch(e) {}
    });

    const knownFieldSpecs = [
      { key: 'fn', label: 'First Name', profileProp: 'firstName', selector: 'input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]' },
      { key: 'ln', label: 'Last Name', profileProp: 'lastName', selector: 'input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]' },
      { key: 'em', label: 'Email Address', profileProp: 'email', selector: 'input[type="email" i], input[name*="email" i], input[id*="email" i]' },
      { key: 'ph', label: 'Phone', profileProp: 'phone', selector: 'input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]' },
      { key: 'res', label: 'Resume/CV', profileProp: 'resumeBase64', selector: 'input[type="file"][name*="resume" i], input[type="file"][id*="resume" i], input[type="file"]' },
      { key: 'cl', label: 'Cover Letter', profileProp: 'coverLetterText', selector: 'textarea[name*="cover" i], textarea[id*="cover" i]' },
      { key: 'li', label: 'LinkedIn Profile', profileProp: 'linkedinUrl', selector: 'input[name*="linkedin" i], input[id*="linkedin" i]' },
      { key: 'po', label: 'Portfolio Website', profileProp: 'portfolioUrl', selector: 'input[name*="website" i], input[name*="portfolio" i]' },
      { key: 'ci', label: 'Current Location', profileProp: 'city', selector: 'input[name*="city" i], input[id*="city" i], input[name*="location" i]' },
      { key: 'emp', label: 'Current Employer', profileProp: 'companyName', selector: 'input[name*="company" i], input[name*="employer" i]' },
      { key: 'tit', label: 'Current Job Title', profileProp: 'jobTitle', selector: 'input[name*="title" i], input[id*="title" i], input[name*="position" i]' },
      { key: 'sch', label: 'Education / School', profileProp: 'schoolName', selector: 'input[name*="school" i], input[name*="university" i]' },
      { key: 'np', label: 'Notice Period', profileProp: 'noticePeriod', selector: 'input[name*="notice" i], input[id*="notice" i]' },
      { key: 'sal', label: 'Yearly Salary Expectations', profileProp: 'salaryExpectation', selector: 'input[name*="salary" i], input[id*="salary" i]' }
    ];

    const missingProfileFieldsSet = new Set();

    knownFieldSpecs.forEach(spec => {
      let foundEl = null;
      for (const doc of docs) {
        foundEl = doc.querySelector(spec.selector);
        if (foundEl) break;
      }

      if (foundEl) {
        const isFilledOnForm = Boolean(
          foundEl.value || (foundEl.files && foundEl.files.length > 0)
        );
        const profileVal = profile ? (profile[spec.profileProp] || '') : '';
        const isMissingInProfile = !profileVal;

        let status = 'unfilled';
        if (isFilledOnForm) {
          status = 'filled';
        } else if (isMissingInProfile) {
          status = 'missing_profile';
          missingProfileFieldsSet.add(spec.label);
        }

        const isRequired = foundEl.required || foundEl.getAttribute('aria-required') === 'true' || Boolean(foundEl.closest('.required, [class*="required" i]'));

        fields.push({
          key: spec.key,
          label: spec.label,
          status, // 'filled' | 'missing_profile' | 'unfilled'
          isRequired,
          profileProp: spec.profileProp
        });
      }
    });

    // Also scan custom application textareas/questions
    docs.forEach(doc => {
      doc.querySelectorAll('textarea').forEach((ta, idx) => {
        const name = (ta.name || ta.id || ta.placeholder || '').toLowerCase();
        if (!name.includes('cover') && ta.offsetParent !== null) {
          const labelEl = doc.querySelector(`label[for="${ta.id}"]`) || ta.closest('.form-group, .field, [class*="question" i]')?.querySelector('label, .label-text');
          const labelText = labelEl ? labelEl.innerText.trim().replace(/\*/g, '').slice(0, 50) : `Custom Question ${idx + 1}`;
          const isFilled = Boolean(ta.value);
          fields.push({
            key: `custom_q_${idx}`,
            label: labelText,
            status: isFilled ? 'filled' : 'unfilled',
            isRequired: ta.required || Boolean(ta.closest('.required, [class*="required" i]'))
          });
        }
      });
    });

    const filledCount = fields.filter(f => f.status === 'filled').length;
    const totalCount = fields.length > 0 ? fields.length : 1;
    const percentage = Math.round((filledCount / totalCount) * 100);

    return {
      fields,
      filledCount,
      totalCount,
      percentage,
      missingProfileFields: Array.from(missingProfileFieldsSet)
    };
  }

  // Remove any legacy in-page floating host if present
  try {
    const existingHost = document.getElementById('applydesk-inpage-host');
    if (existingHost) existingHost.remove();
  } catch(e) {}

  // Message listener from extension action, popup, or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TOGGLE_DRAWER') {
      sendResponse({ success: true });
    } else if (request.type === 'GET_JOB_DETAILS') {
      sendResponse(extractJobDetails());
    } else if (request.type === 'GET_FORM_FIELDS_STATUS') {
      sendResponse(scanFormFields(request.profile));
    } else if (request.type === 'TRIGGER_AUTOFILL') {
      const res = runAutofill(request.profile);
      const scanRes = scanFormFields(request.profile);
      sendResponse({ success: true, count: res.count, scan: scanRes });
    }
    return true;
  });
})();
