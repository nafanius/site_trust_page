/**
 * VisaPlace UI Example - Main JavaScript
 * All interactive components: mobile menu, dropdowns, tabs, accordion, modal, form validation
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initDropdowns();
  initTabs();
  initModal();
  initFormValidation();
  initKeyboardAccessibility();
});

/* ============================================
   MOBILE MENU / DRAWER
   ============================================ */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('mobile-close-btn');

  if (!menuBtn || !drawer) return;

  const openDrawer = () => {
    drawer.classList.remove('hidden');
    drawer.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.add('hidden');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  menuBtn.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);

  // Close on backdrop click
  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.classList.contains('hidden')) {
      closeDrawer();
    }
  });
}

/* ============================================
   DROPDOWNS / MEGA MENU (Desktop hover + keyboard)
   ============================================ */
function initDropdowns() {
  const dropdowns = document.querySelectorAll('[data-dropdown]');

  dropdowns.forEach((dropdown) => {
    const button = dropdown.querySelector('button');
    const menu = dropdown.querySelector('div');

    if (!button || !menu) return;

    // Keyboard support
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const isOpen = menu.classList.contains('opacity-100');
        if (isOpen) {
          closeDropdown(dropdown);
        } else {
          openDropdown(dropdown);
        }
      }
      if (e.key === 'Escape') {
        closeDropdown(dropdown);
        button.focus();
      }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        closeDropdown(dropdown);
      }
    });

    // Hover is handled via CSS group-hover
    // Add focus styles for accessibility
    button.addEventListener('focus', () => openDropdown(dropdown));
    button.addEventListener('blur', (e) => {
      // Delay to allow clicking inside menu
      setTimeout(() => {
        if (!dropdown.contains(document.activeElement)) {
          closeDropdown(dropdown);
        }
      }, 150);
    });
  });

  function openDropdown(dropdown) {
    const menu = dropdown.querySelector('div');
    const button = dropdown.querySelector('button');
    if (menu) {
      menu.classList.remove('opacity-0', 'invisible');
      menu.classList.add('opacity-100', 'visible');
    }
    if (button) button.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown(dropdown) {
    const menu = dropdown.querySelector('div');
    const button = dropdown.querySelector('button');
    if (menu) {
      menu.classList.add('opacity-0', 'invisible');
      menu.classList.remove('opacity-100', 'visible');
    }
    if (button) button.setAttribute('aria-expanded', 'false');
  }
}

/* ============================================
   TABS
   ============================================ */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const panels = {
    us: document.getElementById('tab-us'),
    ca: document.getElementById('tab-ca')
  };

  if (!tabButtons.length) return;

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      // Deactivate all
      tabButtons.forEach(b => b.classList.remove('active', 'border-b-2', 'border-[#055a96]', 'text-[#055a96]'));
      tabButtons.forEach(b => b.classList.add('text-[#45464d]'));

      // Activate clicked
      btn.classList.add('active', 'border-b-2', 'border-[#055a96]', 'text-[#055a96]');
      btn.classList.remove('text-[#45464d]');

      // Show/hide panels
      Object.keys(panels).forEach(key => {
        if (panels[key]) {
          panels[key].classList.toggle('hidden', key !== target);
        }
      });
    });

    // Keyboard support
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentIndex = Array.from(tabButtons).indexOf(btn);
        const nextIndex = e.key === 'ArrowRight' 
          ? (currentIndex + 1) % tabButtons.length 
          : (currentIndex - 1 + tabButtons.length) % tabButtons.length;
        tabButtons[nextIndex].focus();
        tabButtons[nextIndex].click();
      }
    });
  });
}

/* ============================================
   MODAL
   ============================================ */
let modal = null;

function initModal() {
  modal = document.getElementById('modal');
  if (!modal) return;

  const closeBtn = document.getElementById('modal-close');
  const okBtn = document.getElementById('modal-ok');

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  };

  closeBtn?.addEventListener('click', closeModal);
  okBtn?.addEventListener('click', closeModal);

  // Close on backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

function showModal() {
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';

  // Focus trap - focus first focusable
  const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable) focusable.focus();
}

/* ============================================
   FORM VALIDATION + SUBMISSION
   ============================================ */
function initFormValidation() {
  const form = document.getElementById('consultation-form');
  if (!form) return;

  const submitText = document.getElementById('submit-text');
  const submitSpinner = document.getElementById('submit-spinner');
  const successMsg = document.getElementById('form-success');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    clearFormErrors(form);

    let isValid = true;

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'country', 'consent'];
    
    requiredFields.forEach(id => {
      const field = document.getElementById(id);
      if (!field) return;

      if (id === 'consent') {
        if (!field.checked) {
          showFieldError(field, 'You must consent to be contacted.');
          isValid = false;
        }
      } else if (!field.value.trim()) {
        showFieldError(field, getErrorMessage(id));
        isValid = false;
      } else if (id === 'email' && !isValidEmail(field.value)) {
        showFieldError(field, 'Please enter a valid email address.');
        isValid = false;
      }
    });

    if (!isValid) return;

    // Show loading state
    if (submitText) submitText.textContent = 'SENDING...';
    if (submitSpinner) submitSpinner.classList.remove('hidden');
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 850));

    // Success
    form.reset();
    if (submitText) submitText.textContent = 'REQUEST CONSULTATION';
    if (submitSpinner) submitSpinner.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = false;
    if (successMsg) successMsg.classList.remove('hidden');

    // Show thank you modal after short delay
    setTimeout(() => {
      if (successMsg) successMsg.classList.add('hidden');
      showModal();
    }, 1200);
  });

  // Real-time validation on blur
  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('blur', () => {
      if (field.hasAttribute('required') || field.id === 'email') {
        validateSingleField(field);
      }
    });
  });
}

function getErrorMessage(fieldId) {
  const messages = {
    firstName: 'Please enter your first name.',
    lastName: 'Please enter your last name.',
    email: 'Please enter a valid email.',
    country: 'Please select a country of interest.'
  };
  return messages[fieldId] || 'This field is required.';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(field, message) {
  const wrapper = field.closest('div');
  if (!wrapper) return;

  field.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
  field.setAttribute('aria-invalid', 'true');

  let errorEl = wrapper.querySelector('.error-text');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'error-text text-xs text-red-600 mt-1';
    wrapper.appendChild(errorEl);
  }
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function clearFormErrors(form) {
  form.querySelectorAll('.error-text').forEach(el => el.classList.add('hidden'));
  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
    field.removeAttribute('aria-invalid');
  });
}

function validateSingleField(field) {
  const wrapper = field.closest('div');
  if (!wrapper) return;

  const existingError = wrapper.querySelector('.error-text');
  if (existingError) existingError.classList.add('hidden');
  field.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');

  let valid = true;
  let msg = '';

  if (field.hasAttribute('required') && !field.value.trim()) {
    valid = false;
    msg = getErrorMessage(field.id);
  } else if (field.id === 'email' && field.value && !isValidEmail(field.value)) {
    valid = false;
    msg = 'Please enter a valid email address.';
  }

  if (!valid) {
    showFieldError(field, msg);
  }
}

/* ============================================
   KEYBOARD ACCESSIBILITY ENHANCEMENTS
   ============================================ */
function initKeyboardAccessibility() {
  // Make sure all interactive elements are reachable
  // Add visible focus styles already handled in CSS

  // Skip to main content link (good practice)
  const skipLink = document.createElement('a');
  skipLink.href = '#about';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] bg-white px-4 py-2 text-sm font-medium text-[#055a96] border border-[#055a96] rounded';
  document.body.insertBefore(skipLink, document.body.firstChild);

  // Trap focus inside mobile drawer when open
  const drawer = document.getElementById('mobile-drawer');
  if (drawer) {
    drawer.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = drawer.querySelectorAll('a, button, input, select');
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }
}

// Expose a couple of helpers for manual testing in console
window.VisaPlaceDemo = {
  showThankYouModal: () => {
    const modal = document.getElementById('modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },
  resetForm: () => {
    const form = document.getElementById('consultation-form');
    if (form) form.reset();
  }
};