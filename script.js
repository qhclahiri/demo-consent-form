const { consentFormId, apiUrl, submitApiUrl, showButtons, showLanguageDropdown, enableCheckboxes, enableRadioButtons, enableDropdowns } = window.consentWidgetConfig;

let createConsentRequestList = [];
let dataPrincipalIdList = [];
let clickEvent = function(){};
async function fetchConsentData() {
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consentFormId })
    });
    const result = await res.json();
    const data = result?.[0] || result?.response?.[0];
    if (!data) {
      document.getElementById('consent-root').innerText = 'Consent data not found.';
      return;
    }
    renderConsent(data, data.languages?.[0]?.toLowerCase() || 'en');
  } catch (e) {
    document.getElementById('consent-root').innerText = 'Error loading consent.';
  }
}
  

function setDataPrincipalIdList() {
  dataPrincipalIdList = [];
  const email = document.getElementById('email').value; // Placeholder; can be updated to fetch from input if needed
  let obj = {
    key: 'email',
    value: email
  };
  dataPrincipalIdList.push(obj);
}

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
  toast.className = 'show';
  setTimeout(() => {
    toast.className = '';
    toast.style.visibility = 'hidden';
  }, 3000);
}

function getFormValues(selectedLang) {
  setDataPrincipalIdList();
  createConsentRequestList = [];
  const consentDiv = document.getElementById('consent-root');
  const checkboxes = consentDiv.querySelectorAll('input[type="checkbox"]:checked');
  const radioButtons = consentDiv.querySelectorAll('input[type="radio"]:checked');
  const dropdowns = consentDiv.querySelectorAll('select');

  checkboxes.forEach(checkbox => {
    if (!enableCheckboxes) return;
    let label = checkbox.closest('label') ? checkbox.closest('label').textContent.trim() : checkbox.value;
    let permissionId = checkbox.name;
    let permissionFound = false;
    let obj = createConsentRequestList.find((o, i) => {
      if (o.permissionId === permissionId) {
        createConsentRequestList[i].optedFor.push(label);
        permissionFound = true;
        return true;
      }
    });

    if (!permissionFound) {
      let request = {
        dataPrincipalIdList: dataPrincipalIdList,
        permissionId: permissionId,
        consentReceivedType: 'FORMS',
        optedFor: [label],
        consentLanguage: selectedLang
      };
      createConsentRequestList.push(request);
    }
  });

  radioButtons.forEach(radioButton => {
    if (!enableRadioButtons) return;
    let label = radioButton.closest('label') ? radioButton.closest('label').textContent.trim() : radioButton.value;
    let permissionId = radioButton.name;
    let permissionFound = false;
    let obj = createConsentRequestList.find((o, i) => {
      if (o.permissionId === permissionId) {
        createConsentRequestList[i].optedFor.push(label);
        permissionFound = true;
        return true;
      }
    });

    if (!permissionFound) {
      let request = {
        dataPrincipalIdList: dataPrincipalIdList,
        permissionId: permissionId,
        consentReceivedType: 'FORMS',
        optedFor: [label],
        consentLanguage: selectedLang
      };
      createConsentRequestList.push(request);
    }
  });

  dropdowns.forEach(dropdown => {
    if (!enableDropdowns) return;
    let selectedOption = dropdown.options[dropdown.selectedIndex];
    let permissionId = dropdown.name;
    let permissionFound = false;
    let obj = createConsentRequestList.find((o, i) => {
      if (o.permissionId === permissionId) {
        createConsentRequestList[i].optedFor.push(selectedOption.textContent);
        permissionFound = true;
        return true;
      }
    });

    if (!permissionFound) {
      let request = {
        dataPrincipalIdList: dataPrincipalIdList,
        permissionId: permissionId,
        consentReceivedType: 'FORMS',
        optedFor: [selectedOption.textContent],
        consentLanguage: selectedLang
      };
      createConsentRequestList.push(request);
    }
  });

  const consentElements = document.querySelectorAll('#consent-root [name]');
  consentElements.forEach(element => {
    const name = element.getAttribute('name');
    let permissionFound = false;
    let obj = createConsentRequestList.find((o, i) => {
      if (o.permissionId === name) {
        permissionFound = true;
        return true;
      }
    });

    if (!permissionFound) {
      let request = {
        dataPrincipalIdList: dataPrincipalIdList,
        permissionId: name,
        consentReceivedType: 'FORMS',
        optedFor: [],
        consentLanguage: selectedLang
      };
      createConsentRequestList.push(request);
    }
  });

  console.log("Final Consent Payload:", createConsentRequestList);
  sendConsent();
}

async function sendConsent() {
  const errorDiv = document.getElementById('error-message');
  try {
    const res = await fetch(submitApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ createConsentRequestDtoWrapper: createConsentRequestList })
    });
    const data = await res.json();
    if (data.response && data.statusCode === 200) {
      showToast('Consent saved successfully!', 'success');
    } else {
      showToast(data.statusMessage || 'Something went wrong.', 'error');
    }
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    console.error(err);
    showToast('Failed to submit. Please check your network connection.', 'error');
    setTimeout(() => window.location.reload(), 1500);
  }
}

function renderConsent(data, selectedLang) {
  const root = document.getElementById("consent-root");
  root.innerHTML = "";
  const errorDiv = document.getElementById("error-message");
  errorDiv.innerHTML = "";

  const branding = data.branding || {};
  const permissions = data.permissions || [];

  const logoArea = document.getElementById("logo-area");
  logoArea.innerHTML = "";
  if (branding.logo) {
    const img = document.createElement("img");
    img.src = branding.logo;
    img.alt = "Logo";
    logoArea.appendChild(img);
  }
  if (branding.companyName) {
    const name = document.createElement("div");
    name.innerText = branding.companyName;
    logoArea.appendChild(name);
  }

  const langWrapper = document.getElementById("language-wrapper");
  const langSelect = document.getElementById("langSelect");
  if (showLanguageDropdown && branding.languageDropdownConfig?.visible !== false && data.languages?.length > 1) {
    langWrapper.style.display = "block";
    langSelect.innerHTML = "";
    data.languages.forEach(lang => {
      const opt = document.createElement("option");
      opt.value = lang.toLowerCase();
      opt.text = lang;
      if (opt.value === selectedLang) opt.selected = true;
      langSelect.appendChild(opt);
    });
    langSelect.onchange = () => renderConsent(data, langSelect.value);
  } else {
    langWrapper.style.display = "none";
  }

  permissions.forEach(perm => {
    const block = document.createElement("div");
    block.className = "permission-block";

    const tr = perm.permissionTranslation?.find(pt => pt.language.toLowerCase() === selectedLang);
    const cleanText = (tr?.text || perm.text || "").replace(/<[^>]*>/g, "").trim();
    const p = document.createElement("p");
    p.innerText = cleanText;
    if (perm.mandatory) {
      p.innerHTML += ' <span class="mandatory">*</span>';
    }
    p.setAttribute('data-translate-text', perm.id);
    block.appendChild(p);

    const options = tr?.options || perm.options || [];

    if (perm.elementType === 'CHECKBOX' && enableCheckboxes) {
      options.forEach(opt => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = perm.id;
        input.value = opt;
        label.appendChild(input);
        label.append(" " + opt);
        block.appendChild(label);
      });
    }

    if (perm.elementType === 'RADIOBUTTON' && enableRadioButtons) {
      options.forEach(opt => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = perm.id;
        input.value = opt;
        label.appendChild(input);
        label.append(" " + opt);
        block.appendChild(label);
      });
    }

    if (perm.elementType === 'DROPDOWN' && enableDropdowns) {
      const select = document.createElement("select");
      select.name = perm.id;
      options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.text = opt;
        select.appendChild(option);
      });
      block.appendChild(select);
    }

    root.appendChild(block);
  });

  const cancelBtn = document.getElementById("cancelBtn");
  const submitBtn = document.getElementById("submitBtn");
  const tr = branding.brandingTranslation?.find(b => b.language?.toLowerCase() === selectedLang);

  if (showButtons) {
    cancelBtn.style.display = "block";
    cancelBtn.innerText = tr?.secondaryButtonLabel || branding.secondaryButtonLabel || "Cancel";
    submitBtn.style.display = "block";
    submitBtn.innerText = tr?.primaryButtonLabel || branding.primaryButtonLabel || "Submit";
  //css primary 
  if(branding.primaryButtonbgColor)
    submitBtn.style.backgroundColor= branding.primaryButtonbgColor

  if(branding.primaryFontColor)
    submitBtn.style.color= branding.primaryFontColor

  if(branding.primaryButtonborderColor)
    submitBtn.style.borderColor= branding.primaryButtonborderColor

  //css secondary
  if( branding.secondaryButtonBgColor)
    cancelBtn.style.backgroundColor= branding.secondaryButtonBgColor

  if( branding.secondaryFontColor)
    cancelBtn.style.color= branding.secondaryFontColor

  if(branding.secondaryButtonBorderColor)
    submitBtn.style.borderColor= branding.secondaryButtonBorderColor
  } else {
    cancelBtn.style.display = "none";
    submitBtn.style.display = "none";
  }
 submitBtn.removeEventListener("click",clickEvent);
  clickEvent = function(e){
    e.preventDefault();
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.error-border').forEach(el => el.classList.remove('error-border'));

    let hasError = false;
    const permissionTracker = {};

    const elements = document.querySelectorAll('#consent-root [name]');
    elements.forEach(el => {
      const name = el.name;
      const value = (el.type === "checkbox" || el.type === "radio")
        ? el.checked ? el.value : null
        : el.value.trim();

      if (!permissionTracker[name]) {
        permissionTracker[name] = [];
      }
      if (value !== null && value !== undefined) {
        permissionTracker[name].push(value);
      }
    });

    permissions.forEach(perm => {
      if (perm.mandatory) {
        const selectedValues = permissionTracker[perm.id] || [];
        if (selectedValues.length === 0) {
          hasError = true;
          const block = Array.from(document.querySelectorAll(".permission-block"))
            .find(div => {
              const p = div.querySelector('p[data-translate-text]');
              return p && p.getAttribute('data-translate-text') === perm.id;
            });

          if (block) {
            const error = document.createElement('div');
            error.className = 'error-message';
            error.textContent = 'This field is required.';
            block.appendChild(error);
            const inputs = block.querySelectorAll('input, select');
            inputs.forEach(input => input.classList.add('error-border'));
          }
        }
      }
    });

    if (!hasError) {
      getFormValues(selectedLang);
    }
  }
  submitBtn.addEventListener("click", clickEvent);
}

fetchConsentData();
