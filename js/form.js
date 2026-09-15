/**
 * VisaPlace UI Example - Main JavaScript
 * All interactive components: mobile menu, dropdowns, tabs, accordion, modal, form validation
 */

document.addEventListener('DOMContentLoaded', () => {
  initModal();
  initFormValidation();
  initKeyboardAccessibility();
});


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
  const form = document.getElementById('contact-form');
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
    const requiredFields = ['firstName', 'message', 'phone', ];
    
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
      } else if (id === 'phone' && !isValidPhone(field.value)) {
        showFieldError(field, 'Please enter a valid phone number.');
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
    firstName: 'Please enter your name.',
    phone: 'Please enter a valid phone number.',
  };
  return messages[fieldId] || 'This field is required.';
}

function isValidPhone(phone) {
  return /^[\+]?[\d][\d\s\-\(\)]{6,}$/.test(phone);
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