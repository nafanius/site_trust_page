/**
 * VisaPlace UI Example - Main JavaScript
 * All interactive components: mobile menu, dropdowns, tabs, accordion, modal, form validation
 */

document.addEventListener('DOMContentLoaded', () => {
  // initModal();
  setupDynamicFormObserver();
});
// Важно для bfcache (загрузка из кэша)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    const form = document.getElementById('contact-form');
    if (form) {
      form.dataset.initialized = 'false';
      if (form._submitHandler) {
        form.removeEventListener('submit', form._submitHandler);
        delete form._submitHandler;
      }
    }
    setupDynamicFormObserver();
  }
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

let formObserverSet = false;

function setupDynamicFormObserver() {
  const form = document.getElementById('contact-form');
  if (form && form.dataset.initialized !== 'true') {
    initFormValidation();
    initModal();
  }

  if (formObserverSet) return;
  formObserverSet = true;

  const observer = new MutationObserver(() => {
    const currentForm = document.getElementById('contact-form');
    if (currentForm && currentForm.dataset.initialized !== 'true') {
      initFormValidation();
      initModal();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
/* ============================================
   FORM VALIDATION + SUBMISSION
   ============================================ */
function initFormValidation() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  // Защита от повторного вызова (важно при кэше)
  if (form.dataset.initialized === 'true') return;
  form.dataset.initialized = 'true';

  const submitText = document.getElementById('submit-text');
  const submitSpinner = document.getElementById('submit-spinner');
  const successMsg = document.getElementById('form-success');

  if (form._submitHandler) {
    form.removeEventListener('submit', form._submitHandler);
  }

  const submitHandler = async (e) => {
    e.preventDefault();

    clearFormErrors(form);

    let isValid = true;
    const requiredFields = ['name', 'message', 'phone'];

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

    if (submitText) submitText.textContent = 'SENDING...';
    if (submitSpinner) submitSpinner.classList.remove('hidden');
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    await sendForm();

    form.reset();
    if (submitText) submitText.textContent = 'REQUEST CONSULTATION';
    if (submitSpinner) submitSpinner.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = false;
    if (successMsg) successMsg.classList.remove('hidden');

    setTimeout(() => {
      if (successMsg) successMsg.classList.add('hidden');
      showModal();
    }, 1200);
  };

  form._submitHandler = submitHandler;
  form.addEventListener('submit', submitHandler);

  // blur-валидация (дубликаты не критичны)
  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('blur', () => {
      if (field.hasAttribute('required') || field.id === 'phone') {
        validateSingleField(field);
      }
    });
  });
} 


function getErrorMessage(fieldId) {
  const messages = {
    name: 'Please enter your name.',
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
  } else if (field.id === 'phone' && field.value && !isValidPhone(field.value)) {
    valid = false;
    msg = 'Please enter a valid phone.';
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


async function sendForm() {
  const form = document.querySelector("#contact-form");
  const FORM_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_URL)
    ? CONFIG.API_URL
    : '';



  const data = {
    name: form.name.value,
    phone: form.phone.value,
    message: form.message.value
  };

  await fetch(FORM_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(data)
  });
  // await fetch(FORM_URL, {
  //   method: "POST",
  //   mode: "no-cors",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(data)
  // });
  // await fetch(
  //   FORM_URL,
  //   {
  //     method: "POST",
  //     body: JSON.stringify(data)
  //   }
  // );

  // form.reset();


}