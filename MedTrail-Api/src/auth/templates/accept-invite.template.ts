export function renderAcceptInviteHtml(params: {
  token: string;
  name: string;
  role: string;
  email: string;
  frontendUrl?: string;
}): string {
  const { token, name, role, email, frontendUrl = 'http://localhost:5173' } = params;

  // Format title like Figma design: "Welcome Dr. Adewale" or "Welcome Pharm. Adewale"
  const cleanName = name.replace(/^(dr\.?|pharm\.?)\s+/i, '');
  const prefix = role.toLowerCase() === 'doctor' ? 'Dr.' : role.toLowerCase() === 'pharmacist' ? 'Pharm.' : '';
  const displayName = prefix ? `${prefix} ${cleanName}` : cleanName;
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MedTrail – Welcome ${displayName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    body, html {
      height: 100%;
      background-color: #ffffff;
      color: #111827;
      overflow-x: hidden;
    }
    .container {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }
    /* Left branding panel */
    .brand-panel {
      width: 48.35%;
      background: linear-gradient(145deg, #475AA2 0%, #364782 100%);
      color: #ffffff;
      padding: 60px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .brand-logo {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-decoration: none;
    }
    .brand-logo span {
      opacity: 0.8;
      font-weight: 500;
    }
    .brand-headline {
      margin-top: 40px;
      max-width: 500px;
      font-size: 32px;
      line-height: 1.2;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .brand-art {
      margin-top: auto;
      padding-top: 30px;
      display: flex;
      justify-content: center;
      align-items: flex-end;
    }
    .pill-graphic {
      width: 100%;
      max-width: 440px;
      height: 240px;
      background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 70%);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.15);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      backdrop-filter: blur(8px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.12);
    }
    .pill-capsule {
      width: 130px;
      height: 52px;
      background: linear-gradient(90deg, #60A5FA 50%, #FFFFFF 50%);
      border-radius: 999px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      transform: rotate(-25deg);
      margin-bottom: 24px;
    }
    .brand-pill-tag {
      font-size: 13px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-weight: 600;
      background: rgba(255,255,255,0.2);
      padding: 6px 14px;
      border-radius: 999px;
      color: #ffffff;
    }

    /* Right form panel */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 32px;
      background: #ffffff;
    }
    .form-wrapper {
      width: 100%;
      max-width: 440px;
    }
    .header-block {
      text-align: center;
      margin-bottom: 32px;
    }
    .title {
      font-size: 26px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.5px;
    }
    .subtitle {
      margin-top: 6px;
      font-size: 15px;
      color: #7A8190;
    }
    .role-badge {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: #DEE2FF;
      color: #475AA2;
    }

    /* Inputs */
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #111827;
      margin-bottom: 8px;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      border: 1px solid #D8DCE5;
      border-radius: 12px;
      background: #ffffff;
      transition: all 0.2s ease;
    }
    .input-wrapper:focus-within {
      border-color: #475AA2;
      box-shadow: 0 0 0 4px rgba(71, 90, 162, 0.15);
    }
    .input-wrapper.error {
      border-color: #E5484D;
      box-shadow: 0 0 0 4px rgba(229, 72, 77, 0.15);
    }
    input[type="password"],
    input[type="text"] {
      width: 100%;
      height: 48px;
      padding: 0 16px;
      border: none;
      outline: none;
      font-size: 15px;
      color: #111827;
      background: transparent;
      border-radius: 12px;
    }
    .eye-btn {
      background: none;
      border: none;
      padding: 0 16px;
      cursor: pointer;
      color: #475AA2;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 48px;
    }
    .eye-btn:hover {
      color: #364782;
    }

    /* Strength bars */
    .strength-meter {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 10px;
      margin-bottom: 12px;
    }
    .strength-segment {
      height: 5px;
      border-radius: 999px;
      background: #E5E8EF;
      transition: background 0.3s ease;
    }
    .strength-segment.active-warning {
      background: #F2C94C;
    }
    .strength-segment.active-success {
      background: #2F9E44;
    }

    /* Requirements checklist */
    .requirements-title {
      font-size: 12px;
      font-weight: 500;
      color: #7A8190;
      margin-bottom: 8px;
    }
    .requirements-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .req-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #7A8190;
      transition: color 0.2s ease;
    }
    .req-item.met {
      color: #2F9E44;
      font-weight: 500;
    }
    .req-bullet {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #D9DEE8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #ffffff;
      flex-shrink: 0;
      transition: background 0.2s ease;
    }
    .req-item.met .req-bullet {
      background: #2F9E44;
    }

    /* Feedback error box */
    .error-box {
      display: none;
      background: #FDF2F2;
      border: 1px solid #F8B4B4;
      color: #E5484D;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 16px;
      align-items: center;
      gap: 8px;
    }

    /* Continue button */
    .submit-btn {
      width: 100%;
      height: 48px;
      background: #475AA2;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 24px;
    }
    .submit-btn:hover {
      background: #3D4F91;
    }
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Footer link */
    .footer-text {
      margin-top: 24px;
      text-align: center;
      font-size: 14px;
      color: #7A8190;
    }
    .footer-text a {
      color: #475AA2;
      text-decoration: none;
      font-weight: 600;
    }
    .footer-text a:hover {
      text-decoration: underline;
    }

    /* Success screen */
    .success-panel {
      display: none;
      text-align: center;
      padding: 20px 0;
    }
    .success-icon-badge {
      width: 68px;
      height: 68px;
      background: #E8F5E9;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .success-icon-badge svg {
      width: 36px;
      height: 36px;
      color: #2F9E44;
    }
    .success-title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 10px;
    }
    .success-desc {
      font-size: 15px;
      color: #6B7280;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .action-row {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn-login {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 48px;
      background: #475AA2;
      color: #ffffff;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      transition: background 0.2s;
    }
    .btn-login:hover {
      background: #3D4F91;
    }

    @media (max-width: 900px) {
      .container {
        flex-direction: column;
      }
      .brand-panel {
        width: 100%;
        min-height: 240px;
        padding: 32px 24px;
      }
      .brand-headline {
        font-size: 22px;
        margin-top: 16px;
      }
      .brand-art {
        display: none;
      }
      .form-panel {
        padding: 36px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Left side branding -->
    <div class="brand-panel">
      <div>
        <a href="${frontendUrl}" class="brand-logo">
          med<span>trail</span>
        </a>
        <h1 class="brand-headline">
          One medication record,<br>
          from prescription to<br>
          patient
        </h1>
      </div>
      <div class="brand-art">
        <div class="pill-graphic">
          <div class="pill-capsule"></div>
          <div class="brand-pill-tag">MedTrail Healthcare Platform</div>
        </div>
      </div>
    </div>

    <!-- Right side registration form -->
    <div class="form-panel">
      <div class="form-wrapper">
        <!-- Interactive form -->
        <div id="formSection">
          <div class="header-block">
            <h2 class="title">Welcome ${displayName}</h2>
            <p class="subtitle">Create your password to complete registration</p>
            <div class="role-badge">${roleDisplay} Account • ${email}</div>
          </div>

          <div id="errorBox" class="error-box">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm.75-10.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm-.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/>
            </svg>
            <span id="errorMessage">Error</span>
          </div>

          <form id="registerForm" novalidate>
            <input type="hidden" id="token" value="${token}" />

            <!-- Password input -->
            <div class="form-group">
              <label for="password">Password</label>
              <div class="input-wrapper" id="passwordWrapper">
                <input type="password" id="password" placeholder="••••••••••" autocomplete="new-password" required />
                <button type="button" class="eye-btn" id="togglePassword" aria-label="Toggle password visibility">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>

              <!-- Strength meter bar -->
              <div class="strength-meter">
                <div class="strength-segment" id="seg1"></div>
                <div class="strength-segment" id="seg2"></div>
                <div class="strength-segment" id="seg3"></div>
              </div>

              <!-- Live requirements checklist -->
              <div class="requirements-title">Must contain at least:</div>
              <div class="requirements-list">
                <div class="req-item" id="reqUpper">
                  <span class="req-bullet">✓</span>
                  <span>At least 1 uppercase letter</span>
                </div>
                <div class="req-item" id="reqNumber">
                  <span class="req-bullet">✓</span>
                  <span>At least 1 number</span>
                </div>
                <div class="req-item" id="reqSpecial">
                  <span class="req-bullet">✓</span>
                  <span>At least 1 special character</span>
                </div>
                <div class="req-item" id="reqLength">
                  <span class="req-bullet">✓</span>
                  <span>At least 8 characters</span>
                </div>
              </div>
            </div>

            <!-- Confirm password input -->
            <div class="form-group">
              <label for="confirmPassword">Confirm password</label>
              <div class="input-wrapper" id="confirmWrapper">
                <input type="password" id="confirmPassword" placeholder="••••••••••" autocomplete="new-password" required />
                <button type="button" class="eye-btn" id="toggleConfirm" aria-label="Toggle confirm password visibility">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" id="submitBtn" class="submit-btn">Continue</button>
          </form>

          <p class="footer-text">
            Already have an account? <a href="${frontendUrl}/login">Log in</a>
          </p>
        </div>

        <!-- Success screen shown after completion -->
        <div id="successSection" class="success-panel">
          <div class="success-icon-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 class="success-title">Welcome to MedTrail!</h2>
          <p class="success-desc">
            Your registration is complete and your password has been set, <strong>${displayName}</strong>.<br><br>
            Next time you visit MedTrail, choose your role (<strong>${roleDisplay}</strong>) and log in directly with your email and password.
          </p>
          <div class="action-row">
            <a href="${frontendUrl}/login" class="btn-login">Go to Login</a>
            <a href="${frontendUrl}/select-role" style="font-size:14px;color:#475AA2;text-decoration:none;font-weight:600;margin-top:8px;">Choose Role on MedTrail</a>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirm = document.getElementById('toggleConfirm');
    const submitBtn = document.getElementById('submitBtn');
    const registerForm = document.getElementById('registerForm');
    const errorBox = document.getElementById('errorBox');
    const errorMessage = document.getElementById('errorMessage');
    const formSection = document.getElementById('formSection');
    const successSection = document.getElementById('successSection');

    const reqUpper = document.getElementById('reqUpper');
    const reqNumber = document.getElementById('reqNumber');
    const reqSpecial = document.getElementById('reqSpecial');
    const reqLength = document.getElementById('reqLength');

    const seg1 = document.getElementById('seg1');
    const seg2 = document.getElementById('seg2');
    const seg3 = document.getElementById('seg3');

    // Toggle eye icons
    togglePassword.addEventListener('click', () => {
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
    });
    toggleConfirm.addEventListener('click', () => {
      const isPass = confirmInput.type === 'password';
      confirmInput.type = isPass ? 'text' : 'password';
    });

    // Live validation
    function validatePassword() {
      const val = passwordInput.value;
      const hasUpper = /[A-Z]/.test(val);
      const hasNum = /\\d/.test(val);
      const hasSpec = /[^A-Za-z0-9]/.test(val);
      const hasLen = val.length >= 8;

      reqUpper.classList.toggle('met', hasUpper);
      reqNumber.classList.toggle('met', hasNum);
      reqSpecial.classList.toggle('met', hasSpec);
      reqLength.classList.toggle('met', hasLen);

      const score = [hasUpper, hasNum, hasSpec, hasLen].filter(Boolean).length;

      seg1.className = 'strength-segment' + (score >= 1 ? (score >= 3 ? ' active-success' : ' active-warning') : '');
      seg2.className = 'strength-segment' + (score >= 3 ? (score === 4 ? ' active-success' : ' active-warning') : '');
      seg3.className = 'strength-segment' + (score === 4 ? ' active-success' : '');

      return score === 4;
    }

    passwordInput.addEventListener('input', validatePassword);

    function showError(msg) {
      errorMessage.textContent = msg;
      errorBox.style.display = 'flex';
    }
    function hideError() {
      errorBox.style.display = 'none';
    }

    // Submit handler
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const token = document.getElementById('token').value;
      const password = passwordInput.value;
      const confirmPassword = confirmInput.value;

      if (!password) {
        showError('Please enter a password.');
        return;
      }
      if (!validatePassword()) {
        showError('Password does not meet all the required criteria.');
        return;
      }
      if (password !== confirmPassword) {
        showError('Passwords do not match. Please verify your confirm password.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Activating account...';

      try {
        const response = await fetch('/api/auth/complete-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            token,
            password,
            confirmPassword
          })
        });

        const data = await response.json();

        if (!response.ok) {
          const msg = Array.isArray(data.message) ? data.message.join(' ') : (data.message || 'Registration failed');
          showError(msg);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Continue';
          return;
        }

        // Store JWT in localStorage so when they visit frontend they can be recognized if needed
        if (data.accessToken) {
          try {
            localStorage.setItem('medtrail_token', data.accessToken);
          } catch(e) {}
        }

        // Show celebratory success screen
        formSection.style.display = 'none';
        successSection.style.display = 'block';

      } catch (err) {
        showError('Connection error. Please check your internet and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue';
      }
    });
  </script>
</body>
</html>`;
}

export function renderInvalidInviteHtml(params: {
  message?: string;
  frontendUrl?: string;
}): string {
  const { message = 'This invitation link is invalid or has expired.', frontendUrl = 'http://localhost:5173' } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MedTrail – Invitation Expired</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #F7F8FB; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #ffffff; max-width: 460px; width: 100%; border-radius: 20px; padding: 40px 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); text-align: center; }
    .icon-badge { width: 64px; height: 64px; border-radius: 50%; background: #FDF2F2; color: #E5484D; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
    h1 { font-size: 22px; color: #111827; margin-bottom: 12px; }
    p { font-size: 14px; color: #6B7280; line-height: 1.6; margin-bottom: 28px; }
    .btn { display: inline-block; background: #475AA2; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .btn:hover { background: #3D4F91; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-badge">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
    <h1>Invitation Link Issue</h1>
    <p>${message}<br><br>Please contact your hospital or system administrator to request a new invitation link.</p>
    <a href="${frontendUrl}/login" class="btn">Return to Login</a>
  </div>
</body>
</html>`;
}
