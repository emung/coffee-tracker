// Contents of static/js/coffee_tracker.js
// (Continuing from coffee_tracker_js_v3 with image buttons)

document.addEventListener("DOMContentLoaded", () => {
  // ... (all your existing DOM Element selections and variable declarations)
  // (Keep the coffeeImageMapping and all other setup from previous versions)

  // DOM Elements - Daily Tracker (Advanced View)
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

  // DOM Elements - Reports and Fun Facts (Advanced View)
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

  // DOM Elements - View Toggle and Simple View
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

  let dailyCoffees = [];
  let coffeeTypeDefinitions = {};

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
      console.error("Invalid date object passed to getFormattedDate:", dateObj);
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(today.getDate()).padStart(2, "0")}`;
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const showMessage = (message, type = "success") => {
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
      await fetchCoffeeDefinitions();
      populateReportSelects();
      populateSimpleCoffeeButtons();
    } catch (error) {
      console.error("Initialization error:", error);
      showMessage("Error initializing page data.", "error");
    }

    populateMonthYearInputs();

    viewModeToggle.checked = false;
    toggleViewMode();

    if (!viewModeToggle.checked) {
      await loadDailyLog();
    } else {
      await loadAndDisplaySimpleCoffeeCount();
    }

    // Event Listeners
    viewModeToggle.addEventListener("change", toggleViewMode);

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
      const currentDate = new Date(logDateInput.value + "T00:00:00");
      currentDate.setDate(currentDate.getDate() + daysToChange);
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
      const currentDate = new Date(logDateInputSimple.value + "T00:00:00");
      currentDate.setDate(currentDate.getDate() + daysToChange);
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

    if (addCoffeeBtn) addCoffeeBtn.addEventListener("click", handleAddCoffee);
    if (clearDayBtn) clearDayBtn.addEventListener("click", handleClearDay);
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
  };

  // --- View Toggling Function ---
  function toggleViewMode() {
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

  // --- Data Fetching and Population ---
  const fetchCoffeeDefinitions = async () => {
    try {
      const response = await fetch("/api/coffee-types");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const types = await response.json();

      coffeeTypeDefinitions = {};
      if (coffeeTypeSelect) {
        coffeeTypeSelect.innerHTML =
          '<option value="">-- Select Coffee Type --</option>';
      }

      types.forEach((type) => {
        coffeeTypeDefinitions[type.name] = {
          cost: type.cost,
          volume: type.volume,
        };
        if (coffeeTypeSelect) {
          const option = document.createElement("option");
          option.value = type.name;
          option.textContent = `${type.name} (€${type.cost.toFixed(2)})`;
          coffeeTypeSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error("Error fetching coffee definitions:", error);
      showMessage("Could not load coffee types.", "error");
      if (coffeeTypeSelect)
        coffeeTypeSelect.innerHTML =
          '<option value="">Error loading types</option>';
      throw error;
    }
  };

  const populateReportSelects = () => {
    if (!reportCoffeeTypeMonthlySelect || !reportCoffeeTypeYearlySelect) return;

    reportCoffeeTypeMonthlySelect.innerHTML =
      '<option value="All">All Types</option>';
    reportCoffeeTypeYearlySelect.innerHTML =
      '<option value="All">All Types</option>';

    if (Object.keys(coffeeTypeDefinitions).length > 0) {
      Object.keys(coffeeTypeDefinitions)
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
    }
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
    reportYearMonthlyInput.max = currentYear + 5;

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
    reportYearYearlyInput.max = currentYear + 5;

    funFactYearInput.value = currentYear;
    funFactYearInput.min = currentYear - 10;
    funFactYearInput.max = currentYear + 5;
  };

  // --- Simple View Specific Functions ---
  const updateSimpleSelectedDateDisplay = (dateString) => {
    if (!simpleSelectedDateDisplay) return;
    if (!dateString) {
      simpleSelectedDateDisplay.textContent = "N/A";
      return;
    }
    try {
      const displayDateObj = new Date(dateString + "T00:00:00");
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
    if (!simpleCoffeeButtonsContainer) return;
    simpleCoffeeButtonsContainer.innerHTML = "";

    if (Object.keys(coffeeTypeDefinitions).length > 0) {
      Object.entries(coffeeTypeDefinitions)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([name, def]) => {
          const button = document.createElement("button");
          button.className = `
                        simple-coffee-btn 
                        bg-indigo-500 hover:bg-indigo-600 
                        dark:bg-indigo-600 dark:hover:bg-indigo-700 
                        text-white 
                        p-2 rounded-lg w-full aspect-square 
                        flex flex-col justify-between items-center 
                        text-center shadow-md transition-colors 
                        focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 
                        overflow-hidden`;
          button.dataset.coffeeType = name;

          const imageName = coffeeImageMapping[name];
          let imageHtml = "";
          if (imageName) {
            const imageSrc = `/static/images/${imageName}`;
            imageHtml = `
                            <img src="${imageSrc}" alt="${name} coffee" 
                                 class="w-full h-3/5 object-contain rounded-md mb-1" 
                                 onerror="this.onerror=null; this.src='https://placehold.co/80x60/E2E8F0/4A5568?text=%E2%98%95%EF%B8%8F'; this.alt='Coffee cup icon';">
                        `;
          } else {
            imageHtml = `
                            <div class="w-full h-3/5 flex justify-center items-center text-3xl text-gray-300">
                                <span>☕</span>
                            </div>`;
          }

          const textHtml = `
                        <div class="h-2/5 flex flex-col justify-center items-center w-full">
                            <span class="block font-semibold leading-tight text-xs">${name}</span>
                            <span class="block text-[0.65rem] text-indigo-200 dark:text-indigo-300 mt-0.5">${
                              def.volume || "?"
                            } ml</span>
                        </div>
                    `;

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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to add coffee: ${response.status}. ${
            errorData.error || "Server error"
          }`
        );
      }
      showMessage(`${coffeeType} added for ${selectedDate}!`, "success");
      await loadAndDisplaySimpleCoffeeCount();
    } catch (error) {
      console.error("Error adding coffee (simple view):", error);
      showMessage(`Error: ${error.message}`, "error");
    }
  };

  const loadAndDisplaySimpleCoffeeCount = async () => {
    if (!simpleCoffeeCountSpan || !logDateInputSimple) return;
    let selectedDate = logDateInputSimple.value;
    if (!selectedDate) {
      selectedDate = getFormattedDate(new Date());
    }
    updateSimpleSelectedDateDisplay(selectedDate);

    try {
      const response = await fetch(`/api/coffees/${selectedDate}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to load count: ${response.status}. ${errorData.error || ""}`
        );
      }
      const coffeesForDay = await response.json();
      simpleCoffeeCountSpan.textContent = coffeesForDay.length;
    } catch (error) {
      console.error("Error loading coffee count for simple view:", error);
      showMessage(`Error loading count for ${selectedDate}.`, "error");
      simpleCoffeeCountSpan.textContent = "Err";
    }
  };

  // --- Advanced View: Daily Log Functions ---
  const updateSelectedDateDisplays = (dateString) => {
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
      const displayDateObj = new Date(dateString + "T00:00:00");
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
    if (!logDateInput || !coffeeListUl) return;
    let selectedDate = logDateInput.value;
    if (!selectedDate) {
      selectedDate = getFormattedDate(new Date());
      logDateInput.value = selectedDate;
    }
    updateSelectedDateDisplays(selectedDate);

    try {
      const response = await fetch(`/api/coffees/${selectedDate}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to load log: ${response.status}. ${errorData.error || ""}`
        );
      }
      dailyCoffees = await response.json(); // This now includes the 'id' for each entry
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

  /**
   * Renders the list of coffee entries for the day in the Advanced View,
   * including a delete button for each entry.
   */
  const renderDailyLogAndCosts = () => {
    if (
      !coffeeListUl ||
      !noCoffeeMsg ||
      !coffeeCountSpan ||
      !totalDailyCostSpan ||
      !dailyCostBreakdownListUl ||
      !noCostBreakdownMsg
    )
      return;

    coffeeListUl.innerHTML = ""; // Clear existing list
    let totalCost = 0;
    const costsByType = {};
    const countsByType = {};

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

        // Span for coffee text
        const textSpan = document.createElement("span");
        textSpan.textContent = `${coffee.type} (at ${coffee.time})`;

        // Delete button for the coffee entry
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "&times;"; // Simple 'x' icon
        deleteBtn.className =
          "ml-2 px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500";
        deleteBtn.title = "Delete this entry";
        deleteBtn.dataset.entryId = coffee.id; // Store entry ID
        deleteBtn.addEventListener("click", (event) => {
          event.stopPropagation(); // Prevent any parent event listeners from firing
          handleDeleteCoffeeEntry(coffee.id, coffee.type);
        });

        listItem.appendChild(textSpan);
        listItem.appendChild(deleteBtn);
        coffeeListUl.appendChild(listItem);

        const definition = coffeeTypeDefinitions[coffee.type];
        const cost = definition ? definition.cost : 0;
        totalCost += cost;
        costsByType[coffee.type] = (costsByType[coffee.type] || 0) + cost;
        countsByType[coffee.type] = (countsByType[coffee.type] || 0) + 1;
      });
    }

    coffeeCountSpan.textContent = dailyCoffees.length;
    totalDailyCostSpan.textContent = `€${totalCost.toFixed(2)}`;

    dailyCostBreakdownListUl.innerHTML = "";
    if (Object.keys(costsByType).length > 0) {
      Object.keys(costsByType)
        .sort()
        .forEach((type) => {
          const count = countsByType[type] || 0;
          const costItem = document.createElement("li");
          costItem.className =
            "cost-item flex justify-between items-center text-sm p-1.5 bg-white dark:bg-gray-700 rounded text-gray-800 dark:text-gray-100";
          costItem.innerHTML = `<span>${type} (x${count}):</span> <span class="font-medium">€${costsByType[
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

  /**
   * Handles the deletion of a single coffee entry.
   * @param {number} entryId - The ID of the coffee entry to delete.
   * @param {string} coffeeType - The type of coffee, for the confirmation message.
   */
  const handleDeleteCoffeeEntry = async (entryId, coffeeType) => {
    if (!entryId) {
      showMessage("Error: Entry ID is missing.", "error");
      return;
    }

    if (confirm(`Are you sure you want to delete this ${coffeeType} entry?`)) {
      try {
        const response = await fetch(`/api/coffee_entry/${entryId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Try to get error message
          throw new Error(
            `Failed to delete entry: ${response.status}. ${
              errorData.error || "Server error"
            }`
          );
        }

        const result = await response.json();
        showMessage(
          result.message || `${coffeeType} entry deleted successfully!`,
          "success"
        );

        // Refresh data in both views
        await loadDailyLog(); // Reloads advanced view log and costs
        await loadAndDisplaySimpleCoffeeCount(); // Updates simple view count
      } catch (error) {
        console.error("Error deleting coffee entry:", error);
        showMessage(`Error: ${error.message}`, "error");
      }
    }
  };

  const handleAddCoffee = async () => {
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to add coffee: ${response.status}. ${errorData.error || ""}`
        );
      }
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
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Failed to clear log: ${response.status}. ${errorData.error || ""}`
          );
        }
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

  // --- Advanced View: Report Functions ---
  const renderReportBreakdown = (listElement, breakdownData) => {
    listElement.innerHTML = "";
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
      }):</span> <span class="font-medium">€${details.cost.toFixed(2)}</span>`;
      listElement.appendChild(listItem);
    }
  };

  const handleGenerateMonthlyReport = async () => {
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Report error: ${response.status}. ${errorData.error || ""}`
        );
      }
      const reportData = await response.json();
      monthlyReportPeriodSpan.textContent = `${
        reportMonthSelect.options[reportMonthSelect.selectedIndex].text
      } ${year}`;
      monthlyReportTypeFilterSpan.textContent = reportData.coffee_type_filter;
      monthlyReportTotalCoffeesSpan.textContent = reportData.total_coffees;
      monthlyReportTotalCostSpan.textContent = `€${reportData.total_cost.toFixed(
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
            reportData.breakdown_by_type
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Report error: ${response.status}. ${errorData.error || ""}`
        );
      }
      const reportData = await response.json();
      yearlyReportPeriodSpan.textContent = year;
      yearlyReportTypeFilterSpan.textContent = reportData.coffee_type_filter;
      yearlyReportTotalCoffeesSpan.textContent = reportData.total_coffees;
      yearlyReportTotalCostSpan.textContent = `€${reportData.total_cost.toFixed(
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
            reportData.breakdown_by_type
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

  // --- Advanced View: Fun Fact Function ---
  const handleShowFunFact = async () => {
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Fun fact error: ${response.status}. ${errorData.error || ""}`
        );
      }
      const factData = await response.json();
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
