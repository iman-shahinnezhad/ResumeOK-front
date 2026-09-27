// ResumeOK Content Script — ATS Form Detection, 1-Click Autofill & Job Match Extractor

(function() {
  if (window.__resumeokContentScriptLoaded) return;
  window.__resumeokContentScriptLoaded = true;

  const VALID_SAMPLE_PDF_B64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9SZXNvdXJjZXMgPDANCi9Gb250IDw8Ci9GMCA0IDAgUgppPj4KPj4KL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVCAvRjAgMjQgVGYgMTAwIDcwMCBUZCAoT21pZDBNb3JhZGkgLSBSZXN1bWUpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjA0MDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDEwOSAwMDAwMCBuIAowMDAwMDAwMjE2IDAwMDAwIG4gCjA0MDAwMDAwMjk1IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMzkxCiUlRU9G';

  // Helper: Set native input value with synthetic events & React native property setters
  function setVal(el, val) {
    if (!el || val === undefined || val === null) return;
    try {
      if (el.type === 'radio' || el.type === 'checkbox') {
        el.checked = true;
        el.dispatchEvent(new Event('click', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      if (el.tagName === 'SELECT') {
        const opts = Array.from(el.options || []);
        const terms = Array.isArray(val) ? val : [val];
        
        let matchIdx = -1;
        for (const term of terms) {
          if (!term) continue;
          const tLower = String(term).toLowerCase();
          matchIdx = opts.findIndex(o => {
            const txt = (o.text || '').toLowerCase();
            const v = (o.value || '').toLowerCase();
            return txt === tLower || v === tLower || txt.includes(tLower) || v.includes(tLower);
          });
          if (matchIdx !== -1) break;
        }

        if (matchIdx === -1 && opts.length > 1) {
          matchIdx = opts.findIndex(o => o.value || (o.text && !o.text.toLowerCase().includes('select')));
          if (matchIdx === -1) matchIdx = 1;
        }

        if (matchIdx !== -1 && opts[matchIdx]) {
          el.selectedIndex = matchIdx;
          el.value = opts[matchIdx].value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));

          // Update Select2 UI box if present on Greenhouse
          try {
            const select2Box = el.parentElement?.querySelector('.select2-choice span, .select2-chosen, [class*="select-value"], [class*="select-text"]');
            if (select2Box) {
              select2Box.innerText = opts[matchIdx].text || opts[matchIdx].value;
            }
          } catch(e) {}
        }
        return;
      }

      // Invoke native HTMLInputElement / HTMLTextAreaElement value setter for React/Vue/Angular property trackers
      const prototype = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const nativeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      
      if (nativeValueSetter) {
        nativeValueSetter.call(el, val);
      } else {
        el.value = val;
      }

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    } catch(e) {
      try {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } catch(err) {}
    }
  }

  // Helper: Find form input elements by inspecting associated labels, placeholders, aria-labels, name, id
  function findInputsByLabel(doc, searchTerms) {
    const matched = [];
    const allInputs = Array.from(doc.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'));
    
    for (const input of allInputs) {
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
      const name = (input.getAttribute('name') || '').toLowerCase();
      const id = (input.getAttribute('id') || '').toLowerCase();
      const dataQa = (input.getAttribute('data-qa') || '').toLowerCase();

      let isMatch = searchTerms.some(term => {
        const t = term.toLowerCase();
        return aria.includes(t) || placeholder.includes(t) || name.includes(t) || id.includes(t) || dataQa.includes(t);
      });

      if (!isMatch) {
        let labelEl = id ? doc.querySelector(`label[for="${id}"]`) : null;
        if (!labelEl) labelEl = input.closest('label');
        if (!labelEl) {
          const fieldWrapper = input.closest('.field, .form-group, [class*="field" i], [class*="form-group" i], tr, li');
          if (fieldWrapper) {
            labelEl = fieldWrapper.querySelector('label, .label, [class*="label" i], .field-label');
          }
        }

        if (labelEl) {
          let txt = labelEl.innerText || '';
          if (labelEl.querySelector('input, select, textarea')) {
            const clone = labelEl.cloneNode(true);
            clone.querySelectorAll('input, select, textarea').forEach(c => c.remove());
            txt = clone.innerText || '';
          }
          txt = txt.toLowerCase();
          isMatch = searchTerms.some(term => txt.includes(term.toLowerCase()));
        }
      }

      if (isMatch) matched.push(input);
    }
    return matched;
  }

  // Custom Select Dropdown Handler (Greenhouse Select2 / React Select UI)
  function fillCustomSelect(doc, searchTerms, value) {
    if (!value) return false;
    let filled = false;
    
    // 1. Check all selects (including hidden ones) matching labels
    const selects = Array.from(doc.querySelectorAll('select'));
    for (const s of selects) {
      const parent = s.closest('.field, label, div, [class*="education" i], [class*="school" i], [class*="degree" i]') || s.parentElement;
      const txt = (parent ? parent.innerText : '').toLowerCase() + ' ' + (s.name || s.id || '').toLowerCase();
      if (searchTerms.some(t => txt.includes(t.toLowerCase()))) {
        setVal(s, value);
        filled = true;
      }
    }

    // 2. Custom Select2 or React-Select UI containers containing "Select..."
    doc.querySelectorAll('a.select2-choice, div[class*="select" i], [role="combobox"]').forEach(div => {
      const parent = div.closest('.field, .form-group, label, div');
      const labelTxt = (parent ? parent.innerText : '').toLowerCase();
      if (searchTerms.some(t => labelTxt.includes(t.toLowerCase()))) {
        const span = div.querySelector('span, div') || div;
        if (span && (span.innerText.trim().includes('Select') || span.innerText.trim() === '')) {
          span.innerText = value;
          filled = true;
        }
      }
    });

    return filled;
  }

  // Base64 to Blob helper
  function b64ToBlob(b64, type) {
    if (!b64 || typeof b64 !== 'string') return null;
    try {
      const cleanB64 = b64.includes('base64,') ? b64.split('base64,')[1] : b64.trim();
      const bin = atob(cleanB64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) { bytes[i] = bin.charCodeAt(i); }
      return new Blob([bytes], { type: type || 'application/pdf' });
    } catch(e) { return null; }
  }

  // File Upload Helper with ATS UI Preview & Event Triggering
  function attachFileToInput(fileInp, blob, fileName) {
    if (!fileInp || !blob) return false;
    try {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInp.files = dt.files;

      ['change', 'input', 'blur'].forEach(evtName => {
        fileInp.dispatchEvent(new Event(evtName, { bubbles: true, cancelable: true }));
        fileInp.dispatchEvent(new CustomEvent(evtName, { bubbles: true, cancelable: true }));
      });

      if (typeof fileInp.onchange === 'function') {
        try { fileInp.onchange(); } catch(e) {}
      }

      try {
        if (window.jQuery) {
          window.jQuery(fileInp).trigger('change');
        }
      } catch(e) {}

      // Update ATS UI preview element
      try {
        const container = fileInp.closest('.field, .form-group, [class*="upload" i], [class*="attachment" i]') || fileInp.parentElement;
        if (container) {
          const chosenDisplay = container.querySelector('.chosen-file, .file-name, .filename, [data-file-name], span[class*="file" i]');
          if (chosenDisplay) {
            chosenDisplay.innerText = fileName;
            chosenDisplay.style.display = 'inline-block';
          } else {
            let preview = container.querySelector('.applydesk-file-preview');
            if (!preview) {
              preview = document.createElement('div');
              preview.className = 'applydesk-file-preview';
              preview.style.cssText = 'margin-top:6px; font-size:13px; font-weight:700; color:#10b981; display:flex; align-items:center; gap:6px;';
              container.appendChild(preview);
            }
            preview.innerHTML = `<span>📎 ${fileName} (Attached)</span>`;
          }
        }
      } catch(e) {}

      return true;
    } catch(e) {
      return false;
    }
  }

  // Scroll to webpage form field & flash glowing highlight animation
  function scrollToAndHighlightField(searchTerms, selector) {
    const docs = [document];
    document.querySelectorAll('iframe').forEach(f => {
      try { if (f.contentDocument) docs.push(f.contentDocument); } catch(e) {}
    });

    let targetEl = null;

    for (const doc of docs) {
      if (selector) {
        targetEl = doc.querySelector(selector);
        if (targetEl) break;
      }
      if (Array.isArray(searchTerms) && searchTerms.length > 0) {
        const matched = findInputsByLabel(doc, searchTerms);
        if (matched.length > 0) {
          targetEl = matched[0];
          break;
        }
      }
    }

    if (!targetEl && Array.isArray(searchTerms) && searchTerms.length > 0) {
      for (const doc of docs) {
        for (const term of searchTerms) {
          const el = Array.from(doc.querySelectorAll('label, div, span, button')).find(e => 
            (e.innerText || '').toLowerCase().includes(term.toLowerCase())
          );
          if (el) {
            targetEl = el;
            break;
          }
        }
        if (targetEl) break;
      }
    }

    if (targetEl) {
      const scrollParent = targetEl.closest('.field, .form-group, label, div') || targetEl;
      scrollParent.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const origShadow = targetEl.style.boxShadow;
      const origBorder = targetEl.style.borderColor;
      const origTransition = targetEl.style.transition;

      targetEl.style.transition = 'all 0.3s ease';
      targetEl.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.55), 0 0 25px rgba(16, 185, 129, 0.35)';
      targetEl.style.borderColor = '#10b981';

      if (typeof targetEl.focus === 'function') {
        try { targetEl.focus(); } catch(e) {}
      }

      setTimeout(() => {
        targetEl.style.boxShadow = origShadow || '';
        targetEl.style.borderColor = origBorder || '';
        targetEl.style.transition = origTransition || '';
      }, 2500);

      return true;
    }
    return false;
  }

  // Detect Job Details on Active Page
  function extractJobDetails() {
    let title = '';
    let company = '';
    let location = '';
    let description = '';
    let companyOverview = '';

    const url = window.location.href;
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname;

    // 1. Company extraction from URL structure & meta tags
    if (hostname.includes('greenhouse.io')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts[0] && parts[0] !== 'embed' && parts[0] !== 'jobs') company = parts[0];
      else if (parts[1]) company = parts[1];
    } else if (hostname.includes('lever.co')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts[0]) company = parts[0];
    } else if (hostname.includes('ashbyhq.com')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts[0]) company = parts[0];
    } else if (hostname.includes('workday.com') || hostname.includes('myworkdayjobs.com')) {
      company = hostname.split('.')[0].replace(/-.*/, '');
    } else if (hostname.includes('bamboohr.com')) {
      company = hostname.split('.')[0];
    }

    if (!company) {
      const compMeta = document.querySelector('meta[property="og:site_name"], meta[name="author"], meta[name="twitter:site"]');
      if (compMeta && compMeta.content) company = compMeta.content.trim();
    }

    if (!company) {
      const compEl = document.querySelector('.company-name, [class*="companyName" i], [class*="company-name" i], [data-qa="company-name"], .topcard__org-name-link, [data-automation-id="companyName"]');
      if (compEl) company = compEl.innerText.trim();
    }

    if (!company) {
      const hostClean = hostname.replace(/^www\./, '').replace(/\.(com|co|io|org|net|app|dev).*/, '');
      company = hostClean.charAt(0).toUpperCase() + hostClean.slice(1);
    }
    // Clean company formatting
    company = company.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();

    // 2. Job Title extraction from ATS DOM structures
    const titleSelectors = [
      '.job-details-jobs-unified-top-card__job-title', // LinkedIn
      'h1.jobsearch-JobInfoHeader-title', // Indeed
      '.app-title', // Greenhouse
      '.posting-headline h2', // Lever
      '[data-automation-id="jobPostingHeader"]', // Workday
      '[data-automation-id="jobTitle"]',
      'h1[class*="title" i]',
      'h1[class*="heading" i]',
      'h1.title',
      'h1'
    ];

    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 2) {
        const text = el.innerText.trim();
        if (!/^(careers|jobs|search|apply|welcome|login|sign in|openings|all jobs)$/i.test(text)) {
          title = text;
          break;
        }
      }
    }

    if (!title) {
      const docTitle = document.title || '';
      const cleanDocTitle = docTitle.split(/[-|–•]/)[0].trim();
      if (cleanDocTitle && cleanDocTitle.length > 2 && !/^(careers|jobs|apply)$/i.test(cleanDocTitle)) {
        title = cleanDocTitle;
      }
    }

    title = title.replace(/^(apply for|job application for|opening for)\s+/i, '').trim();

    // 3. Location extraction
    const locSelectors = [
      '.location',
      '[class*="location" i]',
      '[data-automation-id="locations"]',
      '.job-details-jobs-unified-top-card__bullet',
      '.posting-category.location'
    ];

    for (const sel of locSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText) {
        const txt = el.innerText.trim();
        if (txt && txt.length < 80 && !txt.toLowerCase().includes('apply')) {
          location = txt;
          break;
        }
      }
    }

    // 4. Job Description & Company Overview extraction
    const descSelectors = [
      '#job-description',
      '.job-description',
      '[class*="description" i]',
      '[data-automation-id="jobPostingDescription"]',
      '#content .content',
      'article',
      'main'
    ];

    for (const sel of descSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 100) {
        description = el.innerText.trim();
        break;
      }
    }

    if (!description && document.body) {
      description = document.body.innerText.substring(0, 5000);
    }

    const aboutMatch = description.match(/(?:about us|who we are|about the company|our mission)[\s\S]{50,600}/i);
    if (aboutMatch) {
      companyOverview = aboutMatch[0].trim();
    } else {
      companyOverview = `${company} is hiring a ${title || 'candidate'} in ${location || 'their team'}.`;
    }

    return {
      title: title || 'Position Applied',
      company: company || 'Company',
      location: location || 'Remote / Unspecified',
      companyOverview,
      description: description.substring(0, 10000),
      url
    };
  }

  // Real Job & Resume Match Scoring Calculation Algorithm
  function calculateRealJobMatch(job, profile) {
    if (!job) job = {};
    if (!profile) profile = {};

    const jobText = `${job.title || ''} ${job.description || ''} ${job.companyOverview || ''}`.toLowerCase();
    
    let userSkills = [];
    if (typeof profile.skills === 'string') {
      userSkills = profile.skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    } else if (Array.isArray(profile.skills)) {
      userSkills = profile.skills.map(s => String(s).trim().toLowerCase()).filter(Boolean);
    }

    let userExpText = '';
    if (Array.isArray(profile.workExperiences)) {
      userExpText = profile.workExperiences.map(e => `${e.role || e.title || ''} ${e.company || ''} ${e.description || ''}`).join(' ');
    }

    const userTitle = (profile.jobTitle || '').toLowerCase();
    const userSummary = (profile.summary || profile.workSummary || '').toLowerCase();
    const userFullText = `${userTitle} ${userSummary} ${userExpText} ${userSkills.join(' ')}`.toLowerCase();

    const commonKeywords = [
      'react', 'react native', 'javascript', 'typescript', 'node.js', 'node', 'express',
      'python', 'java', 'c++', 'c#', 'ruby', 'go', 'php', 'sql', 'postgresql', 'mongodb', 'redis', 'docker', 'kubernetes',
      'aws', 'gcp', 'azure', 'git', 'html', 'css', 'tailwind', 'ui/ux', 'design', 'figma', 'agile',
      'scrum', 'testing', 'cypress', 'jest', 'graphql', 'rest', 'api', 'frontend', 'backend', 'fullstack', 'mobile',
      'management', 'leadership', 'communication', 'logistics', 'customer service', 'sales', 'marketing'
    ];

    const jobKeywords = commonKeywords.filter(k => jobText.includes(k));
    const matchedSkills = [];
    const missingSkills = [];

    jobKeywords.forEach(k => {
      if (userFullText.includes(k)) {
        matchedSkills.push(k);
      } else {
        missingSkills.push(k);
      }
    });

    const totalJobKeywords = Math.max(1, jobKeywords.length);
    const skillsRatio = matchedSkills.length / totalJobKeywords;
    const skillsScore = Math.min(98, Math.max(30, Math.round(skillsRatio * 100)));

    const titleWords = (job.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let titleMatches = 0;
    titleWords.forEach(w => {
      if (userFullText.includes(w)) titleMatches++;
    });
    const titleScore = titleWords.length > 0 ? Math.round((titleMatches / titleWords.length) * 100) : 60;

    let rawResume = 25;
    if (profile.resumeFileName || profile.resumeFile || profile.resumeBase64) rawResume += 25;
    if (userSkills.length > 2) rawResume += 25;
    if (profile.firstName && profile.email && profile.phone) rawResume += 25;
    const resumeScore = Math.min(98, Math.max(20, rawResume));

    const jobMatch = Math.min(98, Math.max(25, Math.round(skillsScore * 0.45 + titleScore * 0.35 + resumeScore * 0.20)));

    return {
      jobMatch,
      skillsScore,
      resumeScore,
      matchedSkillsCount: matchedSkills.length,
      totalJobKeywords,
      matchedSkills,
      missingSkills: missingSkills.slice(0, 5)
    };
  }

  // Generate Professional Tailored AI Cover Letter
  function generateTailoredCoverLetter(job, profile) {
    if (profile && profile.coverLetterText && profile.coverLetterText.trim().length > 50) {
      return profile.coverLetterText.trim();
    }

    const candidateName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '';
    const jobTitle = job ? (job.title || 'the open position') : 'the position';
    const company = job ? (job.company || 'your company') : 'your team';
    const skills = Array.isArray(profile?.skills) ? profile.skills.slice(0, 5).join(', ') : (profile?.skills || 'software engineering and problem solving');

    return `Dear Hiring Team at ${company},\n\nI am writing to express my strong interest in the ${jobTitle} position. With my background in ${skills}, I am confident in my ability to bring immediate value and technical excellence to ${company}.\n\nThroughout my career, I have consistently focused on delivering scalable solutions, driving key projects, and collaborating effectively across cross-functional teams. I am particularly drawn to ${company}'s work and values, and I welcome the opportunity to contribute my skills in ${skills} to support your team's goals.\n\nThank you for your time and consideration. I look forward to discussing how my experience aligns with the needs of ${company}.\n\nSincerely,\n${candidateName || 'Applicant'}`;
  }

  // Perform 1-Click Autofill
  function runAutofill(profile) {
    if (!profile) return { count: 0, reason: 'no_profile' };

    // Check if candidate profile actually has data
    const hasCandidateData = Boolean(
      profile.firstName || profile.lastName || profile.email || profile.phone || profile.resumeBase64 || profile.resumeFileName
    );

    if (!hasCandidateData) {
      return { count: 0, reason: 'profile_empty' };
    }

    let filled = 0;
    const jobDetails = extractJobDetails();

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
    const ci = (profile.city || profile.location || '').trim();
    const co = (profile.country || '').trim();

    const eduItem = Array.isArray(profile.education) && profile.education.length > 0 ? profile.education[0] : {};
    const sch = (profile.schoolName || profile.school || eduItem.school || eduItem.institution || '').trim();
    const deg = (profile.degree || eduItem.degree || '').trim();
    const dis = (profile.discipline || profile.fieldOfStudy || eduItem.fieldOfStudy || eduItem.major || '').trim();

    const emp = (profile.companyName || '').trim();
    const tit = (profile.jobTitle || '').trim();

    docs.forEach(doc => {
      // First Name
      if (fn) {
        const inputs = findInputsByLabel(doc, ['first name', 'given name', 'first_name', 'fname']);
        if (inputs.length > 0) {
          inputs.forEach(e => { setVal(e, fn); filled++; });
        } else {
          doc.querySelectorAll('input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]').forEach(e => {
            setVal(e, fn); filled++;
          });
        }
      }

      // Last Name
      if (ln) {
        const inputs = findInputsByLabel(doc, ['last name', 'family name', 'surname', 'last_name', 'lname']);
        if (inputs.length > 0) {
          inputs.forEach(e => { setVal(e, ln); filled++; });
        } else {
          doc.querySelectorAll('input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]').forEach(e => {
            setVal(e, ln); filled++;
          });
        }
      }

      // Full Name
      if (full) {
        const inputs = findInputsByLabel(doc, ['full name', 'candidate name', 'your name']);
        if (inputs.length > 0) {
          inputs.forEach(e => { setVal(e, full); filled++; });
        } else {
          doc.querySelectorAll('input[name="name" i], input[id="name" i], input[placeholder*="full name" i]').forEach(e => {
            setVal(e, full); filled++;
          });
        }
      }

      // Email
      if (em) {
        const inputs = findInputsByLabel(doc, ['email', 'e-mail', 'email address']);
        if (inputs.length > 0) {
          inputs.forEach(e => { setVal(e, em); filled++; });
        } else {
          doc.querySelectorAll('input[type="email" i], input[name*="email" i], input[id*="email" i]').forEach(e => {
            setVal(e, em); filled++;
          });
        }
      }

      // Phone
      if (ph) {
        const inputs = findInputsByLabel(doc, ['phone', 'mobile', 'telephone', 'phone number']);
        if (inputs.length > 0) {
          inputs.forEach(e => { setVal(e, ph); filled++; });
        } else {
          doc.querySelectorAll('input[type="tel" i], input[name*="phone" i], input[id*="phone" i], input[name*="mobile" i]').forEach(e => {
            setVal(e, ph); filled++;
          });
        }
      }

      // LinkedIn
      if (li) {
        const inputs = findInputsByLabel(doc, ['linkedin', 'linkedin url', 'linkedin profile']);
        if (inputs.length > 0) {
          inputs.forEach(e => { setVal(e, li); filled++; });
        } else {
          doc.querySelectorAll('input[name*="linkedin" i], input[id*="linkedin" i], input[placeholder*="linkedin" i]').forEach(e => {
            setVal(e, li); filled++;
          });
        }
      }

      // Portfolio / Website
      if (po) {
        const inputs = findInputsByLabel(doc, ['website', 'portfolio', 'personal website']);
        if (inputs.length > 0) {
          inputs.forEach(e => { setVal(e, po); filled++; });
        } else {
          doc.querySelectorAll('input[name*="website" i], input[name*="portfolio" i], input[id*="website" i], input[id*="portfolio" i]').forEach(e => {
            setVal(e, po); filled++;
          });
        }
      }

      // City / Location
      if (ci) {
        const inputs = findInputsByLabel(doc, ['location', 'city', 'address', 'current location']);
        if (inputs.length > 0) {
          inputs.forEach(e => { setVal(e, ci); filled++; });
        } else {
          doc.querySelectorAll('input[name*="city" i], input[id*="city" i], input[name*="location" i], input[id*="location" i]').forEach(e => {
            setVal(e, ci); filled++;
          });
        }
      }

      // Country
      if (co) {
        const countryInputs = findInputsByLabel(doc, ['country', 'nation']);
        if (countryInputs.length > 0) {
          countryInputs.forEach(e => { setVal(e, co); filled++; });
        } else {
          doc.querySelectorAll('select[name*="country" i], select[id*="country" i]').forEach(s => {
            setVal(s, co); filled++;
          });
        }
      }

      // Education - School
      if (sch) {
        const schoolInputs = findInputsByLabel(doc, ['school', 'university', 'institution']);
        if (schoolInputs.length > 0) {
          schoolInputs.forEach(e => { setVal(e, sch); filled++; });
        } else {
          doc.querySelectorAll('select[name*="school" i], select[id*="school" i], input[name*="school" i], input[id*="school" i]').forEach(e => {
            setVal(e, sch); filled++;
          });
        }
      }

      // Education - Degree
      if (deg) {
        const degreeInputs = findInputsByLabel(doc, ['degree', 'education level']);
        if (degreeInputs.length > 0) {
          degreeInputs.forEach(e => { setVal(e, deg); filled++; });
        } else {
          doc.querySelectorAll('select[name*="degree" i], select[id*="degree" i], input[name*="degree" i], input[id*="degree" i]').forEach(e => {
            setVal(e, deg); filled++;
          });
        }
      }

      // Education - Major
      if (dis) {
        const disInputs = findInputsByLabel(doc, ['discipline', 'major', 'field of study']);
        if (disInputs.length > 0) {
          disInputs.forEach(e => { setVal(e, dis); filled++; });
        } else {
          doc.querySelectorAll('input[name*="discipline" i], input[name*="major" i]').forEach(e => {
            setVal(e, dis); filled++;
          });
        }
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

      // Cover Letter Text & Textareas (Tailored AI Cover Letter)
      const clText = generateTailoredCoverLetter(jobDetails, profile);
      const fillCoverLetterTextareas = () => {
        const coverEls = findInputsByLabel(doc, ['cover letter', 'cover_letter', 'letter of motivation', 'why do you want to work']);
        if (coverEls.length > 0) {
          coverEls.forEach(ta => {
            if (ta.tagName === 'TEXTAREA' || ta.tagName === 'INPUT') {
              setVal(ta, clText);
              filled++;
            }
          });
        } else {
          doc.querySelectorAll('textarea[name*="cover" i], textarea[id*="cover" i], textarea[placeholder*="cover" i]').forEach(ta => {
            setVal(ta, clText);
            filled++;
          });
        }
      };

      fillCoverLetterTextareas();

      // Attach Resume & Cover Letter PDF Files to input[type="file"] WITHOUT duplicates
      try {
        const attachedInputs = new Set();
        const resB64 = profile.resumeBase64 || (profile.resumeFile ? profile.resumeFile : null);
        const resBlob = resB64 ? b64ToBlob(resB64, 'application/pdf') : null;
        const resFileName = profile.resumeFileName || `${fn || 'Candidate'}_Resume.pdf`;

        const clB64 = profile.coverLetterBase64 || resB64;
        const clBlob = clB64 ? b64ToBlob(clB64, 'application/pdf') : null;
        const clFileName = `${fn || 'Candidate'}_CoverLetter.pdf`;

        const fileInputs = Array.from(doc.querySelectorAll('input[type="file"]'));

        if (fileInputs.length > 0) {
          // 1. Cover letter file inputs
          fileInputs.forEach(fileInp => {
            if (attachedInputs.has(fileInp)) return;
            const container = fileInp.closest('.field, .form-group, label, div') || fileInp.parentElement;
            const labelText = ((fileInp.name || '') + ' ' + (fileInp.id || '') + ' ' + (fileInp.getAttribute('aria-label') || '') + ' ' + (container ? container.innerText : '')).toLowerCase();

            if (labelText.includes('cover') || labelText.includes('letter')) {
              if (clBlob) {
                attachFileToInput(fileInp, clBlob, clFileName);
                attachedInputs.add(fileInp);
                filled++;
              }
            }
          });

          // 2. Resume / CV file inputs
          fileInputs.forEach(fileInp => {
            if (attachedInputs.has(fileInp)) return;
            const container = fileInp.closest('.field, .form-group, label, div') || fileInp.parentElement;
            const labelText = ((fileInp.name || '') + ' ' + (fileInp.id || '') + ' ' + (fileInp.getAttribute('aria-label') || '') + ' ' + (container ? container.innerText : '')).toLowerCase();

            if (labelText.includes('resume') || labelText.includes('cv') || labelText.includes('curriculum')) {
              if (resBlob) {
                attachFileToInput(fileInp, resBlob, resFileName);
                attachedInputs.add(fileInp);
                filled++;
              }
            }
          });

          // 3. Fallback: If no input matched 'resume' or 'cover', attach resume ONLY to the FIRST unattached file input
          if (attachedInputs.size === 0 && resBlob && fileInputs[0]) {
            attachFileToInput(fileInputs[0], resBlob, resFileName);
            attachedInputs.add(fileInputs[0]);
            filled++;
          }
        }
      } catch(e) {}
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
      { key: 'fn', label: 'First Name', profileProp: 'firstName', terms: ['first name', 'given name', 'first_name', 'fname'] },
      { key: 'ln', label: 'Last Name', profileProp: 'lastName', terms: ['last name', 'family name', 'surname', 'last_name', 'lname'] },
      { key: 'em', label: 'Email Address', profileProp: 'email', terms: ['email', 'email address', 'e-mail'] },
      { key: 'ph', label: 'Phone Number', profileProp: 'phone', terms: ['phone', 'mobile', 'telephone', 'phone number'] },
      { key: 'res', label: 'Resume/CV PDF', profileProp: 'resumeFileName', terms: ['resume', 'cv', 'curriculum'] },
      { key: 'cl', label: 'Cover Letter', profileProp: 'coverLetterText', terms: ['cover letter', 'cover_letter', 'letter'] },
      { key: 'li', label: 'LinkedIn URL', profileProp: 'linkedinUrl', terms: ['linkedin', 'linkedin profile', 'linkedin_url'] },
      { key: 'po', label: 'Portfolio Website', profileProp: 'portfolioUrl', terms: ['portfolio', 'website', 'personal website'] },
      { key: 'ci', label: 'Location / City', profileProp: 'city', terms: ['city', 'location', 'current location'] },
      { key: 'emp', label: 'Current Employer', profileProp: 'companyName', terms: ['company', 'employer', 'current company'] }
    ];

    docs.forEach(doc => {
      knownFieldSpecs.forEach(spec => {
        const inputs = findInputsByLabel(doc, spec.terms);
        if (inputs.length > 0) {
          const inp = inputs[0];
          const hasUserVal = profile && Boolean(profile[spec.profileProp] || (spec.key === 'ci' && profile.location));
          const currentDOMVal = (inp.value || inp.innerText || (inp.files && inp.files.length > 0 ? inp.files[0].name : '')).trim();
          
          let status = 'empty';
          if (currentDOMVal.length > 0) {
            status = 'filled';
          } else if (hasUserVal) {
            status = 'ready_to_autofill';
          } else {
            status = 'missing_profile_data';
          }

          fields.push({
            key: spec.key,
            label: spec.label,
            status,
            hasDataInProfile: hasUserVal,
            currentValue: currentDOMVal
          });
        }
      });
    });

    const filledCount = fields.filter(f => f.status === 'filled').length;
    const readyCount = fields.filter(f => f.status === 'ready_to_autofill').length;

    return {
      fields,
      filledCount,
      readyCount,
      totalCount: fields.length,
      percentage: fields.length > 0 ? Math.round((filledCount / fields.length) * 100) : 0
    };
  }

  // Helper to check if extension context is valid
  function isExtensionValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch(e) {
      return false;
    }
  }

  // Inject Right-Edge Floating Dock Tab connected to Chrome Extension Side Panel
  function injectInPageFloatingDockTab() {
    if (window !== window.top) return;
    if (document.getElementById('applydesk-inpage-host')) return;

    const host = document.createElement('div');
    host.id = 'applydesk-inpage-host';
    host.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; right: 0; pointer-events: none;';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

      /* Floating Right Edge Dock Tab (Light Semi-Circle Pill with Green Circle & Paperplane Icon) */
      .dock-tab {
        position: fixed;
        right: 0;
        top: 38%;
        transform: translateY(-50%);
        width: 52px;
        height: 58px;
        background: #e2e8f0;
        border: 1.5px solid #cbd5e1;
        border-right: none;
        border-radius: 29px 0 0 29px;
        display: none; /* Hidden by default until user collapses extension sidepanel */
        align-items: center;
        justify-content: center;
        cursor: pointer;
        pointer-events: auto;
        box-shadow: -4px 6px 22px rgba(15, 23, 42, 0.16);
        transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s ease;
        z-index: 2147483646;
      }

      .dock-tab:hover {
        width: 62px;
      }

      .dock-green-circle {
        width: 42px;
        height: 42px;
        background: #00c88a;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0, 200, 138, 0.35);
      }

      .dock-green-circle svg {
        width: 22px;
        height: 22px;
        stroke: #0f172a;
        margin-left: -2px;
        margin-top: 1px;
      }
    `;

    const widget = document.createElement('div');
    widget.innerHTML = `
      <div id="ad-dock-tab" class="dock-tab" title="Open ApplyDesk Copilot">
        <div class="dock-green-circle">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
          </svg>
        </div>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(widget);

    const dockTab = shadow.getElementById('ad-dock-tab');
    if (dockTab) {
      dockTab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFloatingRightOverlayDrawer();
      });
    }
  }

  // Inject Pixel-Perfect "Edit Your Information" Modal Overlay on Active Page Tab (Matching Image 2 Design)
  function openEditInfoModal() {
    if (window !== window.top) return;
    let host = document.getElementById('applydesk-modal-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'applydesk-modal-host';
      host.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: auto;';
      document.body.appendChild(host);
    }

    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '';

    let currentProfile = {};
    let userResumes = [];
    let activeToken = null;
    let activeUser = null;

    if (isExtensionValid()) {
      try {
        chrome.storage.local.get(['resumeok_profile', 'resumeok_token', 'resumeok_user', 'resumeok_resumes'], async (res) => {
          if (res) {
            if (res.resumeok_profile) currentProfile = res.resumeok_profile;
            if (res.resumeok_token) activeToken = res.resumeok_token;
            if (res.resumeok_user) activeUser = res.resumeok_user;
            if (res.resumeok_resumes) userResumes = res.resumeok_resumes;
          }

          // Fetch fresh MongoDB profile & documents if logged in
          if (activeToken) {
            const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3030' : 'https://api.applydesk.io';
            const targetUserId = (activeUser && (activeUser.id || activeUser._id || activeUser.email)) || 'me';
            try {
              const profRes = await fetch(`${apiBase}/api/user/${targetUserId}/profile`, {
                headers: { 'Authorization': `Bearer ${activeToken}` }
              });
              if (profRes.ok) {
                const profData = await profRes.json();
                if (profData && profData.profile) {
                  currentProfile = { ...currentProfile, ...profData.profile };
                  chrome.storage.local.set({ resumeok_profile: currentProfile });
                }
              }
            } catch(e) {}

            try {
              const docRes = await fetch(`${apiBase}/api/user/${targetUserId}/documents`, {
                headers: { 'Authorization': `Bearer ${activeToken}` }
              });
              if (docRes.ok) {
                const docData = await docRes.json();
                if (docData && docData.resumes) {
                  userResumes = docData.resumes;
                  chrome.storage.local.set({ resumeok_resumes: userResumes });
                }
              }
            } catch(e) {}
          }
          renderModal();
        });
      } catch(e) { renderModal(); }
    } else {
      renderModal();
    }

    function renderModal() {
      const style = document.createElement('style');
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
        }

        .modal-card {
          width: 880px;
          max-width: 94vw;
          height: 640px;
          max-height: 92vh;
          background: #ffffff;
          border-radius: 28px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.35);
          animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Header matching mockup */
        .modal-header {
          height: 72px;
          padding: 0 24px;
          background: #f4f4f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
        }

        .brand-box { display: flex; align-items: center; gap: 12px; }

        .logo-icon {
          width: 44px;
          height: 44px;
          background: #fbf5e8;
          border: 1.5px solid #e8dfc8;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-title { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
        .brand-sub { font-size: 12px; color: #64748b; font-weight: 500; }

        .close-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #ffffff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .close-btn:hover { background: #f1f5f9; transform: scale(1.06); }

        /* Body Split Layout matching mockup */
        .modal-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .modal-sidebar {
          width: 220px;
          border-right: 1px solid #e2e8f0;
          padding: 20px 14px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .nav-item:hover { background: #f8fafc; color: #0f172a; }
        .nav-item.active { background: #e2e8f0; color: #0f172a; font-weight: 800; }

        .modal-content {
          flex: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow-y: auto;
          background: #ffffff;
        }

        .no-resume-banner {
          background: #fbf5e8;
          border: 1.5px solid #e8dfc8;
          border-radius: 18px;
          padding: 14px 18px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .banner-icon-box {
          font-size: 24px;
          flex-shrink: 0;
        }

        .banner-content {
          flex: 1;
        }

        .banner-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
        }

        .banner-desc {
          font-size: 11.5px;
          color: #64748b;
          font-weight: 500;
          line-height: 1.4;
        }

        .banner-upload-btn {
          background: #000000;
          color: #ffffff;
          border: none;
          border-radius: 20px;
          padding: 9px 18px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: opacity 0.2s, transform 0.15s;
        }

        .banner-upload-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .tab-pane { display: none; flex-direction: column; gap: 16px; width: 100%; }
        .tab-pane.active { display: flex; }

        /* Pill Input Grid matching mockup */
        .input-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .input-pill-box {
          background: #e5e5e5;
          border-radius: 18px;
          padding: 10px 18px;
          display: flex;
          flex-direction: column;
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }

        .input-pill-box:focus-within {
          background: #d4d4d4;
          box-shadow: 0 0 0 2px #0f172a;
        }

        .input-label {
          font-size: 11px;
          font-weight: 600;
          color: #737373;
          margin-bottom: 2px;
        }

        .input-field {
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          width: 100%;
        }

        textarea.input-field {
          resize: vertical;
          min-height: 50px;
          font-family: inherit;
        }

        /* Entry Cards for Work / Edu / Projects */
        .card-list { display: flex; flex-direction: column; gap: 12px; }
        .entry-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px 18px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .btn-remove-entry {
          position: absolute;
          top: 10px;
          right: 12px;
          background: #fee2e2;
          color: #ef4444;
          border: none;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-add-entry {
          align-self: flex-start;
          background: #e2e8f0;
          color: #0f172a;
          border: none;
          border-radius: 14px;
          padding: 8px 18px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 4px;
        }
        .btn-add-entry:hover { background: #cbd5e1; }

        /* Update Action Button matching mockup */
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-top: 24px;
          flex-shrink: 0;
        }

        .btn-update-pill {
          background: #0f172a;
          color: #ffffff;
          border-radius: 24px;
          padding: 14px 44px;
          font-size: 15px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease;
        }

        .btn-update-pill:hover {
          background: #1e293b;
          transform: translateY(-1px);
        }
      `;

      const fn = currentProfile.firstName || '';
      const ln = currentProfile.lastName || '';
      const em = currentProfile.email || '';
      const ph = currentProfile.phone || '';
      const lo = currentProfile.location || currentProfile.city || '';
      const co = currentProfile.country || '';
      const li = currentProfile.linkedinUrl || '';
      const gh = currentProfile.githubUrl || '';
      const po = currentProfile.portfolioUrl || '';

      const sk = Array.isArray(currentProfile.skills) ? currentProfile.skills.join(', ') : (currentProfile.skills || '');
      const la = Array.isArray(currentProfile.languages) ? currentProfile.languages.join(', ') : (currentProfile.languages || '');
      const ce = currentProfile.certifications || '';

      const wa = currentProfile.usWorkAuth || currentProfile.usWorkAuthorization || '';
      const sp = currentProfile.sponsorshipRequired || '';
      const ge = currentProfile.gender || '';
      const ra = currentProfile.race || currentProfile.raceEthnicity || '';
      const ve = currentProfile.veteran || currentProfile.veteranStatus || '';
      const di = currentProfile.disability || currentProfile.disabilityStatus || '';

      const experiences = currentProfile.workExperiences || currentProfile.experiences || [];
      const education = currentProfile.education || [];
      const projects = currentProfile.projects || [];

      const hasResume = (userResumes && userResumes.length > 0) || currentProfile.resumeFileName || currentProfile.resumeFile;
      const resumeName = (userResumes && userResumes[0] && userResumes[0].fileName) || currentProfile.resumeFileName || 'Resume';

      const modalWrapper = document.createElement('div');
      modalWrapper.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal-card">
            <header class="modal-header">
              <div class="brand-box">
                <div class="logo-icon" style="display: flex; align-items: center; justify-content: center; background: transparent; border: none;">
                  <img src="${chrome.runtime.getURL('assets/extension-logo.svg')}" width="36" height="36" style="border-radius: 9px; object-fit: contain;" alt="ApplyDesk Logo">
                </div>
                <div>
                  <div class="brand-title">Applydesk.io</div>
                  <div class="brand-sub">Auto-Apply with confidence.</div>
                </div>
              </div>
              <button id="ad-modal-close" class="close-btn" title="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </header>

            <div class="modal-body">
              <aside class="modal-sidebar">
                <div class="nav-item active" data-tab="personal">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span>Personal info</span>
                </div>
                <div class="nav-item" data-tab="work">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                  <span>Work Experience</span>
                </div>
                <div class="nav-item" data-tab="education">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                  <span>Education</span>
                </div>
                <div class="nav-item" data-tab="skills">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  <span>Skills & Tools</span>
                </div>
                <div class="nav-item" data-tab="projects">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  <span>Projects</span>
                </div>
                <div class="nav-item" data-tab="eeo">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  <span>Demographics</span>
                </div>
              </aside>

              <main class="modal-content">
                <div id="modal-banner-container">
                  ${!hasResume ? `
                    <div class="no-resume-banner">
                      <div class="banner-icon-box">📄</div>
                      <div class="banner-content">
                        <div class="banner-title">Upload your resume to auto-fill details</div>
                        <div class="banner-desc">Upload your resume to automatically populate your contact info, work experience, education, and skills into this form.</div>
                      </div>
                      <input type="file" id="modal-resume-file-input" accept=".pdf,.doc,.docx" style="display: none;" />
                      <button type="button" id="modal-upload-resume-btn" class="banner-upload-btn">
                        📤 Upload Resume
                      </button>
                    </div>
                  ` : `
                    <div class="no-resume-banner" style="background: #f0fdf4; border-color: #bbf7d0;">
                      <div class="banner-icon-box">✅</div>
                      <div class="banner-content">
                        <div class="banner-title" style="color: #166534;">Resume Uploaded: ${resumeName}</div>
                        <div class="banner-desc" style="color: #15803d;">Your profile fields are synchronized with your resume and MongoDB database.</div>
                      </div>
                      <input type="file" id="modal-resume-file-input" accept=".pdf,.doc,.docx" style="display: none;" />
                      <button type="button" id="modal-upload-resume-btn" class="banner-upload-btn" style="background: #166534;">
                        🔄 Replace Resume
                      </button>
                    </div>
                  `}
                </div>

                <!-- Personal Info Tab -->
                <div class="tab-pane active" id="pane-personal">
                  <div class="input-grid">
                    <div class="input-pill-box">
                      <span class="input-label">First Name</span>
                      <input id="inp-fn" class="input-field" type="text" value="${fn}" placeholder="First Name" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Last Name</span>
                      <input id="inp-ln" class="input-field" type="text" value="${ln}" placeholder="Last Name" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Email</span>
                      <input id="inp-em" class="input-field" type="email" value="${em}" placeholder="Email" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Phone</span>
                      <input id="inp-ph" class="input-field" type="text" value="${ph}" placeholder="Phone" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Location / City</span>
                      <input id="inp-lo" class="input-field" type="text" value="${lo}" placeholder="City, State" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Country</span>
                      <input id="inp-co" class="input-field" type="text" value="${co}" placeholder="Country" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">LinkedIn URL</span>
                      <input id="inp-li" class="input-field" type="text" value="${li}" placeholder="linkedin.com/in/..." />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">GitHub URL</span>
                      <input id="inp-gh" class="input-field" type="text" value="${gh}" placeholder="github.com/..." />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Portfolio URL</span>
                      <input id="inp-po" class="input-field" type="text" value="${po}" placeholder="portfolio.com" />
                    </div>
                  </div>
                </div>

                <!-- Work Experience Tab -->
                <div class="tab-pane" id="pane-work">
                  <div class="card-list" id="work-list"></div>
                  <button class="btn-add-entry" id="btn-add-work">+ Add Experience</button>
                </div>

                <!-- Education Tab -->
                <div class="tab-pane" id="pane-education">
                  <div class="card-list" id="edu-list"></div>
                  <button class="btn-add-entry" id="btn-add-edu">+ Add Education</button>
                </div>

                <!-- Skills Tab -->
                <div class="tab-pane" id="pane-skills">
                  <div class="input-pill-box">
                    <span class="input-label">Skills (comma separated)</span>
                    <textarea id="inp-sk" class="input-field" placeholder="React, Node.js, TypeScript, Python">${sk}</textarea>
                  </div>
                  <div class="input-pill-box">
                    <span class="input-label">Languages</span>
                    <input id="inp-la" class="input-field" type="text" value="${la}" placeholder="English, Spanish" />
                  </div>
                  <div class="input-pill-box">
                    <span class="input-label">Certifications</span>
                    <input id="inp-ce" class="input-field" type="text" value="${ce}" placeholder="AWS Certified Developer, PMP" />
                  </div>
                </div>

                <!-- Projects Tab -->
                <div class="tab-pane" id="pane-projects">
                  <div class="card-list" id="proj-list"></div>
                  <button class="btn-add-entry" id="btn-add-proj">+ Add Project</button>
                </div>

                <!-- Demographics / EEO Tab -->
                <div class="tab-pane" id="pane-eeo">
                  <div class="input-grid">
                    <div class="input-pill-box">
                      <span class="input-label">US Work Authorization</span>
                      <input id="inp-wa" class="input-field" type="text" value="${wa}" placeholder="Yes / No / Citizen" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Sponsorship Required</span>
                      <input id="inp-sp" class="input-field" type="text" value="${sp}" placeholder="Yes / No" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Gender</span>
                      <input id="inp-ge" class="input-field" type="text" value="${ge}" placeholder="Male / Female / Decline" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Race / Ethnicity</span>
                      <input id="inp-ra" class="input-field" type="text" value="${ra}" placeholder="Race / Ethnicity" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Veteran Status</span>
                      <input id="inp-ve" class="input-field" type="text" value="${ve}" placeholder="I am not a veteran" />
                    </div>
                    <div class="input-pill-box">
                      <span class="input-label">Disability Status</span>
                      <input id="inp-di" class="input-field" type="text" value="${di}" placeholder="No, I do not have a disability" />
                    </div>
                  </div>
                </div>

                <div class="modal-footer">
                  <button id="ad-modal-update-btn" class="btn-update-pill">Update</button>
                </div>
              </main>
            </div>
          </div>
        </div>
      `;

      shadow.appendChild(style);
      shadow.appendChild(modalWrapper);

      // AI PDF Resume Parsing Helper using Gemini API
      async function parseResumeWithAI(fileData, fileName) {
        try {
          const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3030' : 'https://api.applydesk.io';
          const cleanB64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
          const res = await fetch(`${apiBase}/api/parse-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data: cleanB64, fileName: fileName || 'resume.pdf' })
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.parsed) {
              return data.parsed;
            }
          }
        } catch(e) {
          console.error('[AI Resume Parser] Error:', e);
        }
        return null;
      }

      function updateModalFieldsFromProfile(prof) {
        const inpFn = shadow.getElementById('inp-fn'); if (inpFn && prof.firstName) inpFn.value = prof.firstName;
        const inpLn = shadow.getElementById('inp-ln'); if (inpLn && prof.lastName) inpLn.value = prof.lastName;
        const inpEm = shadow.getElementById('inp-em'); if (inpEm && prof.email) inpEm.value = prof.email;
        const inpPh = shadow.getElementById('inp-ph'); if (inpPh && prof.phone) inpPh.value = prof.phone;
        const inpLo = shadow.getElementById('inp-lo'); if (inpLo && (prof.location || prof.city)) inpLo.value = prof.location || prof.city;
        const inpCo = shadow.getElementById('inp-co'); if (inpCo && prof.country) inpCo.value = prof.country;
        const inpLi = shadow.getElementById('inp-li'); if (inpLi && prof.linkedinUrl) inpLi.value = prof.linkedinUrl;
        const inpGh = shadow.getElementById('inp-gh'); if (inpGh && prof.githubUrl) inpGh.value = prof.githubUrl;
        const inpPo = shadow.getElementById('inp-po'); if (inpPo && prof.portfolioUrl) inpPo.value = prof.portfolioUrl;

        const inpSk = shadow.getElementById('inp-sk');
        if (inpSk && prof.skills) {
          inpSk.value = Array.isArray(prof.skills) ? prof.skills.join(', ') : prof.skills;
        }
        const inpLa = shadow.getElementById('inp-la');
        if (inpLa && prof.languages) {
          inpLa.value = Array.isArray(prof.languages) ? prof.languages.join(', ') : prof.languages;
        }

        if (prof.workExperiences && Array.isArray(prof.workExperiences) && prof.workExperiences.length > 0) {
          workList.innerHTML = '';
          prof.workExperiences.forEach(addWorkCard);
        }
        if (prof.education && Array.isArray(prof.education) && prof.education.length > 0) {
          eduList.innerHTML = '';
          prof.education.forEach(addEduCard);
        }
        if (prof.projects && Array.isArray(prof.projects) && prof.projects.length > 0) {
          projList.innerHTML = '';
          prof.projects.forEach(addProjCard);
        }
      }

      // Attach Upload Resume Handler inside Modal
      const attachUploadHandler = () => {
        const uploadBtn = shadow.getElementById('modal-upload-resume-btn');
        const fileInput = shadow.getElementById('modal-resume-file-input');

        if (uploadBtn && fileInput) {
          uploadBtn.onclick = () => fileInput.click();
          fileInput.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            uploadBtn.innerText = '⚡ Extracting with Gemini AI...';
            uploadBtn.disabled = true;

            const reader = new FileReader();
            reader.onload = async (evt) => {
              const fileData = evt.target.result;
              
              currentProfile.resumeFileName = file.name;
              currentProfile.resumeBase64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
              userResumes = [{ id: 'res_' + Date.now(), fileName: file.name, fileData }];

              const parsed = await parseResumeWithAI(fileData, file.name);
              if (parsed) {
                if (parsed.firstName) currentProfile.firstName = parsed.firstName;
                if (parsed.lastName) currentProfile.lastName = parsed.lastName;
                if (parsed.email) currentProfile.email = parsed.email;
                if (parsed.phone) currentProfile.phone = parsed.phone;
                if (parsed.location) {
                  currentProfile.location = parsed.location;
                  currentProfile.city = parsed.location;
                }
                if (parsed.country) currentProfile.country = parsed.country;
                if (parsed.linkedinUrl) currentProfile.linkedinUrl = parsed.linkedinUrl;
                if (parsed.githubUrl) currentProfile.githubUrl = parsed.githubUrl;
                if (parsed.portfolioUrl) currentProfile.portfolioUrl = parsed.portfolioUrl;

                if (parsed.skills && Array.isArray(parsed.skills) && parsed.skills.length > 0) {
                  currentProfile.skills = parsed.skills;
                }
                if (parsed.languages && Array.isArray(parsed.languages) && parsed.languages.length > 0) {
                  currentProfile.languages = parsed.languages;
                }
                if (parsed.workExperiences && Array.isArray(parsed.workExperiences) && parsed.workExperiences.length > 0) {
                  currentProfile.workExperiences = parsed.workExperiences;
                }
                if (parsed.education && Array.isArray(parsed.education) && parsed.education.length > 0) {
                  currentProfile.education = parsed.education;
                }
                if (parsed.projects && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
                  currentProfile.projects = parsed.projects;
                }

                updateModalFieldsFromProfile(currentProfile);
              }

              if (isExtensionValid()) {
                chrome.storage.local.set({
                  resumeok_profile: currentProfile,
                  resumeok_resumes: userResumes
                });
              }

              const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3030' : 'https://api.applydesk.io';
              if (activeToken) {
                try {
                  await fetch(`${apiBase}/api/user/profile`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${activeToken}`
                    },
                    body: JSON.stringify({ profile: currentProfile })
                  });
                } catch(err) {}
              }

              const bannerContainer = shadow.getElementById('modal-banner-container');
              if (bannerContainer) {
                bannerContainer.innerHTML = `
                  <div class="no-resume-banner" style="background: #f0fdf4; border-color: #bbf7d0;">
                    <div class="banner-icon-box">✅</div>
                    <div class="banner-content">
                      <div class="banner-title" style="color: #166534;">Resume Uploaded & Parsed: ${file.name}</div>
                      <div class="banner-desc" style="color: #15803d;">Gemini AI has extracted your contact details, work history, and skills.</div>
                    </div>
                    <input type="file" id="modal-resume-file-input" accept=".pdf,.doc,.docx" style="display: none;" />
                    <button type="button" id="modal-upload-resume-btn" class="banner-upload-btn" style="background: #166534;">
                      🔄 Replace Resume
                    </button>
                  </div>
                `;
                attachUploadHandler();
              }
            };
            reader.readAsDataURL(file);
          };
        }
      };

      attachUploadHandler();

      // Render Dynamic Card Lists
      const workList = shadow.getElementById('work-list');
      const eduList = shadow.getElementById('edu-list');
      const projList = shadow.getElementById('proj-list');

      function addWorkCard(exp = {}) {
        const div = document.createElement('div');
        div.className = 'entry-card work-card';
        div.innerHTML = `
          <button type="button" class="btn-remove-entry">Remove</button>
          <div class="input-grid">
            <div class="input-pill-box"><span class="input-label">Company</span><input class="input-field w-company" value="${exp.company || exp.companyName || ''}" /></div>
            <div class="input-pill-box"><span class="input-label">Role / Title</span><input class="input-field w-role" value="${exp.role || exp.title || exp.jobTitle || ''}" /></div>
            <div class="input-pill-box"><span class="input-label">Dates (e.g. 2021 - Present)</span><input class="input-field w-dates" value="${exp.dates || exp.startDate ? (exp.startDate + (exp.endDate ? ' - ' + exp.endDate : '')) : ''}" /></div>
          </div>
          <div class="input-pill-box"><span class="input-label">Description</span><textarea class="input-field w-desc">${exp.description || exp.workSummary || ''}</textarea></div>
        `;
        div.querySelector('.btn-remove-entry').onclick = () => div.remove();
        workList.appendChild(div);
      }

      function addEduCard(ed = {}) {
        const div = document.createElement('div');
        div.className = 'entry-card edu-card';
        div.innerHTML = `
          <button type="button" class="btn-remove-entry">Remove</button>
          <div class="input-grid">
            <div class="input-pill-box"><span class="input-label">School / University</span><input class="input-field e-school" value="${ed.school || ed.institution || ''}" /></div>
            <div class="input-pill-box"><span class="input-label">Degree</span><input class="input-field e-degree" value="${ed.degree || ''}" /></div>
            <div class="input-pill-box"><span class="input-label">Field of Study</span><input class="input-field e-field" value="${ed.fieldOfStudy || ed.major || ''}" /></div>
          </div>
        `;
        div.querySelector('.btn-remove-entry').onclick = () => div.remove();
        eduList.appendChild(div);
      }

      function addProjCard(pj = {}) {
        const div = document.createElement('div');
        div.className = 'entry-card proj-card';
        div.innerHTML = `
          <button type="button" class="btn-remove-entry">Remove</button>
          <div class="input-grid">
            <div class="input-pill-box"><span class="input-label">Project Name</span><input class="input-field p-name" value="${pj.name || pj.title || ''}" /></div>
            <div class="input-pill-box"><span class="input-label">Role</span><input class="input-field p-role" value="${pj.role || ''}" /></div>
            <div class="input-pill-box"><span class="input-label">Link</span><input class="input-field p-link" value="${pj.link || pj.url || ''}" /></div>
          </div>
        `;
        div.querySelector('.btn-remove-entry').onclick = () => div.remove();
        projList.appendChild(div);
      }

      if (experiences.length > 0) experiences.forEach(addWorkCard);
      else addWorkCard();

      if (education.length > 0) education.forEach(addEduCard);
      else addEduCard();

      if (projects.length > 0) projects.forEach(addProjCard);
      else addProjCard();

      // Auto-parse on load if profile fields are empty but resume PDF exists
      if (!currentProfile.firstName && !currentProfile.email && userResumes && userResumes[0] && userResumes[0].fileData) {
        parseResumeWithAI(userResumes[0].fileData, userResumes[0].fileName).then(parsed => {
          if (parsed) {
            if (parsed.firstName) currentProfile.firstName = parsed.firstName;
            if (parsed.lastName) currentProfile.lastName = parsed.lastName;
            if (parsed.email) currentProfile.email = parsed.email;
            if (parsed.phone) currentProfile.phone = parsed.phone;
            if (parsed.location) { currentProfile.location = parsed.location; currentProfile.city = parsed.location; }
            if (parsed.country) currentProfile.country = parsed.country;
            if (parsed.linkedinUrl) currentProfile.linkedinUrl = parsed.linkedinUrl;
            if (parsed.githubUrl) currentProfile.githubUrl = parsed.githubUrl;
            if (parsed.portfolioUrl) currentProfile.portfolioUrl = parsed.portfolioUrl;
            if (parsed.skills && parsed.skills.length > 0) currentProfile.skills = parsed.skills;
            if (parsed.languages && parsed.languages.length > 0) currentProfile.languages = parsed.languages;
            if (parsed.workExperiences && parsed.workExperiences.length > 0) currentProfile.workExperiences = parsed.workExperiences;
            if (parsed.education && parsed.education.length > 0) currentProfile.education = parsed.education;
            if (parsed.projects && parsed.projects.length > 0) currentProfile.projects = parsed.projects;

            updateModalFieldsFromProfile(currentProfile);
            if (isExtensionValid()) chrome.storage.local.set({ resumeok_profile: currentProfile });
          }
        });
      }

      shadow.getElementById('btn-add-work').onclick = () => addWorkCard();
      shadow.getElementById('btn-add-edu').onclick = () => addEduCard();
      shadow.getElementById('btn-add-proj').onclick = () => addProjCard();

      // Navigation tab switcher
      const navItems = shadow.querySelectorAll('.nav-item');
      const tabPanes = shadow.querySelectorAll('.tab-pane');

      navItems.forEach(item => {
        item.addEventListener('click', () => {
          const tab = item.dataset.tab;
          navItems.forEach(n => n.classList.remove('active'));
          tabPanes.forEach(p => p.classList.remove('active'));

          item.classList.add('active');
          const targetPane = shadow.getElementById(`pane-${tab}`);
          if (targetPane) targetPane.classList.add('active');
        });
      });

      const closeBtn = shadow.getElementById('ad-modal-close');
      const updateBtn = shadow.getElementById('ad-modal-update-btn');

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          host.remove();
        });
      }

      if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
          const updatedWork = [];
          shadow.querySelectorAll('.work-card').forEach(card => {
            updatedWork.push({
              company: card.querySelector('.w-company')?.value || '',
              companyName: card.querySelector('.w-company')?.value || '',
              role: card.querySelector('.w-role')?.value || '',
              title: card.querySelector('.w-role')?.value || '',
              dates: card.querySelector('.w-dates')?.value || '',
              description: card.querySelector('.w-desc')?.value || ''
            });
          });

          const updatedEdu = [];
          shadow.querySelectorAll('.edu-card').forEach(card => {
            updatedEdu.push({
              school: card.querySelector('.e-school')?.value || '',
              degree: card.querySelector('.e-degree')?.value || '',
              fieldOfStudy: card.querySelector('.e-field')?.value || ''
            });
          });

          const updatedProj = [];
          shadow.querySelectorAll('.proj-card').forEach(card => {
            updatedProj.push({
              name: card.querySelector('.p-name')?.value || '',
              role: card.querySelector('.p-role')?.value || '',
              link: card.querySelector('.p-link')?.value || ''
            });
          });

          const skText = shadow.getElementById('inp-sk')?.value || '';
          const skArr = skText.split(',').map(s => s.trim()).filter(s => s.length > 0);
          const laText = shadow.getElementById('inp-la')?.value || '';
          const laArr = laText.split(',').map(s => s.trim()).filter(s => s.length > 0);

          const updatedProfile = {
            ...currentProfile,
            firstName: shadow.getElementById('inp-fn')?.value || fn,
            lastName: shadow.getElementById('inp-ln')?.value || ln,
            email: shadow.getElementById('inp-em')?.value || em,
            phone: shadow.getElementById('inp-ph')?.value || ph,
            location: shadow.getElementById('inp-lo')?.value || lo,
            city: shadow.getElementById('inp-lo')?.value || lo,
            country: shadow.getElementById('inp-co')?.value || co,
            linkedinUrl: shadow.getElementById('inp-li')?.value || li,
            githubUrl: shadow.getElementById('inp-gh')?.value || gh,
            portfolioUrl: shadow.getElementById('inp-po')?.value || po,

            skills: skArr,
            languages: laArr,
            certifications: shadow.getElementById('inp-ce')?.value || ce,

            usWorkAuth: shadow.getElementById('inp-wa')?.value || wa,
            usWorkAuthorization: shadow.getElementById('inp-wa')?.value || wa,
            sponsorshipRequired: shadow.getElementById('inp-sp')?.value || sp,
            gender: shadow.getElementById('inp-ge')?.value || ge,
            race: shadow.getElementById('inp-ra')?.value || ra,
            raceEthnicity: shadow.getElementById('inp-ra')?.value || ra,
            veteran: shadow.getElementById('inp-ve')?.value || ve,
            veteranStatus: shadow.getElementById('inp-ve')?.value || ve,
            disability: shadow.getElementById('inp-di')?.value || di,
            disabilityStatus: shadow.getElementById('inp-di')?.value || di,

            workExperiences: updatedWork,
            experiences: updatedWork,
            education: updatedEdu,
            projects: updatedProj
          };

          updateBtn.innerText = 'Saving to Database...';
          updateBtn.disabled = true;

          if (isExtensionValid()) {
            try {
              await chrome.storage.local.set({ resumeok_profile: updatedProfile });
              chrome.runtime.sendMessage({ type: 'SAVE_PROFILE_STORAGE', profile: updatedProfile });
            } catch(e) {}
          }

          if (activeToken && activeUser && activeUser.id) {
            const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3030' : 'https://api.applydesk.io';
            try {
              await fetch(`${apiBase}/api/user/${activeUser.id}/profile`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${activeToken}`
                },
                body: JSON.stringify({ profile: updatedProfile })
              });
            } catch(e) {}
          }

          updateBtn.innerText = '✅ Saved to Database!';
          setTimeout(() => {
            host.remove();
          }, 500);
        });
      }
    }
  }

  // Automatic Web App Authentication Sync
  function checkAndSyncWebAuth(force = false) {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token') || localStorage.getItem('jwt');
      const userStr = localStorage.getItem('auth_user') || localStorage.getItem('resumeok_user') || localStorage.getItem('user');
      if (token) {
        let user = null;
        if (userStr) {
          try {
            user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
          } catch(e) {
            user = { token };
          }
        } else {
          user = { token };
        }
        if (isExtensionValid()) {
          chrome.runtime.sendMessage({ type: 'SYNC_WEB_AUTH', token, user, force }, () => {
            if (chrome.runtime.lastError) { /* ignore */ }
          });
        }
      }
    } catch(e) {}
  }

  // Run auth check on page load, window message events, & storage events
  try {
    checkAndSyncWebAuth();

    window.addEventListener('message', (event) => {
      if (event.data && (event.data.type === 'APPLYDESK_AUTH_SYNC' || event.data.type === 'APPLYDESK_WEB_LOGIN_SYNC')) {
        if (event.data.token && event.data.user) {
          try {
            localStorage.setItem('auth_token', event.data.token);
            localStorage.setItem('auth_user', JSON.stringify(event.data.user));
            localStorage.setItem('resumeok_token', event.data.token);
            localStorage.setItem('resumeok_user', JSON.stringify(event.data.user));
          } catch (e) {}
          if (isExtensionValid()) {
            chrome.runtime.sendMessage({ type: 'SYNC_WEB_AUTH', token: event.data.token, user: event.data.user }, () => {
              if (chrome.runtime.lastError) {}
            });
          }
        }
      }
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'auth_token' || e.key === 'auth_user' || e.key === 'resumeok_token' || e.key === 'resumeok_user') {
        checkAndSyncWebAuth();
      }
    });

    // On applydesk web app domains, continuously check for login token
    const isApplyDeskHost = window.location.hostname.includes('applydesk') || window.location.hostname.includes('188.166.164.115') || window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
    if (isApplyDeskHost) {
      setInterval(checkAndSyncWebAuth, 1000);
    }
  } catch(e) {}

  function showDockTab() {
    if (!document.getElementById('applydesk-inpage-host')) {
      injectInPageFloatingDockTab();
    }
    const shadow = document.getElementById('applydesk-inpage-host')?.shadowRoot;
    const dockTab = shadow?.getElementById('ad-dock-tab');
    if (dockTab) dockTab.style.display = 'flex';
  }

  function hideDockTab() {
    const shadow = document.getElementById('applydesk-inpage-host')?.shadowRoot;
    const dockTab = shadow?.getElementById('ad-dock-tab');
    if (dockTab) dockTab.style.display = 'none';
  }

  function closeFloatingRightOverlayDrawer() {
    let host = document.getElementById('applydesk-floating-drawer-host');
    if (host) {
      const shadow = host.shadowRoot;
      const container = shadow?.getElementById('ad-drawer-container');
      if (container) {
        container.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (host && host.parentNode) host.parentNode.removeChild(host);
        }, 320);
      } else {
        if (host.parentNode) host.parentNode.removeChild(host);
      }
    }
    showDockTab();
  }

  // Jobright-Style In-Page Floating Right Overlay Drawer
  function toggleFloatingRightOverlayDrawer() {
    if (window !== window.top) return;
    let host = document.getElementById('applydesk-floating-drawer-host');
    if (!host) {
      hideDockTab();
      host = document.createElement('div');
      host.id = 'applydesk-floating-drawer-host';
      host.style.cssText = 'position: fixed; top: 0; right: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: auto;';
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      container.id = 'ad-drawer-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 420px;
        max-width: 90vw;
        height: 100vh;
        z-index: 2147483647;
        background: #ffffff;
        box-shadow: -8px 0 36px rgba(15, 23, 42, 0.25);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        transform: translateX(100%);
        border-left: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `;

      const iframe = document.createElement('iframe');
      iframe.src = chrome.runtime.getURL('sidepanel/sidepanel.html');
      iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: #f4f4f6;';

      container.appendChild(iframe);
      shadow.appendChild(container);

      // Trigger smooth slide in
      requestAnimationFrame(() => {
        container.style.transform = 'translateX(0)';
      });
    } else {
      closeFloatingRightOverlayDrawer();
    }
  }

  // Inject dock tab container on page load
  try {
    if (window === window.top) {
      injectInPageFloatingDockTab();
      if (isExtensionValid()) {
        chrome.runtime.sendMessage({ type: 'FORM_DETECTED' }, () => {
          if (chrome.runtime.lastError) { /* ignore silently */ }
        });
      }
    }
  } catch(e) {}

  // Listen for iframe postMessages from sidepanel (e.g. close drawer / show dock tab)
  window.addEventListener('message', (event) => {
    if (window !== window.top) return;
    if (event.data && (event.data.type === 'CLOSE_APPLYDESK_FLOATING_DRAWER' || event.data.type === 'COLLAPSE_DRAWER')) {
      closeFloatingRightOverlayDrawer();
      showDockTab();
    }
    if (event.data && event.data.type === 'SHOW_DOCK_TAB') {
      showDockTab();
    }
  });

  // Message listener from extension action, popup, sidepanel, or background
  if (isExtensionValid()) {
    try {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!isExtensionValid()) return false;

        if (request.type === 'CLOSE_FLOATING_PANEL' || request.type === 'CLOSE_DRAWER') {
          if (window === window.top) closeFloatingRightOverlayDrawer();
          sendResponse({ success: true });
          return true;
        }

        if (request.type === 'CHECK_WEB_AUTH') {
          checkAndSyncWebAuth(Boolean(request.force));
          sendResponse({ success: true });
          return true;
        }

        if (request.type === 'TOGGLE_FLOATING_PANEL' || request.type === 'TOGGLE_DRAWER' || request.type === 'OPEN_SIDE_PANEL') {
          if (window === window.top) toggleFloatingRightOverlayDrawer();
          sendResponse({ success: true });
          return true;
        }

        if (window === window.top && !document.getElementById('applydesk-inpage-host')) {
          injectInPageFloatingDockTab();
        }
        const shadow = document.getElementById('applydesk-inpage-host')?.shadowRoot;
        const dockTab = shadow?.getElementById('ad-dock-tab');

        if (request.type === 'SHOW_DOCK_TAB' || request.type === 'COLLAPSE_DRAWER') {
          if (window === window.top && dockTab) dockTab.style.display = 'flex';
          sendResponse({ success: true });
        } else if (request.type === 'HIDE_DOCK_TAB') {
          if (window === window.top && dockTab) dockTab.style.display = 'none';
          sendResponse({ success: true });
        } else if (request.type === 'OPEN_EDIT_INFO_MODAL') {
          if (window === window.top) openEditInfoModal();
          sendResponse({ success: true });
        } else if (request.type === 'GET_JOB_DETAILS') {
          sendResponse(extractJobDetails());
        } else if (request.type === 'GET_FORM_FIELDS_STATUS') {
          sendResponse(scanFormFields(request.profile));
        } else if (request.type === 'TRIGGER_AUTOFILL') {
          const res = runAutofill(request.profile);
          const scanRes = scanFormFields(request.profile);
          sendResponse({ success: true, count: res.count, scan: scanRes });
        } else if (request.type === 'SCROLL_TO_FIELD') {
          const ok = scrollToAndHighlightField(request.searchTerms, request.selector);
          sendResponse({ success: ok });
        }
        return true;
      });
    } catch(e) {}
  }
})();
