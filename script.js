const {
  consentFormId,
  apiUrl,
  submitApiUrl,
  showButtons,
  showLanguageDropdown,
  enableCheckboxes,
  enableRadioButtons,
  enableDropdowns
} = window.consentWidgetConfig;

let createConsentRequestList = [];
let dataPrincipalIdList = [];
let clickEvent = function () {};

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
      document.getElementById("consent-root").innerText = "Consent data not found.";
      return;
    }

    renderConsent(data, data.languages?.[0]?.toLowerCase() || "en");
  } catch (e) {
    document.getElementById("consent-root").innerText = "Error loading consent.";
  }
}

// =============================================================
// Data Principal
// =============================================================
function setDataPrincipalIdList() {
  dataPrincipalIdList = [];
  const email = document.getElementById('email').value; // Placeholder; can be updated to fetch from input if needed
  let obj = {
    key: 'email',
    value: email
  };
  dataPrincipalIdList.push(obj);
}

// =============================================================
// Toast
// =============================================================
function showToast(message, type) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.backgroundColor = type === "success" ? "#4CAF50" : "#f44336";
  toast.className = "show";
  setTimeout(() => {
    toast.className = "";
    toast.style.visibility = "hidden";
  }, 3000);
}

// =============================================================
// Form Value Collection
// =============================================================
function getFormValues(selectedLang) {
  setDataPrincipalIdList();
  createConsentRequestList = [];

  const consentDiv = document.getElementById("consent-root");
  const checkboxes = consentDiv.querySelectorAll('input[type="checkbox"]:checked');
  const radioButtons = consentDiv.querySelectorAll('input[type="radio"]:checked');
  const dropdowns = consentDiv.querySelectorAll("select");

  const pushConsent = (permissionId, label) => {
    let existing = createConsentRequestList.find(req => req.permissionId === permissionId);
    if (existing) {
      existing.optedFor.push(label);
    } else {
      createConsentRequestList.push({
        dataPrincipalIdList,
        permissionId,
        consentReceivedType: "FORMS",
        optedFor: [label],
        consentLanguage: selectedLang
      });
    }
  };

  checkboxes.forEach(checkbox => {
    if (!enableCheckboxes) return;
    const label = checkbox.closest("label") ? checkbox.closest("label").textContent.trim() : checkbox.value;
    pushConsent(checkbox.name, label);
  });

  radioButtons.forEach(radio => {
    if (!enableRadioButtons) return;
    const label = radio.closest("label") ? radio.closest("label").textContent.trim() : radio.value;
    pushConsent(radio.name, label);
  });

  dropdowns.forEach(drop => {
    if (!enableDropdowns) return;
    const selected = drop.options[drop.selectedIndex];
    pushConsent(drop.name, selected.textContent);
  });

  // Include empty ones
  document.querySelectorAll("#consent-root [name]").forEach(el => {
    if (!createConsentRequestList.some(req => req.permissionId === el.name)) {
      createConsentRequestList.push({
        dataPrincipalIdList,
        permissionId: el.name,
        consentReceivedType: "FORMS",
        optedFor: [],
        consentLanguage: selectedLang
      });
    }
  });

  console.log("Final Consent Payload:", createConsentRequestList);
  sendConsent();
}

// =============================================================
// Send Consent
// =============================================================
async function sendConsent() {
  try {
    const res = await fetch(submitApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ createConsentRequestDtoWrapper: createConsentRequestList })
    });
    const data = await res.json();

    if (data.response && data.statusCode === 200) {
      showToast("Consent saved successfully!", "success");
    } else {
      showToast(data.statusMessage || "Something went wrong.", "error");
    }
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    console.error(err);
    showToast("Failed to submit. Please check your network connection.", "error");
    setTimeout(() => window.location.reload(), 1500);
  }
}

// =============================================================
// Render Consent
// =============================================================
function renderConsent(data, selectedLang) {
  const root = document.getElementById("consent-root");
  root.innerHTML = "";
  const branding = data.branding || {};

  // Normalize permissions
  let permissions = [];
  if (Array.isArray(data.consentForm)) {
    permissions = data.consentForm.flatMap(cf => cf.permissions || []);
  } else if (Array.isArray(data.permissions)) {
    permissions = data.permissions;
  }

  // --- HEADER: logo + company name alignment preserved ---
  const logoArea = document.getElementById("logo-area");
  logoArea.innerHTML = "";
  logoArea.classList.remove("left", "center", "right");

  const align = (branding.logoAlignment || "left").toLowerCase();
  logoArea.classList.add(["left", "center", "right"].includes(align) ? align : "left");

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";

  if (align === "center") {
    wrapper.style.flexDirection = "column";
  } else if (align === "right") {
    wrapper.style.flexDirection = "row-reverse"; // IMPORTANT: row-reverse makes name appear first visually
  } else {
    wrapper.style.flexDirection = "row";
  }

  wrapper.style.alignItems = "center";
  wrapper.style.gap = "5px";


  if (branding.logo) {
    const img = document.createElement("img");
    img.src = branding.logo;
    img.alt = branding.companyName || "Logo";
    img.className = "branding-logo";
    img.onerror = () => img.classList.add("hidden");
    wrapper.appendChild(img);
  }

  if (branding.companyName) {
    const nameDiv = document.createElement("div");
    nameDiv.innerText = branding.companyName;
    nameDiv.classList.add("company-name");

    // Dynamic font styling from API
    if (branding.headerFontColor) nameDiv.style.color = branding.headerFontColor;
    if (branding.headerFontFamily) nameDiv.style.fontFamily = branding.headerFontFamily;
    if (branding.headerFontSize) {
      const sizeMap = { small: "14px", medium: "16px", large: "20px" };
      const sz = String(branding.headerFontSize).toLowerCase();
      nameDiv.style.fontSize = sizeMap[sz] || branding.headerFontSize;
    }
    if (branding.headerFontStyle) {
      const styleLower = String(branding.headerFontStyle).toLowerCase();
      if (styleLower.includes("italic")) nameDiv.style.fontStyle = "italic";
      if (styleLower.includes("bold")) nameDiv.style.fontWeight = "bold";
      if (styleLower.includes("normal")) {
        nameDiv.style.fontStyle = "normal";
        nameDiv.style.fontWeight = "400";
      }
    }

    // Subtitle (optional)
    if (branding.companySubtitle) {
      const subEl = document.createElement("div");
      subEl.className = "company-subtitle";
      subEl.innerText = branding.companySubtitle;
      if (branding.subtitleFontSize) subEl.style.fontSize = branding.subtitleFontSize;
      if (branding.subtitleFontColor) subEl.style.color = branding.subtitleFontColor;
      nameDiv.appendChild(subEl);
    }

    wrapper.appendChild(nameDiv);
  }

  logoArea.appendChild(wrapper);

  // --- LANGUAGE DROPDOWN ---
  const langWrapper = document.getElementById("language-wrapper");
  const langSelect = document.getElementById("langSelect");
  if (showLanguageDropdown && data.languages?.length >= 1) {
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

  // --- PERMISSIONS ---
  if (!permissions.length) {
    root.innerHTML = "<p>No consent items found.</p>";
    return;
  }
  permissions.forEach(perm => {
    const block = document.createElement("div");
    block.className = "permission-block";

    // Get HTML text from API (with inline styles)
    const tr = perm.permissionTranslation?.find(pt => pt.language.toLowerCase() === selectedLang);
    const htmlString = (tr?.text || perm.text || "").trim();

    // Parse the HTML safely
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlString;

    const firstElement = tempDiv.firstElementChild;
    let dynamicEl;

    if (firstElement) {
      // Create same tag type as in API (<h1>, <p>, etc.)
      dynamicEl = document.createElement(firstElement.tagName.toLowerCase());
      dynamicEl.innerHTML = firstElement.innerHTML;

      // Copy inline styles dynamically
      if (firstElement.getAttribute("style")) {
        dynamicEl.setAttribute("style", firstElement.getAttribute("style"));
      }

      // If element is a heading (h1-h6) and has no explicit font-weight, remove bold
      if (/^h[1-6]$/i.test(firstElement.tagName) && !/font-weight/i.test(firstElement.getAttribute("style") || "")) {
        dynamicEl.style.fontWeight = "normal";
      }
        dynamicEl.style.margin = "0";  // <-- this removes extra spacing


    } else {
      // fallback: just plain paragraph if only text present
      dynamicEl = document.createElement("p");
      dynamicEl.textContent = htmlString.replace(/<[^>]*>/g, "").trim();
    }
    

    // Add data attribute for translation
    dynamicEl.setAttribute("data-translate-text", perm.id);

    // Add mandatory star if required
    if (perm.mandatory) {
      dynamicEl.innerHTML += ' <span class="mandatory">*</span>';
    }

    // Append final element
    block.appendChild(dynamicEl);

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



  // --- BUTTONS & FOOTER ALIGNMENT ---
  const cancelBtn = document.getElementById("cancelBtn");
  const submitBtn = document.getElementById("submitBtn");
  const selectedLanguage = selectedLang?.toLowerCase();

  const translatedBranding = branding.brandingTranslation?.find(
    b => b.language?.toLowerCase() === selectedLanguage
  );

  const submitLabel =
    translatedBranding?.primaryButtonLabel || branding.primaryButtonLabel || "Submit";
  const cancelLabel =
    translatedBranding?.secondaryButtonLabel || branding.secondaryButtonLabel || "Cancel";

  if (showButtons) {
    cancelBtn.style.display = "block";
    cancelBtn.innerText = cancelLabel;

    submitBtn.style.display = "block";
    submitBtn.innerText = submitLabel;

    if (branding.primaryButtonbgColor) submitBtn.style.backgroundColor = branding.primaryButtonbgColor;
    if (branding.primaryFontColor) submitBtn.style.color = branding.primaryFontColor;
    if (branding.primaryButtonborderColor) submitBtn.style.borderColor = branding.primaryButtonborderColor;
    if (branding.primaryFontSize) submitBtn.style.fontSize = branding.primaryFontSize;

    if (branding.secondaryButtonBgColor) cancelBtn.style.backgroundColor = branding.secondaryButtonBgColor;
    if (branding.secondaryFontColor) cancelBtn.style.color = branding.secondaryFontColor;
    if (branding.secondaryButtonBorderColor) cancelBtn.style.borderColor = branding.secondaryButtonBorderColor;
    if (branding.secondaryFontSize) cancelBtn.style.fontSize = branding.secondaryFontSize;

    const buttonGroup = document.getElementById("button-group");
    buttonGroup.classList.remove("left", "center", "right");
    const footerAlign = branding.footerAlignment || "left";
    buttonGroup.classList.add(footerAlign.toLowerCase());
  } else {
    cancelBtn.style.display = "none";
    submitBtn.style.display = "none";
  }

  // --- VALIDATION ---
  submitBtn.removeEventListener("click", clickEvent);
  clickEvent = e => {
    e.preventDefault();
    document.querySelectorAll(".error-message").forEach(el => el.remove());
    document.querySelectorAll(".error-border").forEach(el => el.classList.remove("error-border"));

    let hasError = false;
    const permissionTracker = {};

    document.querySelectorAll("#consent-root [name]").forEach(el => {
      const name = el.name;
      const value =
        el.type === "checkbox" || el.type === "radio"
          ? el.checked
            ? el.value
            : null
          : el.value.trim();

      if (!permissionTracker[name]) permissionTracker[name] = [];
      if (value) permissionTracker[name].push(value);
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

    if (!hasError) getFormValues(selectedLang);
  };
  submitBtn.addEventListener("click", clickEvent);
}

fetchConsentData();
