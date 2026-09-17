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

  // Inject In-Page Floating Edge Dock Tab & Drawer Widget with Shadow DOM
  function injectInPageFloatingDockAndDrawer() {
    if (document.getElementById('applydesk-inpage-host')) return;

    const host = document.createElement('div');
    host.id = 'applydesk-inpage-host';
    host.style.cssText = 'position: fixed; z-index: 2147483647; top: 0; right: 0; pointer-events: none;';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

      /* Floating Right Edge Dock Tab (Clean Light Pill Badge) */
      .dock-tab {
        position: fixed;
        right: 0;
        top: 38%;
        transform: translateY(-50%);
        width: 54px;
        height: 54px;
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        border-right: none;
        border-radius: 27px 0 0 27px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        pointer-events: auto;
        box-shadow: -4px 6px 20px rgba(15, 23, 42, 0.12);
        transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, opacity 0.25s ease;
        z-index: 2147483646;
        opacity: 1;
        overflow: hidden;
      }

      .dock-tab:hover {
        width: 64px;
        box-shadow: -6px 10px 28px rgba(15, 23, 42, 0.18);
      }

      .dock-tab.closing {
        opacity: 0;
        width: 20px;
        pointer-events: none;
      }

      .dock-logo-box-sm {
        width: 38px;
        height: 38px;
        background: #fbf5e8;
        border: 1.5px solid #e8dfc8;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Sliding Overlay Drawer Panel (Light Clean UI matching screenshot) */
      .drawer-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 380px;
        height: 100vh;
        background: #f4f4f6;
        color: #0f172a;
        border-left: 1px solid #e2e8f0;
        box-shadow: -10px 0 40px rgba(0, 0, 0, 0.08);
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        z-index: 2147483647;
      }

      .drawer-panel.open {
        transform: translateX(0);
      }

      /* Header */
      .drawer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 20px 14px 20px;
        background: #f4f4f6;
      }

      .brand { display: flex; align-items: center; gap: 12px; }

      .brand-logo-box {
        width: 44px;
        height: 44px;
        background: #fbf5e8;
        border: 1.5px solid #e8dfc8;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .brand-title { font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; margin-bottom: 2px; }
      .brand-sub { font-size: 12px; color: #64748b; font-weight: 500; }

      .header-controls { display: flex; align-items: center; gap: 8px; }

      .token-pill {
        background: #ffffff;
        color: #0f172a;
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 14px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 5px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }

      .collapse-btn-circle {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #ffffff;
        color: #0f172a;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        transition: transform 0.2s ease, background 0.2s ease;
      }

      .collapse-btn-circle:hover {
        background: #f1f5f9;
        transform: scale(1.05);
      }

      /* Drawer Body */
      .drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 4px 16px 24px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* Pixel Perfect White Cards */
      .card-white {
        background: #ffffff;
        border-radius: 20px;
        padding: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        display: flex;
        flex-direction: column;
      }

      .card-title-lg {
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.35;
        margin-bottom: 16px;
      }

      .btn-black-pill {
        width: 100%;
        height: 52px;
        background: #000000;
        color: #ffffff;
        border-radius: 26px;
        font-size: 15px;
        font-weight: 700;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease, transform 0.15s ease;
      }

      .btn-black-pill:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      .btn-black-pill:active { transform: scale(0.98); }

      .btn-outline-pill {
        width: 100%;
        height: 48px;
        background: #ffffff;
        color: #000000;
        border: 1.8px solid #000000;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        margin-top: 14px;
        transition: background 0.2s ease, transform 0.15s ease;
      }

      .btn-outline-pill:hover {
        background: #f8fafc;
        transform: translateY(-1px);
      }

      .edit-info-row {
        background: #ffffff;
        border-radius: 20px;
        padding: 18px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        transition: background 0.2s ease;
      }

      .edit-info-row:hover {
        background: #f8fafc;
      }

      .edit-info-text {
        font-size: 15px;
        font-weight: 800;
        color: #0f172a;
      }

      /* Quick Fill Chips & ATS Score Tags */
      .chip-btn {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #1e293b;
        border-radius: 16px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 4px rgba(0,0,0,0.03);
      }
      .chip-btn:hover {
        background: #f1f5f9;
        border-color: #000000;
        color: #000000;
      }

      .tag {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
      }
      .tag-green {
        background: #ecfdf5;
        color: #059669;
        border: 1px solid #a7f3d0;
      }
      .tag-gold {
        background: #fffbeb;
        color: #d97706;
        border: 1px solid #fde68a;
      }

      .checklist-items { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
      .check-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; background: #f8fafc; border: 1px solid #e2e8f0; }
      .check-item-success { color: #059669; background: #ecfdf5; border-color: #a7f3d0; }
      .check-item-warning { color: #d97706; background: #fffbeb; border-color: #fde68a; justify-content: space-between; }
      .check-item-unfilled { color: #64748b; background: #f8fafc; }

      .check-icon { width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
      .check-item-success .check-icon { background: #10b981; color: #ffffff; }
      .check-item-warning .check-icon { background: #f59e0b; color: #ffffff; }
      .check-item-unfilled .check-icon { background: #cbd5e1; color: #ffffff; }
      .missing-notice-btn { font-size: 10px; background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; padding: 3px 8px; border-radius: 6px; text-decoration: none; font-weight: 700; }

      /* MODAL POPUP DIALOG (ApplyDesk Custom Light Glassmorphic Theme) */
      .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(8px);
        z-index: 2147483648;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .modal-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }

      .modal-card {
        width: 820px;
        max-width: 94vw;
        max-height: 90vh;
        background: #ffffff;
        color: #0f172a;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes modalPop {
        from { transform: scale(0.94); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }

      .modal-title-group { display: flex; align-items: center; gap: 10px; }
      .modal-title { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
      .modal-badge { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }

      .modal-close-btn {
        background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 18px; color: #64748b; cursor: pointer; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
      }
      .modal-close-btn:hover { background: #fee2e2; border-color: #fca5a5; color: #ef4444; transform: scale(1.1); }

      .modal-banner {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        margin: 16px 24px 0 24px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .modal-body {
        flex: 1;
        display: flex;
        overflow: hidden;
        border-top: 1px solid #e2e8f0;
        margin-top: 16px;
      }

      .modal-sidebar {
        width: 230px;
        background: #f8fafc;
        border-right: 1px solid #e2e8f0;
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .sidebar-tab {
        padding: 11px 14px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        color: #64748b;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .sidebar-tab:hover { background: #f1f5f9; color: #0f172a; }
      .sidebar-tab.active { background: #ffffff; color: #000000; border-left: 3px solid #000000; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }

      .modal-content-area {
        flex: 1;
        padding: 20px 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: #ffffff;
      }

      .tab-panel { display: none; flex-direction: column; gap: 16px; }
      .tab-panel.active { display: flex; }

      .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
      .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

      .form-group { display: flex; flex-direction: column; gap: 6px; }
      .form-group label { font-size: 12px; font-weight: 700; color: #334155; }
      .form-group label .req { color: #f43f5e; margin-right: 2px; }

      .form-group input, .form-group select, .form-group textarea {
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 600;
        color: #0f172a;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }

      .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
        border-color: #000000;
        box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
      }

      .modal-footer {
        padding: 16px 24px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: center;
        background: #f8fafc;
      }

      .btn-modal-update {
        min-width: 260px;
        height: 46px;
        background: #000000;
        color: #ffffff;
        border: none;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        transition: transform 0.2s ease, opacity 0.2s ease;
      }

      .btn-modal-update:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      /* Loading Screen CSS (Image 1 & Image 2) */
      .loading-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 70vh;
        gap: 24px;
        padding: 20px;
      }

      .spinner-ring {
        width: 52px;
        height: 52px;
        border: 4.5px solid #cbd5e1;
        border-top-color: #0f172a;
        border-radius: 50%;
        animation: spinRing 0.85s linear infinite;
      }

      @keyframes spinRing {
        to { transform: rotate(360deg); }
      }

      .loading-title {
        font-size: 26px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.02em;
        text-align: center;
      }

      /* Image 3 Metric Pills Grid */
      .metric-pills-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
        margin: 14px 0 16px 0;
      }

      .pill-box {
        border-radius: 16px;
        padding: 12px 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .pill-box-green {
        background: #e6f9f0;
        border: 1px solid #c6f6d5;
        color: #059669;
      }

      .pill-box-gray {
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        color: #0f172a;
      }

      .pill-score-val {
        font-size: 16px;
        font-weight: 800;
        line-height: 1.1;
      }

      .pill-score-lbl {
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.05em;
        margin-top: 4px;
        opacity: 0.85;
      }
    `;

    const widget = document.createElement('div');
    widget.innerHTML = `
      <!-- Floating Right Edge Dock Tab (Clean Light Badge) -->
      <div id="ad-dock-tab" class="dock-tab" title="Open ApplyDesk Copilot">
        <div class="dock-logo-box-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 18V10C4 6.68629 6.68629 4 10 4H14C17.3137 4 20 6.68629 20 10V18"></path>
          </svg>
        </div>
      </div>

      <!-- Sliding Overlay Drawer Panel (Matching user screenshot 100%) -->
      <div id="ad-drawer-panel" class="drawer-panel">
        <!-- Drawer Header -->
        <div class="drawer-header">
          <div class="brand">
            <div class="brand-logo-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 18V10C4 6.68629 6.68629 4 10 4H14C17.3137 4 20 6.68629 20 10V18"></path>
              </svg>
            </div>
            <div>
              <div class="brand-title">Applydesk.io</div>
              <div class="brand-sub">Auto-Apply with confidence.</div>
            </div>
          </div>
          <div class="header-controls">
            <div class="token-pill">
              <span id="ad-token-count">0</span>
              <span style="color:#f97316;">✦</span>
            </div>
            <button id="ad-collapse-btn" class="collapse-btn-circle" title="Collapse Panel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <!-- Drawer Body -->
        <div class="drawer-body">
          <!-- Card 1: Add to match score and autofill forms -->
          <div class="card-white">
            <div class="card-title-lg">Add to match score and autofill forms</div>
            <button id="ad-autofill-action" class="btn-black-pill">
              +Add this job to Applydesk
            </button>
            <div id="ad-autofill-msg" style="font-size:12px;color:#64748b;text-align:center;margin-top:6px;"></div>
          </div>

          <!-- Card 2: Resume Score -->
          <div class="card-white">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="font-size:16px;font-weight:800;color:#0f172a;">Resume Score</div>
              <div id="ad-resume-score" style="font-size:16px;font-weight:700;color:#94a3b8;">0/100</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
              <span style="font-size:20px;">📁</span>
              <span id="ad-resume-filename" style="font-size:13px;font-weight:600;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">OmidMoradi_25jun.PDF</span>
            </div>
            <button id="ad-fix-resume-btn" class="btn-outline-pill">
              <span style="color:#eab308;">⚡</span> Fix resume issues
            </button>
          </div>

          <!-- Card 3: Edit Your information -->
          <div id="ad-trigger-autofill-info" class="edit-info-row">
            <div class="edit-info-text">Edit Your information</div>
            <div style="font-size:15px;font-weight:700;color:#64748b;">❯</div>
          </div>

          <!-- 1-Tap Quick Field Fill Pills -->
          <div style="margin-top: 4px;">
            <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#94a3b8;margin-bottom:6px;padding-left:4px;">1-TAP QUICK FILL</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="chip-btn" id="ad-chip-name">👤 Name</button>
              <button class="chip-btn" id="ad-chip-email">✉️ Email</button>
              <button class="chip-btn" id="ad-chip-phone">📞 Phone</button>
              <button class="chip-btn" id="ad-chip-resume">📄 Resume</button>
            </div>
          </div>

          <!-- Form Fields Checklist Card -->
          <div class="card-white">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span id="ad-fill-count" style="font-size:13px;font-weight:800;color:#0f172a;">0/0 required fields filled</span>
              <span id="ad-fill-percent" style="font-size:12px;font-weight:800;color:#10b981;background:#ecfdf5;padding:2px 8px;border-radius:10px;">0%</span>
            </div>
            <div class="progress-bar-track" style="margin-top:8px;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
              <div id="ad-progress-bar" class="progress-bar-fill" style="width: 0%;height:100%;background:#10b981;transition:width 0.3s ease;"></div>
            </div>
            <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#94a3b8;margin:10px 0 6px 0;">FORM FIELDS CHECKLIST</div>
            <div id="ad-checklist" class="checklist-items">
              <div class="check-item check-item-unfilled" style="font-size:12px;color:#64748b;"><span class="check-icon">-</span> Detecting form fields...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Popup: ApplyDesk Smart Candidate Profile -->
      <div id="ad-autofill-modal" class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-title">ApplyDesk Candidate Profile</div>
              <span class="modal-badge">✨ Smart Sync</span>
            </div>
            <button id="ad-modal-close" class="modal-close-btn">&times;</button>
          </div>

          <div class="modal-banner">
            <div style="font-size:16px;">⚡</div>
            <div style="flex:1;">
              <strong style="font-size:12px;color:#f8fafc;display:block;">Auto-sync across Web, App & Extension</strong>
              <span style="font-size:11px;color:#94a3b8;">Updating candidate profile details here synchronizes directly with your ApplyDesk account and cloud database.</span>
            </div>
          </div>

          <div class="modal-body">
            <div class="modal-sidebar">
              <button class="sidebar-tab active" data-target="panel-personal">👤 Personal Details</button>
              <button class="sidebar-tab" data-target="panel-education">🎓 Education</button>
              <button class="sidebar-tab" data-target="panel-work">💼 Work Experience</button>
              <button class="sidebar-tab" data-target="panel-skills">⚡ Skills & Links</button>
              <button class="sidebar-tab" data-target="panel-eeo">⚖️ Demographics / EEO</button>
              <button class="sidebar-tab" data-target="panel-preference">⚙️ Job Preferences</button>
              <button class="sidebar-tab" data-target="panel-signup">🔑 Account & Cloud Sync</button>
            </div>

            <div class="modal-content-area">
              <!-- Personal Tab -->
              <div class="tab-panel active" id="panel-personal">
                <div class="form-grid-3">
                  <div class="form-group"><label><span class="req">*</span>First Name</label><input type="text" id="m-fn"></div>
                  <div class="form-group"><label>Middle Name</label><input type="text" id="m-mn"></div>
                  <div class="form-group"><label><span class="req">*</span>Last Name</label><input type="text" id="m-ln"></div>
                </div>
                <div class="form-grid-3">
                  <div class="form-group"><label>Preferred First Name</label><input type="text" id="m-pfn"></div>
                  <div class="form-group"><label>Preferred Middle Name</label><input type="text" id="m-pmn"></div>
                  <div class="form-group"><label>Preferred Last Name</label><input type="text" id="m-pln"></div>
                </div>
                <div class="form-group"><label><span class="req">*</span>Email Address</label><input type="email" id="m-em"></div>
                <div class="form-grid-2">
                  <div class="form-group">
                    <label>Phone Type</label>
                    <select id="m-ptype"><option>Mobile</option><option>Home</option><option>Work</option></select>
                  </div>
                  <div class="form-group"><label><span class="req">*</span>Phone Number</label><input type="tel" id="m-ph" placeholder="+1 234 567 8900"></div>
                </div>
                <div class="form-grid-2">
                  <div class="form-group"><label>City / Location</label><input type="text" id="m-city"></div>
                  <div class="form-group"><label>Country</label><input type="text" id="m-country"></div>
                </div>
                <div class="form-group"><label>Address Line</label><input type="text" id="m-address"></div>
              </div>

              <!-- Education Tab -->
              <div class="tab-panel" id="panel-education">
                <div class="form-group"><label>School / University Name</label><input type="text" id="m-sch"></div>
                <div class="form-grid-2">
                  <div class="form-group"><label>Degree</label><input type="text" id="m-deg" placeholder="Bachelor's, Master's, etc."></div>
                  <div class="form-group"><label>Discipline / Major</label><input type="text" id="m-dis"></div>
                </div>
                <div class="form-grid-2">
                  <div class="form-group"><label>Start Date</label><input type="text" id="m-edustart" placeholder="MM/YYYY"></div>
                  <div class="form-group"><label>End Date / Graduation</label><input type="text" id="m-eduend" placeholder="MM/YYYY"></div>
                </div>
              </div>

              <!-- Work Experience Tab -->
              <div class="tab-panel" id="panel-work">
                <div class="form-grid-2">
                  <div class="form-group"><label>Current Employer / Company</label><input type="text" id="m-emp"></div>
                  <div class="form-group"><label>Job Title</label><input type="text" id="m-tit"></div>
                </div>
                <div class="form-grid-2">
                  <div class="form-group"><label>Start Date</label><input type="text" id="m-wkstart" placeholder="MM/YYYY"></div>
                  <div class="form-group"><label>End Date</label><input type="text" id="m-wkend" placeholder="Present"></div>
                </div>
                <div class="form-group"><label>Work Experience Summary</label><textarea id="m-wkdesc" rows="3" placeholder="Key achievements..."></textarea></div>
              </div>

              <!-- Skills Tab -->
              <div class="tab-panel" id="panel-skills">
                <div class="form-group"><label>Primary Technical & Soft Skills</label><input type="text" id="m-skills" placeholder="React, TypeScript, Node.js"></div>
                <div class="form-group"><label>LinkedIn Profile URL</label><input type="url" id="m-li" placeholder="https://linkedin.com/in/username"></div>
                <div class="form-group"><label>Portfolio / Website URL</label><input type="url" id="m-po" placeholder="https://github.com/username"></div>
              </div>

              <!-- Equal Employment Tab -->
              <div class="tab-panel" id="panel-eeo">
                <div class="form-grid-2">
                  <div class="form-group"><label>Gender</label><select id="m-gen"><option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Non-binary">Non-binary</option><option value="Decline">Prefer not to say</option></select></div>
                  <div class="form-group"><label>Race / Ethnicity</label><select id="m-race"><option value="">Select Race/Ethnicity</option><option value="Asian">Asian</option><option value="Black or African American">Black or African American</option><option value="Hispanic or Latino">Hispanic or Latino</option><option value="White">White</option><option value="Two or More Races">Two or More Races</option><option value="Decline">Prefer not to say</option></select></div>
                </div>
                <div class="form-grid-2">
                  <div class="form-group"><label>Veteran Status</label><select id="m-vet"><option value="">Select Status</option><option value="Not a Veteran">I am not a protected veteran</option><option value="Protected Veteran">I identify as one or more protected veterans</option><option value="Decline">Prefer not to say</option></select></div>
                  <div class="form-group"><label>Disability Status</label><select id="m-disab"><option value="">Select Status</option><option value="No">No, I don't have a disability</option><option value="Yes">Yes, I have a disability</option><option value="Decline">Prefer not to say</option></select></div>
                </div>
              </div>

              <!-- Preference Tab -->
              <div class="tab-panel" id="panel-preference">
                <div class="form-grid-2">
                  <div class="form-group"><label>Notice Period</label><input type="text" id="m-notice" placeholder="Immediate, 2 weeks, 1 month"></div>
                  <div class="form-group"><label>Yearly Salary Expectations</label><input type="text" id="m-salary" placeholder="$90,000 / year"></div>
                </div>
              </div>

              <!-- Sign-up Info Tab -->
              <div class="tab-panel" id="panel-signup">
                <div class="form-group"><label>Account Email</label><input type="email" id="m-acc-email" readonly style="background:rgba(30,41,59,0.5);color:#94a3b8;"></div>
                <div class="form-group"><label>Database Sync User ID</label><input type="text" id="m-acc-id" value="default_user" readonly style="background:rgba(30,41,59,0.5);color:#94a3b8;"></div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button id="ad-save-profile-btn" class="btn-modal-update">Save & Sync to ApplyDesk Cloud</button>
          </div>
        </div>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(widget);

    const dockTab = shadow.getElementById('ad-dock-tab');
    const drawerPanel = shadow.getElementById('ad-drawer-panel');
    const collapseBtn = shadow.getElementById('ad-collapse-btn');
    const autofillAction = shadow.getElementById('ad-autofill-action');
    const autofillMsg = shadow.getElementById('ad-autofill-msg');
    const autofillInfoTrigger = shadow.getElementById('ad-trigger-autofill-info');
    const modalOverlay = shadow.getElementById('ad-autofill-modal');
    const modalCloseBtn = shadow.getElementById('ad-modal-close');
    const saveProfileBtn = shadow.getElementById('ad-save-profile-btn');

    // Open drawer on floating dock tab click
    dockTab.addEventListener('click', () => {
      dockTab.classList.add('closing');
      setTimeout(() => {
        dockTab.style.display = 'none';
        drawerPanel.classList.add('open');
        updateWidgetChecklist();
      }, 150);
    });

    // Collapse drawer on chevron button click
    collapseBtn.addEventListener('click', () => {
      drawerPanel.classList.remove('open');
      setTimeout(() => {
        dockTab.style.display = 'flex';
        void dockTab.offsetWidth;
        dockTab.classList.remove('closing');
      }, 250);
    });

    // Modal Tabs Navigation Logic
    const sidebarTabs = shadow.querySelectorAll('.sidebar-tab');
    const tabPanels = shadow.querySelectorAll('.tab-panel');

    sidebarTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        sidebarTabs.forEach(t => t.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-target');
        const targetPanel = shadow.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });

    // Open Modal and pre-populate inputs from Storage & Database
    autofillInfoTrigger.addEventListener('click', () => {
      modalOverlay.classList.add('open');
      loadProfileIntoModal();
    });

    modalCloseBtn.addEventListener('click', () => {
      modalOverlay.classList.remove('open');
    });

    function loadProfileIntoModal() {
      chrome.storage.local.get('resumeok_profile', async (res) => {
        let p = (res && res.resumeok_profile) ? res.resumeok_profile : null;

        // Try fetching from Express Server Mongo DB if local storage is empty
        if (!p || !p.firstName) {
          const apiUrls = [
            'https://applydesk.io/api/user/default_user/profile',
            'http://188.166.164.115:3030/api/user/default_user/profile',
            'http://localhost:3000/api/user/default_user/profile'
          ];
          for (const url of apiUrls) {
            try {
              const dbRes = await fetch(url);
              if (dbRes.ok) {
                const dbData = await dbRes.json();
                if (dbData && dbData.profile) {
                  p = dbData.profile;
                  break;
                }
              }
            } catch(e) {}
          }
        }

        const finalProfile = p || {};

        const setVal = (id, v) => {
          const el = shadow.getElementById(id);
          if (el) el.value = v || '';
        };

        setVal('m-fn', finalProfile.firstName);
        setVal('m-mn', finalProfile.middleName);
        setVal('m-ln', finalProfile.lastName);
        setVal('m-pfn', finalProfile.prefFirstName || finalProfile.firstName);
        setVal('m-pmn', finalProfile.prefMiddleName || finalProfile.middleName);
        setVal('m-pln', finalProfile.prefLastName || finalProfile.lastName);
        setVal('m-em', finalProfile.email);
        setVal('m-ptype', finalProfile.phoneType || 'Mobile');
        setVal('m-ph', finalProfile.phone);
        setVal('m-city', finalProfile.city);
        setVal('m-country', finalProfile.country);
        setVal('m-address', finalProfile.addressLine);
        setVal('m-sch', finalProfile.schoolName);
        setVal('m-deg', finalProfile.degree);
        setVal('m-dis', finalProfile.discipline);
        setVal('m-edustart', finalProfile.eduStartDate);
        setVal('m-eduend', finalProfile.eduEndDate);
        setVal('m-emp', finalProfile.companyName);
        setVal('m-tit', finalProfile.jobTitle);
        setVal('m-wkstart', finalProfile.workStartDate);
        setVal('m-wkend', finalProfile.workEndDate);
        setVal('m-wkdesc', finalProfile.workSummary);
        setVal('m-skills', finalProfile.skills);
        setVal('m-li', finalProfile.linkedinUrl);
        setVal('m-po', finalProfile.portfolioUrl);
        setVal('m-gen', finalProfile.gender);
        setVal('m-race', finalProfile.race);
        setVal('m-vet', finalProfile.veteranStatus);
        setVal('m-disab', finalProfile.disabilityStatus);
        setVal('m-notice', finalProfile.noticePeriod);
        setVal('m-salary', finalProfile.salaryExpectation);
        setVal('m-acc-email', finalProfile.email || '');
      });
    }

    // Save Profile & Sync to Backend Database
    saveProfileBtn.addEventListener('click', async () => {
      saveProfileBtn.innerText = '⚡ Syncing Database...';
      saveProfileBtn.style.opacity = '0.8';

      const getVal = (id) => {
        const el = shadow.getElementById(id);
        return el ? el.value.trim() : '';
      };

      const updatedProfile = {
        firstName: getVal('m-fn'),
        middleName: getVal('m-mn'),
        lastName: getVal('m-ln'),
        prefFirstName: getVal('m-pfn'),
        prefMiddleName: getVal('m-pmn'),
        prefLastName: getVal('m-pln'),
        email: getVal('m-em'),
        phoneType: getVal('m-ptype'),
        phone: getVal('m-ph'),
        city: getVal('m-city'),
        country: getVal('m-country'),
        addressLine: getVal('m-address'),
        schoolName: getVal('m-sch'),
        degree: getVal('m-deg'),
        discipline: getVal('m-dis'),
        eduStartDate: getVal('m-edustart'),
        eduEndDate: getVal('m-eduend'),
        companyName: getVal('m-emp'),
        jobTitle: getVal('m-tit'),
        workStartDate: getVal('m-wkstart'),
        workEndDate: getVal('m-wkend'),
        workSummary: getVal('m-wkdesc'),
        skills: getVal('m-skills'),
        linkedinUrl: getVal('m-li'),
        portfolioUrl: getVal('m-po'),
        gender: getVal('m-gen'),
        race: getVal('m-race'),
        veteranStatus: getVal('m-vet'),
        disabilityStatus: getVal('m-disab'),
        noticePeriod: getVal('m-notice'),
        salaryExpectation: getVal('m-salary')
      };

      // 1. Save to Chrome Local Storage
      chrome.storage.local.set({ resumeok_profile: updatedProfile }, async () => {
        // 2. Sync to Mongo Database via Express Server Endpoint
        const saveUrls = [
          'https://applydesk.io/api/user/default_user/profile',
          'http://188.166.164.115:3030/api/user/default_user/profile',
          'http://localhost:3000/api/user/default_user/profile'
        ];
        for (const url of saveUrls) {
          try {
            const saveRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profile: updatedProfile })
            });
            if (saveRes.ok) break;
          } catch(e) {
            console.log('Database sync error on', url, e);
          }
        }

        saveProfileBtn.innerText = '✅ Saved & Synced!';
        setTimeout(() => {
          saveProfileBtn.innerText = 'Update & Sync Database';
          saveProfileBtn.style.opacity = '1';
          modalOverlay.classList.remove('open');
          updateWidgetChecklist();
        }, 600);
      });
    });

    function updateWidgetChecklist() {
      try {
        chrome.storage.local.get('resumeok_profile', (res) => {
          const profile = (res && res.resumeok_profile) ? res.resumeok_profile : {};
          const scanRes = scanFormFields(profile);

          const countEl = shadow.getElementById('ad-fill-count');
          const percentEl = shadow.getElementById('ad-fill-percent');
          const barEl = shadow.getElementById('ad-progress-bar');
          const listEl = shadow.getElementById('ad-checklist');

          if (countEl) countEl.innerText = `${scanRes.filledCount}/${scanRes.totalCount} required fields filled`;
          if (percentEl) percentEl.innerText = `${scanRes.percentage}%`;
          if (barEl) barEl.style.width = `${scanRes.percentage}%`;

          if (listEl && scanRes.fields) {
            listEl.innerHTML = scanRes.fields.map(f => {
              if (f.status === 'filled') {
                return `<div class="check-item check-item-success"><span class="check-icon">✔</span><span>${f.label}</span></div>`;
              } else if (f.status === 'missing_profile') {
                return `<div class="check-item check-item-warning">
                  <div style="display:flex;align-items:center;gap:6px;"><span class="check-icon">⚠️</span><span>${f.label}</span></div>
                  <a href="#" class="missing-notice-btn" id="trigger-add-prof-${f.key}">+ Add in Profile</a>
                </div>`;
              } else {
                return `<div class="check-item check-item-unfilled"><span class="check-icon">-</span><span>${f.label}</span></div>`;
              }
            }).join('');

            // Attach event listeners for in-page "+ Add in Profile" buttons to open modal directly
            scanRes.fields.forEach(f => {
              if (f.status === 'missing_profile') {
                const btn = shadow.getElementById(`trigger-add-prof-${f.key}`);
                if (btn) {
                  btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    modalOverlay.classList.add('open');
                    loadProfileIntoModal();
                  });
                }
              }
            });
          }
        });
      } catch(e) {}
    }

    // 1-Tap Quick Fill Chip Click Handlers
    const chipName = shadow.getElementById('ad-chip-name');
    const chipEmail = shadow.getElementById('ad-chip-email');
    const chipPhone = shadow.getElementById('ad-chip-phone');
    const chipResume = shadow.getElementById('ad-chip-resume');

    const handleQuickFill = (fieldKey) => {
      chrome.storage.local.get('resumeok_profile', (res) => {
        const p = (res && res.resumeok_profile) ? res.resumeok_profile : {};
        if (fieldKey === 'name') {
          const fnInput = document.querySelector('input[name*="first" i], input[id*="first" i], input[autocomplete*="given-name"]');
          const lnInput = document.querySelector('input[name*="last" i], input[id*="last" i], input[autocomplete*="family-name"]');
          if (fnInput) setVal(fnInput, p.firstName);
          if (lnInput) setVal(lnInput, p.lastName);
          const nameInput = document.querySelector('input[name*="name" i], input[id*="name" i]');
          if (nameInput && !fnInput && !lnInput) setVal(nameInput, `${p.firstName || ''} ${p.lastName || ''}`.trim());
        } else if (fieldKey === 'email') {
          const emInput = document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
          if (emInput) setVal(emInput, p.email);
        } else if (fieldKey === 'phone') {
          const phInput = document.querySelector('input[type="tel"], input[name*="phone" i], input[id*="phone" i]');
          if (phInput) setVal(phInput, p.phone);
        } else if (fieldKey === 'resume') {
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput.click();
        }
        updateWidgetChecklist();
      });
    };

    if (chipName) chipName.addEventListener('click', () => handleQuickFill('name'));
    if (chipEmail) chipEmail.addEventListener('click', () => handleQuickFill('email'));
    if (chipPhone) chipPhone.addEventListener('click', () => handleQuickFill('phone'));
    if (chipResume) chipResume.addEventListener('click', () => handleQuickFill('resume'));

    // Populate Job Details into ATS Match Score Card
    const jobInfo = extractJobDetails();
    const jobTitleEl = shadow.getElementById('ad-job-title');
    const jobCompEl = shadow.getElementById('ad-job-company');
    if (jobTitleEl && jobInfo.title) jobTitleEl.innerText = jobInfo.title;
    if (jobCompEl && jobInfo.company) jobCompEl.innerText = jobInfo.company;

    autofillAction.addEventListener('click', async () => {
      chrome.storage.local.get('resumeok_profile', async (res) => {
        let p = (res && res.resumeok_profile) ? res.resumeok_profile : null;

        // Try fetching from Express Server Mongo DB if local storage is empty
        if (!p || (!p.firstName && !p.resumeFile && !p.skills)) {
          const apiUrls = [
            'https://applydesk.io/api/user/default_user/profile',
            'http://188.166.164.115:3030/api/user/default_user/profile',
            'http://localhost:3000/api/user/default_user/profile'
          ];
          for (const url of apiUrls) {
            try {
              const dbRes = await fetch(url);
              if (dbRes.ok) {
                const dbData = await dbRes.json();
                if (dbData && dbData.profile) {
                  p = dbData.profile;
                  break;
                }
              }
            } catch(e) {}
          }
        }

        const profile = p || {};

        // 1. Check if user has uploaded / provided a resume
        const hasResume = profile.resumeFileName || profile.resumeFile || profile.resumeBase64 || (profile.skills && profile.skills.length > 3) || profile.firstName;
        if (!hasResume) {
          autofillMsg.innerHTML = '<span style="color:#ef4444;font-weight:700;">⚠️ Please upload or enter your candidate resume first.</span>';
          modalOverlay.classList.add('open');
          loadProfileIntoModal();
          return;
        }

        const drawerBody = shadow.querySelector('.drawer-body');
        if (!drawerBody) return;

        // 2. STEP 1: Show Loading Screen 1 (Scanning Job... - Image 1)
        drawerBody.innerHTML = `
          <div class="loading-screen">
            <div class="spinner-ring"></div>
            <div class="loading-title">Scanning Job...</div>
          </div>
        `;

        const jobInfo = extractJobDetails();

        // Wait 1.3s for Scanning Job animation
        await new Promise(r => setTimeout(r, 1300));

        // 3. STEP 2: Show Loading Screen 2 (Score Matching... - Image 2)
        drawerBody.innerHTML = `
          <div class="loading-screen">
            <div class="spinner-ring"></div>
            <div class="loading-title">Score Matching...</div>
          </div>
        `;

        // Calculate REAL Match Scores & Form Scan Result
        const matchResult = calculateRealJobMatch(jobInfo, profile);
        const scanResult = scanFormFields(profile);

        // Wait 1.3s for Score Matching animation
        await new Promise(r => setTimeout(r, 1300));

        // 4. STEP 3: Show Image 3 Scanned Job & Real Match Results View
        const resumeFileName = profile.resumeFileName || (profile.firstName ? `${profile.firstName}_25jun.PDF` : 'OmidMoradi_25jun.PDF');
        
        drawerBody.innerHTML = `
          <!-- Card 1: Scanned Job & Real Match Details (Image 3) -->
          <div class="card-white">
            <div style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:4px;">${jobInfo.title}</div>
            <div style="font-size:13px;font-weight:500;color:#64748b;margin-bottom:12px;">${jobInfo.location ? jobInfo.location + ' • ' : ''}${jobInfo.industry || jobInfo.company}</div>
            <div style="border-bottom: 1px solid #f1f5f9; margin-bottom: 14px;"></div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:16px;font-weight:800;color:#0f172a;">Job Match</span>
              <span style="font-size:17px;font-weight:800;color:#0f172a;">${matchResult.jobMatch}/100</span>
            </div>

            <!-- 3 Metric Pills -->
            <div class="metric-pills-grid">
              <div class="pill-box pill-box-green">
                <div class="pill-score-val">${matchResult.jobMatch}%</div>
                <div class="pill-score-lbl">JOB MATCH</div>
              </div>
              <div class="pill-box pill-box-gray">
                <div class="pill-score-val">${matchResult.skillsScore}%</div>
                <div class="pill-score-lbl">SKILLS</div>
              </div>
              <div class="pill-box pill-box-gray">
                <div class="pill-score-val">${matchResult.resumeScore}%</div>
                <div class="pill-score-lbl">RESUME</div>
              </div>
            </div>

            <button id="ad-results-autofill-btn" class="btn-black-pill">
              Autofill Form
            </button>
            <div id="ad-results-autofill-msg" style="font-size:12px;color:#10b981;text-align:center;margin-top:6px;font-weight:700;"></div>
          </div>

          <!-- Card 2: Resume Score -->
          <div class="card-white">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="font-size:16px;font-weight:800;color:#0f172a;">Resume Score</div>
              <div style="font-size:16px;font-weight:700;color:#0f172a;">${matchResult.resumeScore}/100</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
              <span style="font-size:20px;">📁</span>
              <span style="font-size:13px;font-weight:600;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${resumeFileName}</span>
            </div>
            <button id="ad-fix-resume-btn-2" class="btn-outline-pill">
              <span style="color:#eab308;">⚡</span> Fix resume issues
            </button>
          </div>

          <!-- Card 3: Your Coverletter -->
          <div class="card-white">
            <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:12px;">Your Coverletter</div>
            <button id="ad-generate-cl-btn" class="btn-outline-pill" style="margin-top:0;">
              <span style="color:#eab308;">⚡</span> Generate cover letter
            </button>
          </div>

          <!-- Card 4: Edit Your information -->
          <div id="ad-trigger-autofill-info-2" class="edit-info-row">
            <div class="edit-info-text">Edit Your information</div>
            <div style="font-size:15px;font-weight:700;color:#64748b;">❯</div>
          </div>

          <!-- Card 5: Fields Progress -->
          <div class="edit-info-row" style="cursor:default;">
            <div class="edit-info-text">Fields</div>
            <div style="font-size:15px;font-weight:800;color:#0f172a;">${scanResult.percentage || 0}%</div>
          </div>
        `;

        // Re-attach event listeners for Results View Buttons
        const autofillBtn = shadow.getElementById('ad-results-autofill-btn');
        const autofillMsg = shadow.getElementById('ad-results-autofill-msg');
        if (autofillBtn) {
          autofillBtn.addEventListener('click', () => {
            const fillRes = runAutofill(profile);
            if (autofillMsg) autofillMsg.innerText = `✅ Autofilled ${fillRes.count || 'form'} fields!`;
          });
        }

        const editInfoRow = shadow.getElementById('ad-trigger-autofill-info-2');
        if (editInfoRow) {
          editInfoRow.addEventListener('click', () => {
            modalOverlay.classList.add('open');
            loadProfileIntoModal();
          });
        }
      });
    });
  }

  // Always inject dock tab & drawer widget on web pages
  try {
    injectInPageFloatingDockAndDrawer();
    chrome.runtime.sendMessage({ type: 'FORM_DETECTED' });
  } catch(e) {}

  // Message listener from extension action, popup, or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TOGGLE_DRAWER') {
      if (!document.getElementById('applydesk-inpage-host')) {
        injectInPageFloatingDockAndDrawer();
      }
      const shadow = document.getElementById('applydesk-inpage-host')?.shadowRoot;
      const drawer = shadow?.getElementById('ad-drawer-panel');
      const dock = shadow?.getElementById('ad-dock-tab');
      if (drawer) {
        if (drawer.classList.contains('open')) {
          drawer.classList.remove('open');
          if (dock) {
            dock.style.display = 'flex';
            setTimeout(() => dock.classList.remove('closing'), 10);
          }
        } else {
          drawer.classList.add('open');
          if (dock) dock.style.display = 'none';
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
    } else if (request.type === 'OPEN_AUTOFILL_MODAL') {
      const modal = document.getElementById('applydesk-inpage-host')?.shadowRoot?.getElementById('ad-autofill-modal');
      const drawer = document.getElementById('applydesk-inpage-host')?.shadowRoot?.getElementById('ad-drawer-panel');
      const dock = document.getElementById('applydesk-inpage-host')?.shadowRoot?.getElementById('ad-dock-tab');
      if (drawer) drawer.classList.add('open');
      if (dock) dock.style.display = 'none';
      if (modal) modal.classList.add('open');
      sendResponse({ success: true });
    }
    return true;
  });
})();
