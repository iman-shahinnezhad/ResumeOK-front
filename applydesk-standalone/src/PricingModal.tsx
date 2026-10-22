import { useState } from 'react';
import './pricing-modal.css';

import iconApplyDesk from './assets/pricing/applydesk-icon.svg';
import textApplyDesk from './assets/pricing/applydesk-text.svg';
import iconClose from './assets/pricing/x-close.svg';
import iconShield from './assets/pricing/shield-tick.svg';
import iconVerified from './assets/pricing/check-verified.svg';
import iconChevronRight from './assets/pricing/chevron-right.svg';
import iconCheckWhite from './assets/pricing/check-white.svg';
import iconCheckDark from './assets/pricing/check-dark.svg';

export interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanSelected?: (plan: 'monthly' | 'weekly') => void;
}

const PLAN_FEATURES = [
  'Access to all jobs',
  'Job Match Score',
  'AI-tailored resumes',
  'Application autofill Extensions',
  'AI Cover Letter Generator'
];

export default function PricingModal({ isOpen, onClose, onPlanSelected }: PricingModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'weekly'>('monthly');
  const [step, setStep] = useState<'plan' | 'checkout' | 'success'>('plan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Stripe form fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [country, setCountry] = useState('US');
  const [postalCode, setPostalCode] = useState('');
  const [txId, setTxId] = useState('');

  if (!isOpen) return null;

  const isMonthly = selectedPlan === 'monthly';
  const amount = isMonthly ? 39.99 : 17.99;
  const credits = isMonthly ? 600 : 300;
  const packageName = isMonthly ? 'ApplyDesk Monthly Pro' : 'ApplyDesk Weekly Starter';

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
    if (paymentError) setPaymentError(null);
  };

  // Format Card Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`);
    } else {
      setCardExpiry(raw);
    }
    if (paymentError) setPaymentError(null);
  };

  // Format CVC (3-4 digits)
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvc(raw);
    if (paymentError) setPaymentError(null);
  };

  // Detect Card Brand
  const detectCardBrand = () => {
    const clean = cardNumber.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    return 'generic';
  };

  // Auto-fill Test Card (Stripe standard test card)
  const handleFillTestCard = () => {
    setCardholderName('Alex Johnson');
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/28');
    setCardCvc('123');
    setCountry('US');
    setPostalCode('94103');
    setPaymentError(null);
  };

  // Step 1: User clicks "Continue" in pricing modal
  // As requested: "vaghti continue ro mizane nabandesh bebaresh vase form stripe"
  const handleContinueToStripe = () => {
    setStep('checkout');
    setPaymentError(null);
  };

  // Step 2: User completes Stripe payment
  const handleProcessPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPaymentError(null);

    const cleanCard = cardNumber.replace(/\s+/g, '');
    if (cleanCard.length < 15) {
      setPaymentError('Please enter a valid card number.');
      return;
    }
    if (cardExpiry.length < 5) {
      setPaymentError('Please enter a valid expiration date (MM/YY).');
      return;
    }
    if (cardCvc.length < 3) {
      setPaymentError('Please enter your card CVC/CVV.');
      return;
    }
    if (!cardholderName.trim()) {
      setPaymentError('Please enter the cardholder name.');
      return;
    }

    setIsSubmitting(true);

    const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3030'
      : 'https://api.applydesk.io';

    const token = localStorage.getItem('auth_token') || localStorage.getItem('resumeok_token');

    try {
      // Send confirmation to backend
      if (token) {
        await fetch(`${apiBase}/api/payment/confirm-mock-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            credits,
            packageName,
            plan: selectedPlan,
            amount
          })
        }).catch(() => {});
      }

      // Generate a mock Stripe charge ID for receipt
      const generatedTxId = `ch_stripe_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setTxId(generatedTxId);

      // Update local storage credits & plan
      const currentCredits = parseInt(localStorage.getItem('applydesk_credits') || '0', 10);
      const newCredits = currentCredits + credits;
      localStorage.setItem('applydesk_credits', String(newCredits));
      localStorage.setItem('user_plan', isMonthly ? 'Monthly Pro' : 'Weekly Starter');

      // Dispatch event for instant UI update
      window.dispatchEvent(new CustomEvent('applydesk:credits_updated', {
        detail: { credits: newCredits, plan: selectedPlan }
      }));

      // Transition smoothly to success screen
      setTimeout(() => {
        setIsSubmitting(false);
        setStep('success');
      }, 900);
    } catch (err: any) {
      console.error('[Stripe Checkout Error]', err);
      setIsSubmitting(false);
      setPaymentError(err.message || 'Payment processing failed. Please try again.');
    }
  };

  const handleFinishSuccess = () => {
    if (onPlanSelected) {
      onPlanSelected(selectedPlan);
    }
    onClose();
  };

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className={`pm-dialog ${step === 'checkout' ? 'stripe-checkout-mode' : ''}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Top Header */}
        <div className="pm-header">
          <div className="pm-brand">
            <img src={iconApplyDesk} alt="ApplyDesk Icon" className="pm-brand-icon" />
            <img src={textApplyDesk} alt="ApplyDesk" className="pm-brand-text" />
          </div>

          <div className="pm-header-right">
            {step === 'checkout' && (
              <button className="pm-back-btn" onClick={() => setStep('plan')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Back to Plans</span>
              </button>
            )}

            <button className="pm-close-btn" onClick={onClose} aria-label="Close modal">
              <img src={iconClose} alt="Close" />
            </button>
          </div>
        </div>

        {/* STEP 1: PLANS SELECTION */}
        {step === 'plan' && (
          <div className="pm-grid">
            {/* Left Column: Value Proposition */}
            <div className="pm-left">
              <div className="pm-left-top">
                <h2 className="pm-title">Simple, honest pricing.</h2>
                <p className="pm-subtitle">
                  See jobs you’re truly qualified for, matched to your real skills, with no fake listings and early alerts.
                </p>

                <div className="pm-features">
                  <div className="pm-feature-item">
                    <div className="pm-feature-icon">
                      <img src={iconVerified} alt="Verified" />
                    </div>
                    <p className="pm-feature-text">Daily Fresh Job Listings from 1200 Companies</p>
                  </div>

                  <div className="pm-feature-item">
                    <div className="pm-feature-icon">
                      <img src={iconVerified} alt="Verified" />
                    </div>
                    <p className="pm-feature-text">Global & Remote Opportunities</p>
                  </div>
                </div>
              </div>

              {/* Left Footer: Guarantee & Terms */}
              <div className="pm-left-bottom">
                <div className="pm-guarantee">
                  <img src={iconShield} alt="Shield" />
                  <span>No Commitment, Cancel Any Time.</span>
                </div>
                <div className="pm-links">
                  <span className="pm-link" onClick={() => window.open('https://applydesk.io/privacy-policy', '_blank')}>Privacy</span>
                  <span>|</span>
                  <span className="pm-link" onClick={() => window.open('https://applydesk.io/user-agreement', '_blank')}>Terms</span>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing Cards & Action Button */}
            <div className="pm-right">
              <div className="pm-cards">
                {/* Monthly Card */}
                <div
                  className={`pm-card ${selectedPlan === 'monthly' ? 'dark' : 'light'}`}
                  onClick={() => setSelectedPlan('monthly')}
                >
                  <div className="pm-card-head">
                    <div className="pm-radio">
                      <div className="pm-radio-inner" />
                    </div>
                    <span className="pm-card-title">Monthly</span>
                    <span className="pm-discount-badge">40% OFF</span>
                  </div>

                  <p className="pm-card-credits">600 Credits or 200 Application</p>

                  <div className="pm-card-price-row">
                    <p className="pm-card-price">$9.99/Week</p>
                    <p className="pm-card-billed">$39.99 Billed Monthly + Tax</p>
                  </div>

                  <ul className="pm-card-list">
                    {PLAN_FEATURES.map((feat, idx) => (
                      <li key={idx}>
                        <img
                          src={selectedPlan === 'monthly' ? iconCheckWhite : iconCheckDark}
                          alt="check"
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weekly Card */}
                <div
                  className={`pm-card ${selectedPlan === 'weekly' ? 'dark' : 'light'}`}
                  onClick={() => setSelectedPlan('weekly')}
                >
                  <div className="pm-card-head">
                    <div className="pm-radio">
                      <div className="pm-radio-inner" />
                    </div>
                    <span className="pm-card-title">Weekly</span>
                  </div>

                  <p className="pm-card-credits">300 Credits or 50 Application</p>

                  <div className="pm-card-price-row">
                    <p className="pm-card-price">$17.99/Week</p>
                    <p className="pm-card-billed">$17.99 Billed weekly + Tax</p>
                  </div>

                  <ul className="pm-card-list">
                    {PLAN_FEATURES.map((feat, idx) => (
                      <li key={idx}>
                        <img
                          src={selectedPlan === 'weekly' ? iconCheckWhite : iconCheckDark}
                          alt="check"
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottom Right CTA */}
              <div className="pm-action-row">
                <button
                  className="pm-continue-btn"
                  onClick={handleContinueToStripe}
                >
                  <span>Continue</span>
                  <img src={iconChevronRight} alt="›" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: STRIPE CHECKOUT FORM (Custom Design matching ApplyDesk aesthetic) */}
        {step === 'checkout' && (
          <div className="stripe-checkout-layout">
            {/* Left: Plan / Order Summary */}
            <div className="sc-summary-col">
              <div className="sc-summary-header">
                <span className="sc-badge-plan">{isMonthly ? 'Monthly Pro' : 'Weekly Starter'}</span>
                {isMonthly && <span className="sc-badge-save">SAVE 40%</span>}
              </div>

              <div className="sc-price-block">
                <div className="sc-price-main">
                  <span className="sc-currency">$</span>
                  <span className="sc-amount">{amount.toFixed(2)}</span>
                  <span className="sc-frequency">/{isMonthly ? 'month' : 'week'}</span>
                </div>
                <p className="sc-billed-subtext">Billed {isMonthly ? 'monthly' : 'weekly'} • Cancel anytime</p>
              </div>

              <div className="sc-credits-highlight">
                <div className="sc-credits-icon">✨</div>
                <div>
                  <h4 className="sc-credits-title">+{credits} AI Application Credits</h4>
                  <p className="sc-credits-desc">Immediately available to auto-apply & tailor resumes.</p>
                </div>
              </div>

              <div className="sc-features-summary">
                <p className="sc-summary-label">What’s included:</p>
                <ul className="sc-features-list">
                  <li>
                    <img src={iconVerified} alt="✓" />
                    <span>Access to 4 million curated tech jobs</span>
                  </li>
                  <li>
                    <img src={iconVerified} alt="✓" />
                    <span>Real-time ATS Match Scoring</span>
                  </li>
                  <li>
                    <img src={iconVerified} alt="✓" />
                    <span>AI Tailored Resume & Cover Letter export</span>
                  </li>
                  <li>
                    <img src={iconVerified} alt="✓" />
                    <span>1-click Autofill Extension integration</span>
                  </li>
                </ul>
              </div>

              <div className="sc-guarantee-note">
                <img src={iconShield} alt="Shield" />
                <span>256-bit TLS encrypted checkout. No hidden fees.</span>
              </div>
            </div>

            {/* Right: Stripe Payment Form */}
            <div className="sc-form-col">
              <div className="sc-form-top">
                <div className="sc-form-title-group">
                  <h3 className="sc-form-title">Payment Details</h3>
                  <p className="sc-form-desc">Complete your subscription securely via Stripe.</p>
                </div>
                <div className="sc-stripe-pill">
                  <span>Powered by</span>
                  <strong className="stripe-word">stripe</strong>
                </div>
              </div>

              {/* Payment Methods Badges */}
              <div className="sc-payment-method-selector">
                <div className="sc-method-tab active">
                  <div className="sc-method-radio" />
                  <span className="sc-method-label">Credit or Debit Card</span>
                  <div className="sc-card-icons">
                    {/* Visa Icon */}
                    <span className={`sc-card-pill ${detectCardBrand() === 'visa' ? 'highlight' : ''}`}>VISA</span>
                    {/* Mastercard Icon */}
                    <span className={`sc-card-pill ${detectCardBrand() === 'mastercard' ? 'highlight' : ''}`}>MC</span>
                    {/* Amex Icon */}
                    <span className={`sc-card-pill ${detectCardBrand() === 'amex' ? 'highlight' : ''}`}>AMEX</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleProcessPayment} className="sc-card-form">
                {paymentError && (
                  <div className="sc-error-banner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Cardholder Name */}
                <div className="sc-input-group">
                  <label className="sc-input-label">Cardholder Name</label>
                  <input
                    type="text"
                    className="sc-input"
                    placeholder="e.g. Alex Johnson"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    required
                  />
                </div>

                {/* Card Number */}
                <div className="sc-input-group">
                  <label className="sc-input-label">Card Number</label>
                  <div className="sc-input-with-icon">
                    <input
                      type="text"
                      className="sc-input"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      maxLength={19}
                      required
                    />
                    <div className="sc-input-right-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expiry & CVC in 1 row */}
                <div className="sc-inputs-row">
                  <div className="sc-input-group">
                    <label className="sc-input-label">Expiration Date</label>
                    <input
                      type="text"
                      className="sc-input"
                      placeholder="MM / YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      maxLength={5}
                      required
                    />
                  </div>
                  <div className="sc-input-group">
                    <label className="sc-input-label">CVC / CVV</label>
                    <div className="sc-input-with-icon">
                      <input
                        type="text"
                        className="sc-input"
                        placeholder="123"
                        value={cardCvc}
                        onChange={handleCvcChange}
                        maxLength={4}
                        required
                      />
                      <div className="sc-input-right-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Country & Postal Code */}
                <div className="sc-inputs-row">
                  <div className="sc-input-group">
                    <label className="sc-input-label">Country</label>
                    <select
                      className="sc-input sc-select"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="NL">Netherlands</option>
                      <option value="AU">Australia</option>
                      <option value="CH">Switzerland</option>
                      <option value="SE">Sweden</option>
                      <option value="OTHER">Other Country</option>
                    </select>
                  </div>
                  <div className="sc-input-group">
                    <label className="sc-input-label">Postal / ZIP Code</label>
                    <input
                      type="text"
                      className="sc-input"
                      placeholder="94103"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Auto-Fill Test Card Pill for instant demo */}
                <div className="sc-test-card-prompt">
                  <button
                    type="button"
                    className="sc-test-fill-btn"
                    onClick={handleFillTestCard}
                    title="Click to fill test card data"
                  >
                    <span>⚡ Fill Stripe Test Card (4242)</span>
                  </button>
                </div>

                {/* Submit Payment Button */}
                <button
                  type="submit"
                  className="sc-pay-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="sc-btn-spinner-wrap">
                      <div className="sc-spinner" />
                      <span>Processing Payment with Stripe...</span>
                    </div>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Pay ${amount.toFixed(2)}</span>
                    </>
                  )}
                </button>

                {/* Security footer */}
                <div className="sc-form-footer">
                  <p>
                    By confirming your payment, you authorize ApplyDesk to charge you according to the selected plan.
                    You can manage or cancel your subscription anytime in your profile settings.
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT SUCCESS CONFIRMATION */}
        {step === 'success' && (
          <div className="sc-success-layout">
            <div className="sc-success-card">
              <div className="sc-success-icon-wrap">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h2 className="sc-success-title">Payment Successful!</h2>
              <p className="sc-success-subtitle">
                Thank you! Your transaction has been confirmed by Stripe.
              </p>

              <div className="sc-success-receipt">
                <div className="sc-receipt-row">
                  <span>Plan:</span>
                  <strong>{packageName}</strong>
                </div>
                <div className="sc-receipt-row">
                  <span>Credits Added:</span>
                  <strong className="sc-text-green">+{credits} Credits</strong>
                </div>
                <div className="sc-receipt-row">
                  <span>Amount Paid:</span>
                  <strong>${amount.toFixed(2)} USD</strong>
                </div>
                <div className="sc-receipt-row">
                  <span>Reference ID:</span>
                  <code className="sc-receipt-code">{txId || 'ch_3P289xApplyDesk'}</code>
                </div>
                <div className="sc-receipt-row">
                  <span>Status:</span>
                  <span className="sc-status-pill">Active</span>
                </div>
              </div>

              <button
                className="sc-success-finish-btn"
                onClick={handleFinishSuccess}
              >
                <span>Start Applying to Jobs</span>
                <img src={iconChevronRight} alt="›" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
