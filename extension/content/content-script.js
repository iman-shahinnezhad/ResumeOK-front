// ResumeOK Content Script — ATS Form Detection, 1-Click Autofill & Job Match Extractor

(function() {
  if (window.__resumeokContentScriptLoaded) return;
  window.__resumeokContentScriptLoaded = true;

  // Helper: Set native input value with synthetic events
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

        if (matchIdx !== -1) {
          el.selectedIndex = matchIdx;
          el.value = opts[matchIdx].value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
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
        doc.querySelectorAll('input[name="name" i], input[id="name" i], input[placeholder*="full name" i]').forEach(e => {
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
        doc.querySelectorAll('input[name*="linkedin" i], input[id*="linkedin" i], input[placeholder*="linkedin" i]').forEach(e => {
          if (!e.value) { setVal(e, li); filled++; }
        });
      }
      // Portfolio / Website
      if (po) {
        doc.querySelectorAll('input[name*="website" i], input[name*="portfolio" i], input[id*="website" i], input[id*="portfolio" i]').forEach(e => {
          if (!e.value) { setVal(e, po); filled++; }
        });
      }
      // City / Location / Address
      if (ci) {
        doc.querySelectorAll('input[name*="city" i], input[id*="city" i], input[name*="location" i], input[id*="location" i]').forEach(e => {
          if (!e.value) { setVal(e, ci); filled++; }
        });
      }
      // Country
      const countryVal = profile.country || 'United States';
      doc.querySelectorAll('select[name*="country" i], select[id*="country" i]').forEach(s => {
        if (!s.value || s.value === '0') { setVal(s, countryVal); filled++; }
      });

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

      // Cover Letter Text & Textareas
      const clText = profile.coverLetterText || profile.workSummary || `Dear Hiring Manager,\n\nI am thrilled to apply for this position at your company. With my solid technical background in software engineering, frontend development, and project execution, I am confident in bringing immediate value to your team.\n\nBest regards,\n${full || 'Omid Moradi'}`;
      doc.querySelectorAll('textarea[name*="cover" i], textarea[id*="cover" i], textarea[placeholder*="cover" i], textarea[name*="letter" i]').forEach(ta => {
        if (!ta.value) { setVal(ta, clText); filled++; }
      });

      // Demographics & EEO Questions (Gender, Sex)
      const genderTerms = gen ? [gen, 'man', 'male', 'decline', 'prefer not', 'choose not'] : ['man', 'male', 'decline', 'prefer not', 'choose not'];
      doc.querySelectorAll('select[name*="gender" i], select[id*="gender" i], select[name*="sex" i], select[aria-label*="gender" i], select[data-qa*="gender" i]').forEach(s => {
        setVal(s, genderTerms);
        filled++;
      });
      doc.querySelectorAll('input[type="radio"][name*="gender" i], input[type="radio"][id*="gender" i], input[type="radio"][value*="gender" i]').forEach(r => {
        const valStr = `${r.value} ${r.id} ${r.name} ${r.labels?.[0]?.innerText || ''}`.toLowerCase();
        if (genderTerms.some(t => valStr.includes(t.toLowerCase()))) {
          setVal(r, true);
          filled++;
        }
      });

      // Race & Ethnicity
      const raceTerms = race ? [race, 'decline', 'prefer not', 'choose not', 'white', 'asian'] : ['decline', 'prefer not', 'choose not', 'white'];
      doc.querySelectorAll('select[name*="race" i], select[id*="race" i], select[name*="ethnicity" i], select[id*="ethnicity" i]').forEach(s => {
        setVal(s, raceTerms);
        filled++;
      });
      doc.querySelectorAll('input[type="radio"][name*="race" i], input[type="radio"][name*="ethnicity" i]').forEach(r => {
        const valStr = `${r.value} ${r.id} ${r.name} ${r.labels?.[0]?.innerText || ''}`.toLowerCase();
        if (raceTerms.some(t => valStr.includes(t.toLowerCase()))) {
          setVal(r, true);
          filled++;
        }
      });

      // Veteran Status
      const vetTerms = vet ? [vet, 'not a veteran', 'am not', 'no', 'decline'] : ['not a veteran', 'am not', 'no', 'decline'];
      doc.querySelectorAll('select[name*="veteran" i], select[id*="veteran" i]').forEach(s => {
        setVal(s, vetTerms);
        filled++;
      });
      doc.querySelectorAll('input[type="radio"][name*="veteran" i]').forEach(r => {
        const valStr = `${r.value} ${r.id} ${r.name} ${r.labels?.[0]?.innerText || ''}`.toLowerCase();
        if (vetTerms.some(t => valStr.includes(t.toLowerCase()))) {
          setVal(r, true);
          filled++;
        }
      });

      // Disability Status
      const disabTerms = disab ? [disab, 'no', 'dont have', 'don\'t have', 'decline'] : ['no', 'dont have', 'don\'t have', 'decline'];
      doc.querySelectorAll('select[name*="disability" i], select[id*="disability" i]').forEach(s => {
        setVal(s, disabTerms);
        filled++;
      });
      doc.querySelectorAll('input[type="radio"][name*="disability" i]').forEach(r => {
        const valStr = `${r.value} ${r.id} ${r.name} ${r.labels?.[0]?.innerText || ''}`.toLowerCase();
        if (disabTerms.some(t => valStr.includes(t.toLowerCase()))) {
          setVal(r, true);
          filled++;
        }
      });

      // Work Authorization & Visa Sponsorship Questions
      doc.querySelectorAll('select[name*="authorized" i], select[name*="sponsor" i], select[id*="sponsor" i], select[id*="authorized" i]').forEach(s => {
        setVal(s, ['yes', 'authorized', 'legally', 'no']);
        filled++;
      });
      doc.querySelectorAll('input[type="radio"][name*="authorized" i], input[type="radio"][name*="sponsor" i]').forEach(r => {
        const valStr = `${r.value} ${r.id} ${r.name} ${r.labels?.[0]?.innerText || ''}`.toLowerCase();
        if (valStr.includes('yes') || valStr.includes('authorized')) {
          setVal(r, true);
          filled++;
        }
      });

      // How did you hear about us / Source
      doc.querySelectorAll('select[name*="source" i], select[name*="hear" i], select[id*="source" i]').forEach(s => {
        setVal(s, ['LinkedIn', 'Website', 'Other']);
        filled++;
      });

      // File attachments (PDF Resume & PDF Cover Letter)
      try {
        let resBlob = profile.resumeBase64 ? b64ToBlob(profile.resumeBase64, 'application/pdf') : null;
        if (!resBlob) {
          const dummyPdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF`;
          resBlob = new Blob([dummyPdf], { type: 'application/pdf' });
        }
        
        if (resBlob) {
          const resFile = new File([resBlob], profile.resumeFileName || "OmidMoradi_Resume.pdf", { type: 'application/pdf' });
          const clFile = new File([resBlob], "OmidMoradi_CoverLetter.pdf", { type: 'application/pdf' });

          const dtRes = new DataTransfer();
          dtRes.items.add(resFile);

          const dtCl = new DataTransfer();
          dtCl.items.add(clFile);

          doc.querySelectorAll('input[type="file"]').forEach(inp => {
            const n = (inp.name || inp.id || inp.getAttribute('aria-label') || '').toLowerCase();
            if (n.includes('cover')) {
              inp.files = dtCl.files;
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              filled++;
            } else {
              inp.files = dtRes.files;
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              filled++;
            }
          });
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
      dockTab.addEventListener('click', () => {
        dockTab.style.display = 'none';
        if (isExtensionValid()) {
          chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' }, () => {
            if (chrome.runtime.lastError) { /* ignore */ }
          });
        }
      });
    }
  }

  // Inject dock tab container on page load
  try {
    injectInPageFloatingDockTab();
    if (isExtensionValid()) {
      chrome.runtime.sendMessage({ type: 'FORM_DETECTED' }, () => {
        if (chrome.runtime.lastError) { /* ignore silently */ }
      });
    }
  } catch(e) {}

  // Message listener from extension action, popup, sidepanel, or background
  if (isExtensionValid()) {
    try {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!isExtensionValid()) return false;

        if (!document.getElementById('applydesk-inpage-host')) {
          injectInPageFloatingDockTab();
        }
        const shadow = document.getElementById('applydesk-inpage-host')?.shadowRoot;
        const dockTab = shadow?.getElementById('ad-dock-tab');

        if (request.type === 'SHOW_DOCK_TAB' || request.type === 'COLLAPSE_DRAWER') {
          if (dockTab) dockTab.style.display = 'flex';
          sendResponse({ success: true });
        } else if (request.type === 'HIDE_DOCK_TAB') {
          if (dockTab) dockTab.style.display = 'none';
          sendResponse({ success: true });
        } else if (request.type === 'TOGGLE_DRAWER') {
          if (dockTab) {
            if (dockTab.style.display === 'none') {
              dockTab.style.display = 'flex';
            } else {
              dockTab.style.display = 'none';
              chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' }, () => {
                if (chrome.runtime.lastError) { /* ignore */ }
              });
            }
          }
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
    } catch(e) {}
  }
})();
