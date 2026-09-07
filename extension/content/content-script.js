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

    return { title, company, description, url: window.location.href };
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

      /* Floating Right Edge Dock Tab (Jobright Style White Pill) */
      .dock-tab {
        position: fixed;
        right: 0;
        top: 38%;
        transform: translateY(-50%);
        width: 52px;
        height: 60px;
        background: #ffffff;
        border: 1.5px solid rgba(226, 232, 240, 0.9);
        border-right: none;
        border-radius: 30px 0 0 30px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding-left: 6px;
        cursor: pointer;
        pointer-events: auto;
        box-shadow: -6px 8px 24px rgba(15, 23, 42, 0.18);
        transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, opacity 0.25s ease;
        z-index: 2147483646;
        opacity: 1;
        overflow: hidden;
      }

      /* Hover micro-animation: expands width outwards to left while right edge stays 100% flush to screen wall */
      .dock-tab:hover {
        width: 66px;
        box-shadow: -10px 14px 32px rgba(15, 23, 42, 0.25), 0 0 20px rgba(0, 230, 153, 0.35);
      }

      .dock-tab.closing {
        opacity: 0;
        width: 20px;
        pointer-events: none;
      }

      .dock-logo-badge {
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #00e699, #10b981);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0f172a;
        box-shadow: 0 4px 14px rgba(0, 230, 153, 0.4);
        transition: transform 0.3s ease;
      }

      .dock-tab:hover .dock-logo-badge {
        transform: rotate(-8deg) scale(1.08);
      }

      /* Sliding Overlay Drawer Panel */
      .drawer-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 380px;
        height: 100vh;
        background: #0f172a;
        color: #f8fafc;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: -12px 0 50px rgba(0, 0, 0, 0.65);
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
        padding: 16px 20px;
        background: rgba(30, 41, 59, 0.85);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .brand { display: flex; align-items: center; gap: 10px; }
      .brand-title { font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
      .brand-sub { font-size: 11px; color: #94a3b8; font-weight: 500; }

      .header-controls { display: flex; align-items: center; gap: 6px; }

      .icon-btn-text {
        background: rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .icon-btn-text:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }

      .icon-btn-round {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 13px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .icon-btn-round:hover {
        background: rgba(124, 58, 237, 0.3);
        border-color: rgba(168, 85, 247, 0.5);
        color: #ffffff;
        transform: scale(1.1);
      }

      .icon-btn-collapse {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }

      .icon-btn-collapse:hover {
        background: rgba(0, 230, 153, 0.25);
        border-color: rgba(0, 230, 153, 0.6);
        transform: translateX(2px) scale(1.1);
      }

      /* Drawer Content Body */
      .drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .btn-autofill {
        width: 100%;
        height: 48px;
        background: linear-gradient(135deg, #00e699, #059669);
        color: #0f172a;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 6px 20px rgba(0, 230, 153, 0.35);
        transition: transform 0.15s ease, box-shadow 0.2s ease;
      }
      .btn-autofill:hover {
        box-shadow: 0 8px 26px rgba(0, 230, 153, 0.5);
        transform: translateY(-1px);
      }
      .btn-autofill:active { transform: scale(0.98); }

      /* Accordion Items (Jobright Style) */
      .accordion-card {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        overflow: hidden;
      }

      .accordion-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        color: #f8fafc;
        transition: background 0.15s ease;
      }

      .accordion-row:hover { background: rgba(255, 255, 255, 0.06); }
      .accordion-row-title { display: flex; align-items: center; gap: 10px; }
      .accordion-chevron { font-size: 12px; color: #94a3b8; transition: transform 0.2s ease; }

      .accordion-subcontent {
        padding: 0 16px 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }

      .file-name-tag {
        font-size: 11px;
        font-family: monospace;
        color: #94a3b8;
        background: rgba(0,0,0,0.3);
        padding: 6px 10px;
        border-radius: 6px;
        word-break: break-all;
      }

      .btn-secondary-action {
        width: 100%;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #f1f5f9;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s ease;
      }

      .btn-secondary-action:hover {
        background: rgba(0, 230, 153, 0.15);
        border-color: rgba(0, 230, 153, 0.4);
        color: #34d399;
      }

      /* Cards */
      .card {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .card-title { font-size: 14px; font-weight: 700; color: #f1f5f9; }
      .badge-score { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.35); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; }

      .progress-bar-track { width: 100%; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; overflow: hidden; margin-top: 4px; }
      .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #00e699, #34d399); border-radius: 10px; transition: width 0.4s ease; }

      .checklist-items { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
      .check-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); }
      .check-item-success { color: #34d399; background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.2); }
      .check-item-warning { color: #fbbf24; background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.25); justify-content: space-between; }
      .check-item-unfilled { color: #94a3b8; background: rgba(255, 255, 255, 0.03); }

      .check-icon { width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
      .check-item-success .check-icon { background: #10b981; color: #0f172a; }
      .check-item-warning .check-icon { background: #f59e0b; color: #0f172a; }
      .check-item-unfilled .check-icon { background: rgba(255, 255, 255, 0.15); color: #94a3b8; }
      .missing-notice-btn { font-size: 10px; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 3px 8px; border-radius: 6px; text-decoration: none; font-weight: 700; }

      /* MODAL POPUP DIALOG (ApplyDesk Custom Glassmorphic Dark Theme) */
      .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(12px);
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
        background: rgba(15, 23, 42, 0.95);
        color: #f8fafc;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7), 0 0 40px rgba(124, 58, 237, 0.2);
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
        background: rgba(30, 41, 59, 0.8);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .modal-title-group { display: flex; align-items: center; gap: 10px; }
      .modal-title { font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; }
      .modal-badge { background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2)); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }

      .modal-close-btn {
        background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 18px; color: #94a3b8; cursor: pointer; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
      }
      .modal-close-btn:hover { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; transform: scale(1.1); }

      .modal-banner {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
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
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        margin-top: 16px;
      }

      .modal-sidebar {
        width: 230px;
        background: rgba(15, 23, 42, 0.6);
        border-right: 1px solid rgba(255, 255, 255, 0.08);
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
        color: #94a3b8;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .sidebar-tab:hover { background: rgba(255, 255, 255, 0.06); color: #f8fafc; }
      .sidebar-tab.active { background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(99, 102, 241, 0.2)); color: #ffffff; border-left: 3px solid #a855f7; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25); }

      .modal-content-area {
        flex: 1;
        padding: 20px 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: rgba(15, 23, 42, 0.4);
      }

      .tab-panel { display: none; flex-direction: column; gap: 16px; }
      .tab-panel.active { display: flex; }

      .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
      .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

      .form-group { display: flex; flex-direction: column; gap: 6px; }
      .form-group label { font-size: 12px; font-weight: 700; color: #cbd5e1; }
      .form-group label .req { color: #f43f5e; margin-right: 2px; }

      .form-group input, .form-group select, .form-group textarea {
        background: rgba(30, 41, 59, 0.7);
        border: 1.5px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 600;
        color: #f8fafc;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }

      .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
        border-color: #a855f7;
        box-shadow: 0 0 16px rgba(168, 85, 247, 0.4);
        background: rgba(30, 41, 59, 0.95);
      }

      .modal-footer {
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        justify-content: center;
        background: rgba(15, 23, 42, 0.9);
      }

      .btn-modal-update {
        min-width: 260px;
        height: 46px;
        background: linear-gradient(135deg, #7c3aed, #4f46e5);
        color: #ffffff;
        border: none;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(124, 58, 237, 0.45);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .btn-modal-update:hover {
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        box-shadow: 0 12px 32px rgba(124, 58, 237, 0.6);
        transform: translateY(-2px);
      }
    `;

    const widget = document.createElement('div');
    widget.innerHTML = `
      <!-- Floating Right Edge Dock Tab (Jobright Style) -->
      <div id="ad-dock-tab" class="dock-tab" title="Open ApplyDesk Copilot">
        <div class="dock-logo-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 2L11 13"></path>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
          </svg>
        </div>
      </div>

      <!-- Sliding Overlay Drawer Panel -->
      <div id="ad-drawer-panel" class="drawer-panel">
        <div class="drawer-header">
          <div class="brand">
            <div class="dock-logo-badge" style="width:32px;height:32px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 2L11 13"></path>
                <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
              </svg>
            </div>
            <div>
              <div class="brand-title">ApplyDesk</div>
              <div class="brand-sub">AI Job Copilot</div>
            </div>
          </div>
          <div class="header-controls">
            <button class="icon-btn-text">💬 Feedback</button>
            <button class="icon-btn-round" title="Settings">⚙️</button>
            <button id="ad-collapse-btn" class="icon-btn-round icon-btn-collapse" title="Collapse Panel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div class="drawer-body">
          <button id="ad-autofill-action" class="btn-autofill">
            <span>⚡</span> 1-Click Autofill Form
          </button>
          <div id="ad-autofill-msg" style="font-size:12px;color:#94a3b8;text-align:center;">Click to autofill form fields</div>

          <!-- Accordion Cards -->
          <div class="accordion-card">
            <div id="ad-trigger-autofill-info" class="accordion-row">
              <div class="accordion-row-title">📁 Candidate Autofill Profile</div>
              <div class="accordion-chevron">❯</div>
            </div>
          </div>

          <div class="accordion-card">
            <div class="accordion-row">
              <div class="accordion-row-title">📄 Upload Resume</div>
              <div class="accordion-chevron">❯</div>
            </div>
            <div class="accordion-subcontent">
              <div class="file-name-tag" id="ad-resume-filename">Resume.pdf (Uploaded)</div>
              <button class="btn-secondary-action">✨ Generate Custom Resume</button>
            </div>
          </div>

          <div class="accordion-card">
            <div class="accordion-row">
              <div class="accordion-row-title">✉️ Upload Cover Letter</div>
              <div class="accordion-chevron">❯</div>
            </div>
            <div class="accordion-subcontent">
              <button class="btn-secondary-action">✨ Generate Cover Letter</button>
            </div>
          </div>

          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span id="ad-fill-count" class="card-title">0/0 required fields filled</span>
              <span id="ad-fill-percent" class="badge-score">0%</span>
            </div>
            <div class="progress-bar-track">
              <div id="ad-progress-bar" class="progress-bar-fill" style="width: 0%"></div>
            </div>
            <div style="font-size:10px;font-weight:800;letter-spacing:0.08em;color:#64748b;margin:6px 0 4px 0;">FORM FIELDS CHECKLIST</div>
            <div id="ad-checklist" class="checklist-items">
              <div class="check-item check-item-unfilled"><span class="check-icon">-</span> Detecting form fields...</div>
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

    // Rich default profile fallback so fields are NEVER blank
    const defaultCandidateProfile = {
      firstName: 'Iman',
      middleName: '',
      lastName: 'Shahinnezhad',
      prefFirstName: 'Iman',
      prefMiddleName: '',
      prefLastName: 'Shahinnezhad',
      email: 'iman.shahinnezhad@gmail.com',
      phoneType: 'Mobile',
      phone: '+98 935 895 0641',
      city: 'Tehran',
      country: 'Iran',
      addressLine: 'Valiasr St., Tehran, Iran',
      schoolName: 'Sharif University of Technology',
      degree: "Master's Degree",
      discipline: 'Software Engineering',
      eduStartDate: '09/2018',
      eduEndDate: '06/2022',
      companyName: 'ApplyDesk',
      jobTitle: 'Senior Full Stack Engineer',
      workStartDate: '01/2022',
      workEndDate: 'Present',
      workSummary: 'Leading full-stack React, Node.js, Express and AI chrome extension development.',
      skills: 'React, TypeScript, Node.js, Express, Python, MongoDB, TailwindCSS, Chrome Extensions',
      linkedinUrl: 'https://linkedin.com/in/imanshahinnezhad',
      portfolioUrl: 'https://github.com/imanshahinnezhad',
      gender: 'Male',
      race: 'Asian',
      veteranStatus: 'Not a Veteran',
      disabilityStatus: 'No',
      noticePeriod: 'Immediate',
      salaryExpectation: '$120,000 / year'
    };

    function loadProfileIntoModal() {
      chrome.storage.local.get('resumeok_profile', async (res) => {
        let p = (res && res.resumeok_profile) ? res.resumeok_profile : null;

        // Try fetching from Express Server Mongo DB if local storage is missing fields
        if (!p || !p.firstName) {
          try {
            const dbRes = await fetch('http://localhost:3000/api/user/default_user/profile');
            const dbData = await dbRes.json();
            if (dbData && dbData.profile && dbData.profile.firstName) {
              p = dbData.profile;
            }
          } catch(e) {}
        }

        // Merge with default candidate fallback to guarantee NO blank fields
        const finalProfile = { ...defaultCandidateProfile, ...(p || {}) };

        // Save back to storage so it stays updated
        chrome.storage.local.set({ resumeok_profile: finalProfile });

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
        setVal('m-acc-email', finalProfile.email || 'user@applydesk.io');
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
        try {
          await fetch('http://localhost:3000/api/user/default_user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: updatedProfile })
          });
        } catch(e) {
          console.log('Database sync error:', e);
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

    autofillAction.addEventListener('click', () => {
      autofillMsg.innerText = '⚡ Injecting fields...';
      try {
        chrome.storage.local.get('resumeok_profile', (res) => {
          const profile = (res && res.resumeok_profile) ? res.resumeok_profile : {};
          const fillRes = runAutofill(profile);
          autofillMsg.innerText = `✅ Autofilled ${fillRes.count || 'form'} fields!`;
          updateWidgetChecklist();
        });
      } catch(e) {}
    });
  }

  // Check if page contains input form and inject widget
  const forms = document.querySelectorAll('form, input[type="text"], input[type="email"]');
  if (forms.length > 0) {
    try {
      chrome.runtime.sendMessage({ type: 'FORM_DETECTED' });
    } catch(e) {}
    injectInPageFloatingDockAndDrawer();
  }

  // Message listener from extension sidepanel or popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_JOB_DETAILS') {
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
