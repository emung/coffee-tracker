// Contents of static/js/coffee_tracker.js
// (Continuing from coffee_tracker_js_v4 with individual delete)

document.addEventListener("DOMContentLoaded", () => {
  // --- Global State Variables ---
  let dailyCoffees = [];
  let coffeeTypeDefinitions = {}; // Will store { name: { cost: X, volume: Y, currency_symbol: Z } }
  let currentUserSettings = { currency_code: "EUR", currency_symbol: "€" }; // Default, will be updated
  let userCoffeePrices = {}; // Stores user's custom prices { "coffeeName": price }

  // Base coffee definitions (global defaults, useful for the custom price form)
  // In a larger app, this might also come from an API, but for now, mirror Python's COFFEE_COSTS
  const BASE_COFFEE_COSTS = {
    Chiaro: 0.55,
    Cosi: 0.49,
    "Buenos Aires": 0.54,
    Vienna: 0.54,
    Roma: 0.5,
    Arpeggio: 0.5,
    Livanto: 0.5,
    "Volluto Decaf": 0.52,
  };

  // --- DOM Element Selections ---
  // Daily Tracker (Advanced View)
  const logDateInput = document.getElementById("log-date");
  const yesterdayBtn = document.getElementById("yesterday-btn");
  const todayBtn = document.getElementById("today-btn");
  const prevDayBtn = document.getElementById("prev-day-btn");
  const nextDayBtn = document.getElementById("next-day-btn");
  const coffeeTypeSelect = document.getElementById("coffee-type-select");
  const addCoffeeBtn = document.getElementById("add-coffee-btn");
  const coffeeListUl = document.getElementById("coffee-list");
  const noCoffeeMsg = document.getElementById("no-coffee-msg");
  const coffeeCountSpan = document.getElementById("coffee-count");
  const totalDailyCostSpan = document.getElementById("total-daily-cost");
  const dailyCostBreakdownListUl = document.getElementById(
    "daily-cost-breakdown-list"
  );
  const noCostBreakdownMsg = document.getElementById("no-cost-breakdown-msg");
  const clearDayBtn = document.getElementById("clear-day-btn");
  const messageBox = document.getElementById("message-box");
  const selectedDateDisplayLog = document.getElementById(
    "selected-date-display-log"
  );
  const selectedDateDisplayCost = document.getElementById(
    "selected-date-display-cost"
  );
  const selectedDateDisplayClear = document.getElementById(
    "selected-date-display-clear"
  );

  // Reports and Fun Facts (Advanced View)
  const reportYearMonthlyInput = document.getElementById("report-year-monthly");
  const reportMonthSelect = document.getElementById("report-month");
  const reportCoffeeTypeMonthlySelect = document.getElementById(
    "report-coffee-type-monthly"
  );
  const generateMonthlyReportBtn = document.getElementById(
    "generate-monthly-report-btn"
  );
  const monthlyReportResultsArea = document.getElementById(
    "monthly-report-results-area"
  );
  const monthlyReportPeriodSpan = document.getElementById(
    "monthly-report-period"
  );
  const monthlyReportTypeFilterSpan = document.getElementById(
    "monthly-report-type-filter"
  );
  const monthlyReportTotalCoffeesSpan = document.getElementById(
    "monthly-report-total-coffees"
  );
  const monthlyReportTotalCostSpan = document.getElementById(
    "monthly-report-total-cost"
  );
  const monthlyReportBreakdownContainer = document.getElementById(
    "monthly-report-breakdown-container"
  );
  const monthlyReportBreakdownList = document.getElementById(
    "monthly-report-breakdown-list"
  );
  const noMonthlyReportDataMsg = document.getElementById(
    "no-monthly-report-data-msg"
  );
  const reportYearYearlyInput = document.getElementById("report-year-yearly");
  const reportCoffeeTypeYearlySelect = document.getElementById(
    "report-coffee-type-yearly"
  );
  const generateYearlyReportBtn = document.getElementById(
    "generate-yearly-report-btn"
  );
  const yearlyReportResultsArea = document.getElementById(
    "yearly-report-results-area"
  );
  const yearlyReportPeriodSpan = document.getElementById(
    "yearly-report-period"
  );
  const yearlyReportTypeFilterSpan = document.getElementById(
    "yearly-report-type-filter"
  );
  const yearlyReportTotalCoffeesSpan = document.getElementById(
    "yearly-report-total-coffees"
  );
  const yearlyReportTotalCostSpan = document.getElementById(
    "yearly-report-total-cost"
  );
  const yearlyReportBreakdownContainer = document.getElementById(
    "yearly-report-breakdown-container"
  );
  const yearlyReportBreakdownList = document.getElementById(
    "yearly-report-breakdown-list"
  );
  const noYearlyReportDataMsg = document.getElementById(
    "no-yearly-report-data-msg"
  );
  const funFactYearInput = document.getElementById("fun-fact-year");
  const showFunFactBtn = document.getElementById("show-fun-fact-btn");
  const funFactDisplayArea = document.getElementById("fun-fact-display-area");
  const funFactYearDisplaySpan = document.getElementById(
    "fun-fact-year-display"
  );
  const funFactVolumeSpan = document.getElementById("fun-fact-volume");
  const noFunFactDataMsg = document.getElementById("no-fun-fact-data-msg");

  // View Toggle and Simple View
  const viewModeToggle = document.getElementById("view-mode-toggle");
  const viewModeLabel = document.getElementById("view-mode-label");
  const mainTitle = document.getElementById("main-title");
  const advancedViewWrapper = document.getElementById("advanced-view-wrapper");
  const simpleViewWrapper = document.getElementById("simple-view-wrapper");
  const logDateInputSimple = document.getElementById("log-date-simple");
  const prevDayBtnSimple = document.getElementById("prev-day-btn-simple");
  const nextDayBtnSimple = document.getElementById("next-day-btn-simple");
  const yesterdayBtnSimple = document.getElementById("yesterday-btn-simple");
  const todayBtnSimple = document.getElementById("today-btn-simple");
  const simpleCoffeeButtonsContainer = document.getElementById(
    "simple-coffee-buttons-container"
  );
  const simpleCoffeeCountSpan = document.getElementById("simple-coffee-count");
  const simpleSelectedDateDisplay = document.getElementById(
    "simple-selected-date-display"
  );

  // User Settings UI
  const currencyCodeInput = document.getElementById("currency-code-input");
  const currencySymbolInput = document.getElementById("currency-symbol-input");
  const saveCurrencySettingsBtn = document.getElementById(
    "save-currency-settings-btn"
  );
  const customPricesContainer = document.getElementById(
    "custom-prices-container"
  );
  const saveCustomPricesBtn = document.getElementById("save-custom-prices-btn");

  const coffeeImageMapping = {
    Arpeggio: "arpeggio.avif",
    "Buenos Aires": "buenos-aires.avif",
    Chiaro: "chiaro.avif",
    Cosi: "cosi.avif",
    Livanto: "livanto.avif",
    Roma: "roma.avif",
    Vienna: "vienna.avif",
    "Volluto Decaf": "volluto-decaf.webp",
  };

  // --- Utility Functions ---
  const getFormattedDate = (dateObj) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj)) {
      console.warn(
        "Invalid date object to getFormattedDate, using today.",
        dateObj
      );
      dateObj = new Date(); // Fallback to today
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const showMessage = (message, type = "success") => {
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.className = `message-box ${type} show`;
    setTimeout(() => {
      messageBox.classList.remove("show");
    }, 3000);
  };

  // --- Initialization ---
  const initializePage = async () => {
    const today = new Date();
    const todayFormatted = getFormattedDate(today);

    logDateInput.value = todayFormatted;
    logDateInputSimple.value = todayFormatted;
    updateSelectedDateDisplays(todayFormatted);
    updateSimpleSelectedDateDisplay(todayFormatted);

    try {
      await loadUserSettings(); // Load currency first
      await loadUserCoffeePrices(); // Then custom prices
      await fetchCoffeeDefinitionsAndPopulate(); // Then all coffee types with correct pricing/symbols

      populateReportSelects(); // Advanced view
      populateSimpleCoffeeButtons(); // Simple view (uses coffeeTypeDefinitions)
      populateCustomPricesForm(); // Settings UI (uses BASE_COFFEE_COSTS and userCoffeePrices)
    } catch (error) {
      console.error("Initialization error:", error);
      showMessage(
        "Error initializing page data. Some features might not work correctly.",
        "error"
      );
    }

    populateMonthYearInputs(); // For reports (advanced view)

    viewModeToggle.checked = false; // Default to Advanced
    toggleViewMode(); // Sets initial visibility and loads data for the active view

    // Event Listeners (rest of them)
    viewModeToggle.addEventListener("change", toggleViewMode);
    // ... (all other event listeners from previous version for date navigation, add, clear, reports, etc.)
    // Date navigation for Advanced View
    logDateInput.addEventListener("change", () => {
      const newDate = logDateInput.value;
      logDateInputSimple.value = newDate;
      updateSelectedDateDisplays(newDate);
      updateSimpleSelectedDateDisplay(newDate);
      loadDailyLog();
      if (viewModeToggle.checked) {
        loadAndDisplaySimpleCoffeeCount();
      }
    });
    const navigateDateAdvanced = (daysToChange) => {
      const currentDate = new Date(logDateInput.value + "T00:00:00Z"); // Use Z for UTC to avoid timezone shifts if date is just YYYY-MM-DD
      currentDate.setUTCDate(currentDate.getUTCDate() + daysToChange);
      logDateInput.value = getFormattedDate(currentDate);
      logDateInput.dispatchEvent(new Event("change"));
    };
    if (prevDayBtn)
      prevDayBtn.addEventListener("click", () => navigateDateAdvanced(-1));
    if (nextDayBtn)
      nextDayBtn.addEventListener("click", () => navigateDateAdvanced(1));
    if (todayBtn)
      todayBtn.addEventListener("click", () => {
        logDateInput.value = getFormattedDate(new Date());
        logDateInput.dispatchEvent(new Event("change"));
      });
    if (yesterdayBtn)
      yesterdayBtn.addEventListener("click", () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        logDateInput.value = getFormattedDate(yesterday);
        logDateInput.dispatchEvent(new Event("change"));
      });

    // Date navigation for Simple View
    logDateInputSimple.addEventListener("change", () => {
      const newDate = logDateInputSimple.value;
      logDateInput.value = newDate;
      updateSimpleSelectedDateDisplay(newDate);
      updateSelectedDateDisplays(newDate);
      loadAndDisplaySimpleCoffeeCount();
      if (!viewModeToggle.checked) {
        loadDailyLog();
      }
    });
    const navigateDateSimple = (daysToChange) => {
      const currentDate = new Date(logDateInputSimple.value + "T00:00:00Z");
      currentDate.setUTCDate(currentDate.getUTCDate() + daysToChange);
      logDateInputSimple.value = getFormattedDate(currentDate);
      logDateInputSimple.dispatchEvent(new Event("change"));
    };
    if (prevDayBtnSimple)
      prevDayBtnSimple.addEventListener("click", () => navigateDateSimple(-1));
    if (nextDayBtnSimple)
      nextDayBtnSimple.addEventListener("click", () => navigateDateSimple(1));
    if (todayBtnSimple)
      todayBtnSimple.addEventListener("click", () => {
        logDateInputSimple.value = getFormattedDate(new Date());
        logDateInputSimple.dispatchEvent(new Event("change"));
      });
    if (yesterdayBtnSimple)
      yesterdayBtnSimple.addEventListener("click", () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        logDateInputSimple.value = getFormattedDate(yesterday);
        logDateInputSimple.dispatchEvent(new Event("change"));
      });

    // Action buttons
    if (addCoffeeBtn) addCoffeeBtn.addEventListener("click", handleAddCoffee);
    if (clearDayBtn) clearDayBtn.addEventListener("click", handleClearDay);

    // Report buttons
    if (generateMonthlyReportBtn)
      generateMonthlyReportBtn.addEventListener(
        "click",
        handleGenerateMonthlyReport
      );
    if (generateYearlyReportBtn)
      generateYearlyReportBtn.addEventListener(
        "click",
        handleGenerateYearlyReport
      );
    if (showFunFactBtn)
      showFunFactBtn.addEventListener("click", handleShowFunFact);

    // Settings Save Buttons
    if (saveCurrencySettingsBtn)
      saveCurrencySettingsBtn.addEventListener(
        "click",
        handleSaveCurrencySettings
      );
    if (saveCustomPricesBtn)
      saveCustomPricesBtn.addEventListener("click", handleSaveCustomPrices);
  };

  // --- User Settings Functions ---
  async function loadUserSettings() {
    try {
      const response = await fetch("/api/user/settings");
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load user settings");
      }
      const settings = await response.json();
      currentUserSettings = settings;
      if (currencyCodeInput)
        currencyCodeInput.value = settings.currency_code || "EUR";
      if (currencySymbolInput)
        currencySymbolInput.value = settings.currency_symbol || "€";
    } catch (error) {
      console.error("Error loading user settings:", error);
      showMessage(error.message, "error");
      // Keep defaults if loading fails, or handle more gracefully
    }
  }

  async function loadUserCoffeePrices() {
    try {
      const response = await fetch("/api/user/coffee_prices");
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load user coffee prices");
      }
      userCoffeePrices = await response.json();
    } catch (error) {
      console.error("Error loading user coffee prices:", error);
      showMessage(error.message, "error");
    }
  }

  function populateCustomPricesForm() {
    if (!customPricesContainer) return;
    customPricesContainer.innerHTML = "";

    if (Object.keys(BASE_COFFEE_COSTS).length === 0) {
      customPricesContainer.innerHTML =
        '<p class="text-gray-500 dark:text-gray-400 italic">Base coffee types not available.</p>';
      return;
    }

    Object.keys(BASE_COFFEE_COSTS)
      .sort()
      .forEach((coffeeName) => {
        const defaultPrice = BASE_COFFEE_COSTS[coffeeName];
        const customPrice = userCoffeePrices[coffeeName];

        const div = document.createElement("div");
        div.className =
          "grid grid-cols-1 sm:grid-cols-[1fr,auto,auto] gap-2 items-center py-1"; // Adjusted grid for better alignment

        const label = document.createElement("label");
        label.htmlFor = `price-${coffeeName.replace(/\s+/g, "-")}`;
        label.className =
          "text-sm font-medium text-gray-700 dark:text-gray-300";
        label.textContent = coffeeName;

        const input = document.createElement("input");
        input.type = "number";
        input.id = `price-${coffeeName.replace(/\s+/g, "-")}`;
        input.className =
          "p-2 border text-gray-900 border-gray-300 rounded-lg shadow-sm dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-32"; // Fixed width for input
        input.step = "0.01";
        input.min = "0";
        input.placeholder = `${defaultPrice.toFixed(2)}`;
        input.value = customPrice !== undefined ? customPrice.toFixed(2) : "";
        input.dataset.coffeeName = coffeeName;

        const currencySpan = document.createElement("span");
        currencySpan.className =
          "text-sm text-gray-500 dark:text-gray-400 currency-symbol-display ml-1";
        currencySpan.textContent = `(${
          currentUserSettings.currency_symbol || "€"
        })`;

        div.appendChild(label);
        div.appendChild(input);
        div.appendChild(currencySpan);
        customPricesContainer.appendChild(div);
      });
  }

  function updateCurrencySymbolsInPriceForm() {
    document.querySelectorAll(".currency-symbol-display").forEach((span) => {
      span.textContent = `(${currentUserSettings.currency_symbol || "€"})`;
    });
    // Update placeholders for default prices if they show currency
    Object.keys(BASE_COFFEE_COSTS).forEach((coffeeName) => {
      const inputField = document.getElementById(
        `price-${coffeeName.replace(/\s+/g, "-")}`
      );
      if (inputField && inputField.placeholder.includes("Default:")) {
        inputField.placeholder = `Default: ${BASE_COFFEE_COSTS[
          coffeeName
        ].toFixed(2)}`;
      }
    });
  }

  async function handleSaveCurrencySettings() {
    if (!currencyCodeInput || !currencySymbolInput) return;
    const code = currencyCodeInput.value.trim().toUpperCase();
    const symbol = currencySymbolInput.value.trim();
    if (!code || !symbol) {
      showMessage("Currency code and symbol are required.", "error");
      return;
    }
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency_code: code, currency_symbol: symbol }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to save currency settings");

      currentUserSettings = {
        currency_code: result.currency_code,
        currency_symbol: result.currency_symbol,
      };
      showMessage(result.message || "Currency settings saved!", "success");

      updateCurrencySymbolsInPriceForm();
      await fetchCoffeeDefinitionsAndPopulate(); // Reload coffee defs with new symbol/prices
      if (!viewModeToggle.checked) renderDailyLogAndCosts(); // Re-render log if advanced view is active
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleSaveCustomPrices() {
    if (!customPricesContainer) return;
    const pricesToSave = {};
    const inputs = customPricesContainer.querySelectorAll(
      'input[type="number"]'
    );
    inputs.forEach((input) => {
      const coffeeName = input.dataset.coffeeName;
      if (input.value.trim() !== "") {
        const price = parseFloat(input.value);
        if (!isNaN(price) && price >= 0) {
          pricesToSave[coffeeName] = price;
        }
      } // If input is empty, it means user wants to use default, so don't send it.
      // The backend will handle this by only inserting/updating provided prices.
      // If you want explicit "revert to default", the backend logic for POST /api/user/coffee_prices
      // would need to handle null/empty strings for price by deleting the custom entry.
      // Current backend logic (simplified) clears all and re-adds.
    });

    try {
      const response = await fetch("/api/user/coffee_prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricesToSave),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to save custom prices");

      userCoffeePrices = pricesToSave; // Update local cache
      showMessage(result.message || "Custom coffee prices saved!", "success");

      await fetchCoffeeDefinitionsAndPopulate();
      if (!viewModeToggle.checked) renderDailyLogAndCosts();
      populateCustomPricesForm(); // Re-populate to reflect saved state (e.g., empty fields for defaults)
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  // --- View Toggling Function ---
  function toggleViewMode() {
    // ... (same as previous version)
    const isSimpleView = viewModeToggle.checked;
    if (isSimpleView) {
      mainTitle.textContent = "Coffee Tracker";
      viewModeLabel.textContent = "Switch to Advanced View";
      advancedViewWrapper.style.display = "none";
      simpleViewWrapper.style.display = "block";
      logDateInputSimple.value = logDateInput.value;
      updateSimpleSelectedDateDisplay(logDateInputSimple.value);
      populateSimpleCoffeeButtons();
      loadAndDisplaySimpleCoffeeCount();
    } else {
      mainTitle.textContent = "Advanced Coffee Tracker";
      viewModeLabel.textContent = "Switch to Simple View";
      advancedViewWrapper.style.display = "block";
      simpleViewWrapper.style.display = "none";
      logDateInput.value = logDateInputSimple.value;
      updateSelectedDateDisplays(logDateInput.value);
      loadDailyLog();
    }
  }

  // --- Data Fetching and Population (Modified) ---
  async function fetchCoffeeDefinitionsAndPopulate() {
    try {
      const response = await fetch("/api/coffee-types");
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || `HTTP error! status: ${response.status}`
        );
      }
      const typesFromServer = await response.json();

      coffeeTypeDefinitions = {};
      if (coffeeTypeSelect) {
        coffeeTypeSelect.innerHTML =
          '<option value="">-- Select Coffee Type --</option>';
      }

      typesFromServer.forEach((type) => {
        coffeeTypeDefinitions[type.name] = {
          cost: type.cost,
          volume: type.volume,
          currency_symbol: type.currency_symbol,
        };
        if (coffeeTypeSelect) {
          const option = document.createElement("option");
          option.value = type.name;
          option.textContent = `${type.name} (${
            type.currency_symbol
          }${type.cost.toFixed(2)})`;
          coffeeTypeSelect.appendChild(option);
        }
      });
      populateSimpleCoffeeButtons(); // Re-populate simple buttons with current prices/symbols
      // populateCustomPricesForm(); // This is called after loadUserCoffeePrices, not needed here again unless base coffees change
    } catch (error) {
      console.error("Error fetching coffee definitions:", error);
      showMessage(error.message || "Could not load coffee types.", "error");
      if (coffeeTypeSelect)
        coffeeTypeSelect.innerHTML =
          '<option value="">Error loading types</option>';
    }
  }

  // ... (populateReportSelects, populateMonthYearInputs - same as before)
  const populateReportSelects = () => {
    if (!reportCoffeeTypeMonthlySelect || !reportCoffeeTypeYearlySelect) return;
    reportCoffeeTypeMonthlySelect.innerHTML =
      '<option value="All">All Types</option>';
    reportCoffeeTypeYearlySelect.innerHTML =
      '<option value="All">All Types</option>';
    // Use BASE_COFFEE_COSTS keys for a stable list of all possible coffee types
    Object.keys(BASE_COFFEE_COSTS)
      .sort()
      .forEach((typeName) => {
        const monthlyOption = document.createElement("option");
        monthlyOption.value = typeName;
        monthlyOption.textContent = typeName;
        reportCoffeeTypeMonthlySelect.appendChild(monthlyOption);
        const yearlyOption = document.createElement("option");
        yearlyOption.value = typeName;
        yearlyOption.textContent = typeName;
        reportCoffeeTypeYearlySelect.appendChild(yearlyOption);
      });
  };
  const populateMonthYearInputs = () => {
    if (
      !reportYearMonthlyInput ||
      !reportMonthSelect ||
      !reportYearYearlyInput ||
      !funFactYearInput
    )
      return;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    reportYearMonthlyInput.value = currentYear;
    reportYearMonthlyInput.min = currentYear - 10;
    reportYearMonthlyInput.max = currentYear + 10;
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    reportMonthSelect.innerHTML = "";
    monthNames.forEach((name, index) => {
      const option = document.createElement("option");
      option.value = index + 1;
      option.textContent = name;
      reportMonthSelect.appendChild(option);
    });
    reportMonthSelect.value = currentMonth;
    reportYearYearlyInput.value = currentYear;
    reportYearYearlyInput.min = currentYear - 10;
    reportYearYearlyInput.max = currentYear + 10;
    funFactYearInput.value = currentYear;
    funFactYearInput.min = currentYear - 10;
    funFactYearInput.max = currentYear + 10;
  };

  // --- Simple View Specific Functions (update populateSimpleCoffeeButtons if needed) ---
  const updateSimpleSelectedDateDisplay = (dateString) => {
    // ... (same as previous version) ...
    if (!simpleSelectedDateDisplay) return;
    if (!dateString) {
      simpleSelectedDateDisplay.textContent = "N/A";
      return;
    }
    try {
      const displayDateObj = new Date(dateString + "T00:00:00Z");
      const displayDate = displayDateObj.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      });
      simpleSelectedDateDisplay.textContent = displayDate;
    } catch (e) {
      simpleSelectedDateDisplay.textContent = "Invalid Date";
      console.error("Error formatting date for simple display:", e);
    }
  };

  const populateSimpleCoffeeButtons = () => {
    // ... (same as previous, uses coffeeTypeDefinitions which now has currency_symbol)
    // No change needed here if it only displays name and volume.
    // If it were to display price, it would use coffeeTypeDefinitions[name].cost and .currency_symbol
    if (!simpleCoffeeButtonsContainer) return;
    simpleCoffeeButtonsContainer.innerHTML = "";
    if (Object.keys(coffeeTypeDefinitions).length > 0) {
      Object.entries(coffeeTypeDefinitions)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([name, def]) => {
          const button = document.createElement("button");
          button.className = `simple-coffee-btn bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white p-2 rounded-lg w-full aspect-square flex flex-col justify-between items-center text-center shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 overflow-hidden`;
          button.dataset.coffeeType = name;
          const imageName = coffeeImageMapping[name];
          let imageHtml = imageName
            ? `<img src="/static/images/${imageName}" alt="${name} coffee" class="w-full h-3/5 object-contain rounded-md mb-1" onerror="this.onerror=null; this.src='https://placehold.co/80x60/E2E8F0/4A5568?text=%E2%98%95%EF%B8%8F'; this.alt='Coffee cup icon';">`
            : `<div class="w-full h-3/5 flex justify-center items-center text-3xl text-gray-300"><span>☕</span></div>`;
          const textHtml = `<div class="h-2/5 flex flex-col justify-center items-center w-full"><span class="block font-semibold leading-tight text-xs">${name}</span><span class="block text-[0.65rem] text-indigo-200 dark:text-indigo-300 mt-0.5">${
            def.volume || "?"
          } ml</span></div>`;
          button.innerHTML = imageHtml + textHtml;
          button.addEventListener("click", () => handleAddCoffeeSimple(name));
          simpleCoffeeButtonsContainer.appendChild(button);
        });
    } else {
      simpleCoffeeButtonsContainer.innerHTML =
        '<p class="col-span-full text-center text-gray-500 dark:text-gray-400 italic">No coffee types defined.</p>';
    }
  };

  const handleAddCoffeeSimple = async (coffeeType) => {
    // ... (same as previous version) ...
    const selectedDate = logDateInputSimple.value;
    if (!coffeeType || !selectedDate) {
      showMessage("Error: Coffee type or date missing.", "error");
      return;
    }
    const now = new Date();
    const coffeeTime = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const newCoffeeData = { type: coffeeType, time: coffeeTime };
    try {
      const response = await fetch(`/api/coffees/${selectedDate}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCoffeeData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to add coffee");
      showMessage(`${coffeeType} added for ${selectedDate}!`, "success");
      await loadAndDisplaySimpleCoffeeCount();
    } catch (error) {
      console.error("Error adding coffee (simple view):", error);
      showMessage(`Error: ${error.message}`, "error");
    }
  };

  const loadAndDisplaySimpleCoffeeCount = async () => {
    // ... (same as previous version) ...
    if (!simpleCoffeeCountSpan || !logDateInputSimple) return;
    let selectedDate = logDateInputSimple.value;
    if (!selectedDate) {
      selectedDate = getFormattedDate(new Date());
    }
    updateSimpleSelectedDateDisplay(selectedDate);
    try {
      const response = await fetch(`/api/coffees/${selectedDate}`);
      const coffeesForDay = await response.json();
      if (!response.ok)
        throw new Error(coffeesForDay.error || "Failed to load count");
      simpleCoffeeCountSpan.textContent = coffeesForDay.length;
    } catch (error) {
      console.error("Error loading coffee count for simple view:", error);
      showMessage(`Error loading count for ${selectedDate}.`, "error");
      simpleCoffeeCountSpan.textContent = "Err";
    }
  };

  // --- Advanced View: Daily Log Functions (Update for currency symbol) ---
  const updateSelectedDateDisplays = (dateString) => {
    // ... (same as previous version) ...
    if (
      !selectedDateDisplayLog ||
      !selectedDateDisplayCost ||
      !selectedDateDisplayClear
    )
      return;
    if (!dateString) {
      dateString = getFormattedDate(new Date());
    }
    try {
      const displayDateObj = new Date(dateString + "T00:00:00Z");
      const displayDate = displayDateObj.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      selectedDateDisplayLog.textContent = displayDate;
      selectedDateDisplayCost.textContent = displayDate;
      selectedDateDisplayClear.textContent = displayDate;
    } catch (e) {
      selectedDateDisplayLog.textContent = "Invalid Date";
      selectedDateDisplayCost.textContent = "Invalid Date";
      selectedDateDisplayClear.textContent = "Invalid Date";
    }
  };

  const loadDailyLog = async () => {
    // ... (same as previous version, but renderDailyLogAndCosts will use new currency)
    if (!logDateInput || !coffeeListUl) return;
    let selectedDate = logDateInput.value;
    if (!selectedDate) {
      selectedDate = getFormattedDate(new Date());
      logDateInput.value = selectedDate;
    }
    updateSelectedDateDisplays(selectedDate);
    try {
      const response = await fetch(`/api/coffees/${selectedDate}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to load log`);
      dailyCoffees = data;
    } catch (error) {
      console.error("Error loading daily log:", error);
      showMessage(
        `Error loading log for ${selectedDate}: ${error.message}`,
        "error"
      );
      dailyCoffees = [];
    }
    renderDailyLogAndCosts();
  };

  const renderDailyLogAndCosts = () => {
    // ... (Update to use currentUserSettings.currency_symbol)
    if (
      !coffeeListUl ||
      !noCoffeeMsg ||
      !coffeeCountSpan ||
      !totalDailyCostSpan ||
      !dailyCostBreakdownListUl ||
      !noCostBreakdownMsg
    )
      return;
    coffeeListUl.innerHTML = "";
    let totalCost = 0;
    const costsByType = {};
    const countsByType = {};
    const currentSymbol = currentUserSettings.currency_symbol || "€";

    if (dailyCoffees.length === 0) {
      noCoffeeMsg.style.display = "block";
      noCostBreakdownMsg.style.display = "block";
      noCostBreakdownMsg.textContent = "No costs to display.";
    } else {
      noCoffeeMsg.style.display = "none";
      noCostBreakdownMsg.style.display = "none";
      dailyCoffees.forEach((coffee) => {
        const listItem = document.createElement("li");
        listItem.className =
          "coffee-item bg-white dark:bg-gray-700 p-2.5 rounded-md shadow-sm border border-gray-200 dark:border-gray-600 flex justify-between items-center text-sm text-gray-800 dark:text-gray-100";
        const textSpan = document.createElement("span");
        textSpan.textContent = `${coffee.type} (at ${coffee.time}) - ${
          coffee.currency_symbol || currentSymbol
        }${parseFloat(coffee.cost).toFixed(2)}`; // Show logged cost with its symbol
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "&times;";
        deleteBtn.className =
          "ml-2 px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500";
        deleteBtn.title = "Delete this entry";
        deleteBtn.dataset.entryId = coffee.id;
        deleteBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          handleDeleteCoffeeEntry(coffee.id, coffee.type);
        });
        listItem.appendChild(textSpan);
        listItem.appendChild(deleteBtn);
        coffeeListUl.appendChild(listItem);

        // For summary, use the cost as logged (it's already in user's currency at that time)
        const costOfThisCoffee = parseFloat(coffee.cost);
        totalCost += costOfThisCoffee;
        costsByType[coffee.type] =
          (costsByType[coffee.type] || 0) + costOfThisCoffee;
        countsByType[coffee.type] = (countsByType[coffee.type] || 0) + 1;
      });
    }
    coffeeCountSpan.textContent = dailyCoffees.length;
    totalDailyCostSpan.textContent = `${currentSymbol}${totalCost.toFixed(2)}`; // Summary uses current symbol
    dailyCostBreakdownListUl.innerHTML = "";
    if (Object.keys(costsByType).length > 0) {
      Object.keys(costsByType)
        .sort()
        .forEach((type) => {
          const count = countsByType[type] || 0;
          const costItem = document.createElement("li");
          costItem.className =
            "cost-item flex justify-between items-center text-sm p-1.5 bg-white dark:bg-gray-700 rounded text-gray-800 dark:text-gray-100";
          costItem.innerHTML = `<span>${type} (x${count}):</span> <span class="font-medium">${currentSymbol}${costsByType[
            type
          ].toFixed(2)}</span>`;
          dailyCostBreakdownListUl.appendChild(costItem);
        });
    } else if (dailyCoffees.length > 0) {
      noCostBreakdownMsg.style.display = "block";
      noCostBreakdownMsg.textContent = "Cost data unavailable for these types.";
    } else {
      noCostBreakdownMsg.style.display = "block";
      noCostBreakdownMsg.textContent = "No costs to display.";
    }
  };

  const handleDeleteCoffeeEntry = async (entryId, coffeeType) => {
    // ... (same as previous version) ...
    if (!entryId) {
      showMessage("Error: Entry ID is missing.", "error");
      return;
    }
    if (confirm(`Are you sure you want to delete this ${coffeeType} entry?`)) {
      try {
        const response = await fetch(`/api/coffee_entry/${entryId}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Failed to delete entry");
        showMessage(
          result.message || `${coffeeType} entry deleted successfully!`,
          "success"
        );
        await loadDailyLog();
        await loadAndDisplaySimpleCoffeeCount();
      } catch (error) {
        console.error("Error deleting coffee entry:", error);
        showMessage(`Error: ${error.message}`, "error");
      }
    }
  };

  const handleAddCoffee = async () => {
    // ... (same as previous, backend now handles price based on user settings)
    if (!coffeeTypeSelect || !logDateInput) return;
    const selectedCoffeeType = coffeeTypeSelect.value;
    const selectedDate = logDateInput.value;
    if (!selectedCoffeeType || !selectedDate) {
      showMessage("Please select coffee type and date.", "error");
      return;
    }
    const now = new Date();
    const coffeeTime = now.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const newCoffeeData = { type: selectedCoffeeType, time: coffeeTime };
    try {
      const response = await fetch(`/api/coffees/${selectedDate}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCoffeeData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to add coffee`);
      showMessage(
        `${selectedCoffeeType} added for ${selectedDate}!`,
        "success"
      );
      await loadDailyLog();
      if (viewModeToggle.checked) {
        await loadAndDisplaySimpleCoffeeCount();
      }
      coffeeTypeSelect.value = "";
    } catch (error) {
      console.error("Error adding coffee:", error);
      showMessage(`Error adding coffee: ${error.message}`, "error");
    }
  };

  const handleClearDay = async () => {
    // ... (same as previous version) ...
    if (!logDateInput) return;
    const selectedDate = logDateInput.value;
    if (!selectedDate || dailyCoffees.length === 0) {
      showMessage("No date selected or nothing to clear.", "error");
      return;
    }
    if (
      confirm(`Are you sure you want to clear all coffees for ${selectedDate}?`)
    ) {
      try {
        const response = await fetch(`/api/coffees/${selectedDate}`, {
          method: "DELETE",
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || `Failed to clear log`);
        showMessage(`Log for ${selectedDate} cleared.`, "success");
        await loadDailyLog();
        if (viewModeToggle.checked) {
          await loadAndDisplaySimpleCoffeeCount();
        }
      } catch (error) {
        console.error("Error clearing log:", error);
        showMessage(`Error clearing log: ${error.message}`, "error");
      }
    }
  };

  // --- Advanced View: Report Functions (Update for currency symbol) ---
  const renderReportBreakdown = (
    listElement,
    breakdownData,
    currencySymbol
  ) => {
    // ... (Update to use passed currencySymbol)
    listElement.innerHTML = "";
    const symbolToUse =
      currencySymbol || currentUserSettings.currency_symbol || "€";
    if (!breakdownData || Object.keys(breakdownData).length === 0) {
      const noBreakdownItem = document.createElement("li");
      noBreakdownItem.textContent = "No specific type data for this selection.";
      noBreakdownItem.className =
        "italic text-gray-500 dark:text-gray-400 text-sm";
      listElement.appendChild(noBreakdownItem);
      return;
    }
    const sortedTypes = Object.keys(breakdownData).sort();
    for (const typeName of sortedTypes) {
      const details = breakdownData[typeName];
      const listItem = document.createElement("li");
      listItem.className =
        "report-breakdown-item flex justify-between items-center text-sm p-1.5 bg-white dark:bg-gray-600/50 rounded shadow-sm text-gray-800 dark:text-gray-100";
      listItem.innerHTML = `<span>${typeName} (x${
        details.count
      }):</span> <span class="font-medium">${symbolToUse}${details.cost.toFixed(
        2
      )}</span>`;
      listElement.appendChild(listItem);
    }
  };

  const handleGenerateMonthlyReport = async () => {
    // ... (Update to use reportData.currency_symbol)
    if (
      !reportYearMonthlyInput ||
      !reportMonthSelect ||
      !reportCoffeeTypeMonthlySelect ||
      !monthlyReportResultsArea ||
      !noMonthlyReportDataMsg
    )
      return;
    const year = reportYearMonthlyInput.value;
    const month = reportMonthSelect.value;
    const typeFilter = reportCoffeeTypeMonthlySelect.value;
    if (!year || !month) {
      showMessage(
        "Please select year and month for the monthly report.",
        "error"
      );
      return;
    }
    try {
      const response = await fetch(
        `/api/reports/monthly?year=${year}&month=${month}&type=${encodeURIComponent(
          typeFilter
        )}`
      );
      const reportData = await response.json();
      if (!response.ok) throw new Error(reportData.error || `Report error`);
      const symbol =
        reportData.currency_symbol ||
        currentUserSettings.currency_symbol ||
        "€";
      monthlyReportPeriodSpan.textContent = `${
        reportMonthSelect.options[reportMonthSelect.selectedIndex].text
      } ${year}`;
      monthlyReportTypeFilterSpan.textContent = reportData.coffee_type_filter;
      monthlyReportTotalCoffeesSpan.textContent = reportData.total_coffees;
      monthlyReportTotalCostSpan.textContent = `${symbol}${reportData.total_cost.toFixed(
        2
      )}`;
      if (reportData.total_coffees === 0) {
        monthlyReportResultsArea.style.display = "block";
        monthlyReportBreakdownContainer.style.display = "none";
        noMonthlyReportDataMsg.style.display = "block";
        noMonthlyReportDataMsg.textContent =
          typeFilter === "All"
            ? "No coffee data found for the selected period."
            : `No '${typeFilter}' coffee data found.`;
      } else {
        monthlyReportResultsArea.style.display = "block";
        noMonthlyReportDataMsg.style.display = "none";
        if (
          typeFilter === "All" &&
          reportData.breakdown_by_type &&
          Object.keys(reportData.breakdown_by_type).length > 0
        ) {
          renderReportBreakdown(
            monthlyReportBreakdownList,
            reportData.breakdown_by_type,
            symbol
          );
          monthlyReportBreakdownContainer.style.display = "block";
        } else {
          monthlyReportBreakdownContainer.style.display = "none";
        }
      }
      showMessage("Monthly report generated!", "success");
    } catch (error) {
      console.error("Error generating monthly report:", error);
      showMessage(`Report Error: ${error.message}`, "error");
      monthlyReportResultsArea.style.display = "none";
      noMonthlyReportDataMsg.style.display = "block";
      noMonthlyReportDataMsg.textContent = `Error generating report.`;
    }
  };

  const handleGenerateYearlyReport = async () => {
    // ... (Update to use reportData.currency_symbol)
    if (
      !reportYearYearlyInput ||
      !reportCoffeeTypeYearlySelect ||
      !yearlyReportResultsArea ||
      !noYearlyReportDataMsg
    )
      return;
    const year = reportYearYearlyInput.value;
    const typeFilter = reportCoffeeTypeYearlySelect.value;
    if (!year) {
      showMessage("Please select a year for the yearly report.", "error");
      return;
    }
    try {
      const response = await fetch(
        `/api/reports/yearly?year=${year}&type=${encodeURIComponent(
          typeFilter
        )}`
      );
      const reportData = await response.json();
      if (!response.ok) throw new Error(reportData.error || `Report error`);
      const symbol =
        reportData.currency_symbol ||
        currentUserSettings.currency_symbol ||
        "€";
      yearlyReportPeriodSpan.textContent = year;
      yearlyReportTypeFilterSpan.textContent = reportData.coffee_type_filter;
      yearlyReportTotalCoffeesSpan.textContent = reportData.total_coffees;
      yearlyReportTotalCostSpan.textContent = `${symbol}${reportData.total_cost.toFixed(
        2
      )}`;
      if (reportData.total_coffees === 0) {
        yearlyReportResultsArea.style.display = "block";
        yearlyReportBreakdownContainer.style.display = "none";
        noYearlyReportDataMsg.style.display = "block";
        noYearlyReportDataMsg.textContent =
          typeFilter === "All"
            ? `No coffee data found for ${year}.`
            : `No '${typeFilter}' coffee data found for ${year}.`;
      } else {
        yearlyReportResultsArea.style.display = "block";
        noYearlyReportDataMsg.style.display = "none";
        if (
          typeFilter === "All" &&
          reportData.breakdown_by_type &&
          Object.keys(reportData.breakdown_by_type).length > 0
        ) {
          renderReportBreakdown(
            yearlyReportBreakdownList,
            reportData.breakdown_by_type,
            symbol
          );
          yearlyReportBreakdownContainer.style.display = "block";
        } else {
          yearlyReportBreakdownContainer.style.display = "none";
        }
      }
      showMessage("Yearly report generated!", "success");
    } catch (error) {
      console.error("Error generating yearly report:", error);
      showMessage(`Report Error: ${error.message}`, "error");
      yearlyReportResultsArea.style.display = "none";
      noYearlyReportDataMsg.style.display = "block";
      noYearlyReportDataMsg.textContent = `Error generating report.`;
    }
  };

  // --- Advanced View: Fun Fact Function (no currency changes needed here) ---
  const handleShowFunFact = async () => {
    // ... (same as previous version)
    if (!funFactYearInput || !funFactDisplayArea || !noFunFactDataMsg) return;
    const year = funFactYearInput.value;
    if (!year) {
      showMessage("Please select a year for the fun fact.", "error");
      noFunFactDataMsg.style.display = "block";
      noFunFactDataMsg.textContent = "Please select a year.";
      funFactDisplayArea.style.display = "none";
      return;
    }
    try {
      const response = await fetch(`/api/fun-facts/yearly-volume?year=${year}`);
      const factData = await response.json();
      if (!response.ok) throw new Error(factData.error || `Fun fact error`);
      funFactYearDisplaySpan.textContent = factData.year;
      funFactVolumeSpan.textContent = factData.total_volume_ml.toLocaleString();
      funFactDisplayArea.style.display = "block";
      noFunFactDataMsg.style.display = "none";
      showMessage("Fun fact loaded!", "success");
    } catch (error) {
      console.error("Error getting fun fact:", error);
      showMessage(`Fun Fact Error: ${error.message}`, "error");
      funFactDisplayArea.style.display = "none";
      noFunFactDataMsg.style.display = "block";
      noFunFactDataMsg.textContent = "Could not load fun fact.";
    }
  };

  // --- Start the page ---
  initializePage();
});
