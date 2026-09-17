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

  // Inject In-Page Floating Edge Dock Tab & Light Drawer Widget matching Design Images 1 & 2
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

      /* Floating Right Edge Dock Tab (Image 2 - Light Pill with Green Paperplane Circle) */
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
        display: none;
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

      /* Sliding Drawer Panel (Pixel-Perfect Light UI matching screenshot) */
      .drawer-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 385px;
        height: 100vh;
        background: #f4f4f6;
        color: #0f172a;
        border-left: 1px solid #e2e8f0;
        box-shadow: -10px 0 40px rgba(0, 0, 0, 0.08);
        transform: translateX(100%);
        transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
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

      /* Circular Collapse Arrow Button (Image 1) */
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
        transform: scale(1.06);
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

      /* White Cards */
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

      .edit-info-row:hover { background: #f8fafc; }
      .edit-info-text { font-size: 15px; font-weight: 800; color: #0f172a; }

      .loading-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 20px;
        gap: 20px;
      }

      .spinner-ring {
        width: 50px;
        height: 50px;
        border: 3.5px solid #e2e8f0;
        border-top-color: #000000;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .loading-title {
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
      }

      .metric-pills-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        margin: 14px 0 18px 0;
      }

      .pill-box {
        border-radius: 14px;
        padding: 12px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .pill-box-green { background: #f0fdf4; border: 1px solid #bbf7d0; }
      .pill-box-green .pill-score-val { color: #16a34a; }
      .pill-box-green .pill-score-lbl { color: #16a34a; }

      .pill-box-gray { background: #f8fafc; border: 1px solid #e2e8f0; }
      .pill-box-gray .pill-score-val { color: #0f172a; }
      .pill-box-gray .pill-score-lbl { color: #64748b; }

      .pill-score-val { font-size: 18px; font-weight: 800; line-height: 1.2; }
      .pill-score-lbl { font-size: 10px; font-weight: 800; letter-spacing: 0.04em; margin-top: 4px; }
    `;

    const widget = document.createElement('div');
    widget.innerHTML = `
      <!-- Floating Right Edge Dock Tab (Image 2) -->
      <div id="ad-dock-tab" class="dock-tab" title="Open ApplyDesk Copilot">
        <div class="dock-green-circle">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
          </svg>
        </div>
      </div>

      <!-- Sliding Overlay Drawer Panel (Image 1 Light Header & Layout) -->
      <div id="ad-drawer-panel" class="drawer-panel open">
        <header class="drawer-header">
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
            <!-- Collapse Button (Image 1) -->
            <button id="ad-collapse-btn" class="collapse-btn-circle" title="Collapse Panel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </header>

        <div id="ad-drawer-main-content" class="drawer-body">
          <!-- Card 1: Add to match score and autofill forms -->
          <div class="card-white">
            <div class="card-title-lg">Add to match score and autofill forms</div>
            <button id="ad-add-job-action" class="btn-black-pill">
              +Add this job to Applydesk
            </button>
            <div id="ad-add-job-msg" style="font-size:12px;color:#64748b;text-align:center;margin-top:8px;"></div>
          </div>

          <!-- Card 2: Resume Score -->
          <div class="card-white">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="font-size:16px;font-weight:800;color:#0f172a;">Resume Score</div>
              <div id="ad-resume-score-val" style="font-size:16px;font-weight:700;color:#94a3b8;">0/100</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
              <span style="font-size:20px;">📁</span>
              <span id="ad-resume-filename-val" style="font-size:13px;font-weight:600;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">OmidMoradi_25jun.PDF</span>
            </div>
            <button id="ad-fix-resume-btn" class="btn-outline-pill">
              <span style="color:#eab308;">⚡</span> Fix resume issues
            </button>
          </div>

          <!-- Card 3: Edit Your information -->
          <a href="https://applydesk.io/#/profile" target="_blank" class="edit-info-row" style="text-decoration:none;">
            <div class="edit-info-text">Edit Your information</div>
            <div style="font-size:15px;font-weight:700;color:#64748b;">❯</div>
          </a>
        </div>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(widget);

    const dockTab = shadow.getElementById('ad-dock-tab');
    const drawerPanel = shadow.getElementById('ad-drawer-panel');
    const collapseBtn = shadow.getElementById('ad-collapse-btn');
    const addJobBtn = shadow.getElementById('ad-add-job-action');
    const drawerMain = shadow.getElementById('ad-drawer-main-content');

    // Load Candidate Profile & Resume filename
    let currentProfile = {};
    chrome.storage.local.get('resumeok_profile', (res) => {
      if (res && res.resumeok_profile) {
        currentProfile = res.resumeok_profile;
        const filename = currentProfile.resumeFileName || (currentProfile.firstName ? `${currentProfile.firstName}_25jun.PDF` : 'OmidMoradi_25jun.PDF');
        const fnEl = shadow.getElementById('ad-resume-filename-val');
        if (fnEl) fnEl.innerText = filename;
      }
    });

    // 1. CLICK COLLAPSE ARROW > (Image 1) -> Hides Panel & Shows Dock Tab (Image 2)
    collapseBtn.addEventListener('click', () => {
      drawerPanel.classList.remove('open');
      setTimeout(() => {
        dockTab.style.display = 'flex';
      }, 220);
    });

    // 2. CLICK DOCK TAB (Image 2) -> Hides Dock Tab & Shows Panel
    dockTab.addEventListener('click', () => {
      dockTab.style.display = 'none';
      drawerPanel.classList.add('open');
    });

    // 3. Click "+Add this job to Applydesk" -> 2-Stage Loaders & Results View
    if (addJobBtn) {
      addJobBtn.addEventListener('click', async () => {
        const storageData = await chrome.storage.local.get('resumeok_profile');
        if (storageData && storageData.resumeok_profile) {
          currentProfile = storageData.resumeok_profile;
        }

        const hasResume = currentProfile.resumeFileName || currentProfile.resumeFile || currentProfile.resumeBase64 || (currentProfile.skills && currentProfile.skills.length > 3) || currentProfile.firstName;
        if (!hasResume) {
          const msg = shadow.getElementById('ad-add-job-msg');
          if (msg) msg.innerHTML = '<span style="color:#ef4444;font-weight:700;">⚠️ Please upload or enter your candidate resume in Applydesk first.</span>';
          window.open('https://applydesk.io/#/profile', '_blank');
          return;
        }

        // STEP 1: Scanning Job...
        drawerMain.innerHTML = `
          <div class="loading-screen">
            <div class="spinner-ring"></div>
            <div class="loading-title">Scanning Job...</div>
          </div>
        `;

        const jobInfo = extractJobDetails();
        await new Promise(r => setTimeout(r, 1300));

        // STEP 2: Score Matching...
        drawerMain.innerHTML = `
          <div class="loading-screen">
            <div class="spinner-ring"></div>
            <div class="loading-title">Score Matching...</div>
          </div>
        `;

        const matchResult = calculateRealJobMatch(jobInfo, currentProfile);
        const scanResult = scanFormFields(currentProfile);
        await new Promise(r => setTimeout(r, 1300));

        const resumeFileName = currentProfile.resumeFileName || (currentProfile.firstName ? `${currentProfile.firstName}_25jun.PDF` : 'OmidMoradi_25jun.PDF');

        // STEP 3: Results View
        drawerMain.innerHTML = `
          <div class="card-white">
            <div style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:4px;">${jobInfo.title}</div>
            <div style="font-size:13px;font-weight:500;color:#64748b;margin-bottom:12px;">${jobInfo.location ? jobInfo.location + ' • ' : ''}${jobInfo.industry || jobInfo.company}</div>
            <div style="border-bottom: 1px solid #f1f5f9; margin-bottom: 14px;"></div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:16px;font-weight:800;color:#0f172a;">Job Match</span>
              <span style="font-size:17px;font-weight:800;color:#0f172a;">${matchResult.jobMatch}/100</span>
            </div>

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

          <div class="card-white">
            <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:12px;">Your Coverletter</div>
            <button id="ad-generate-cl-btn" class="btn-outline-pill" style="margin-top:0;">
              <span style="color:#eab308;">⚡</span> Generate cover letter
            </button>
          </div>

          <a href="https://applydesk.io/#/profile" target="_blank" class="edit-info-row" style="text-decoration:none;">
            <div class="edit-info-text">Edit Your information</div>
            <div style="font-size:15px;font-weight:700;color:#64748b;">❯</div>
          </a>

          <div class="edit-info-row" style="cursor:default;">
            <div class="edit-info-text">Fields</div>
            <div style="font-size:15px;font-weight:800;color:#0f172a;">${scanResult.percentage || 0}%</div>
          </div>
        `;

        const autofillBtn = shadow.getElementById('ad-results-autofill-btn');
        const autofillMsg = shadow.getElementById('ad-results-autofill-msg');
        if (autofillBtn) {
          autofillBtn.addEventListener('click', () => {
            const fillRes = runAutofill(currentProfile);
            if (autofillMsg) autofillMsg.innerText = `✅ Autofilled ${fillRes.count || 'form'} fields!`;
          });
        }
      });
    }
  }

  // Inject dock tab & drawer widget on web pages automatically
  try {
    injectInPageFloatingDockAndDrawer();
    chrome.runtime.sendMessage({ type: 'FORM_DETECTED' });
  } catch(e) {}

  // Message listener from extension action, popup, or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const shadow = document.getElementById('applydesk-inpage-host')?.shadowRoot;
    const drawerPanel = shadow?.getElementById('ad-drawer-panel');
    const dockTab = shadow?.getElementById('ad-dock-tab');

    if (request.type === 'TOGGLE_DRAWER') {
      if (!document.getElementById('applydesk-inpage-host')) {
        injectInPageFloatingDockAndDrawer();
      }
      if (drawerPanel) {
        if (drawerPanel.classList.contains('open')) {
          drawerPanel.classList.remove('open');
          if (dockTab) setTimeout(() => { dockTab.style.display = 'flex'; }, 200);
        } else {
          if (dockTab) dockTab.style.display = 'none';
          drawerPanel.classList.add('open');
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
})();
