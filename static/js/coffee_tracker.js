// Contents of static/js/coffee_tracker.js

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements - Daily Tracker
  const logDateInput = document.getElementById("log-date");
  const yesterdayBtn = document.getElementById("yesterday-btn");
  const todayBtn = document.getElementById("today-btn");
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

  // DOM Elements - Monthly Report
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

  // DOM Elements - Yearly Report
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

  // DOM Elements - Fun Fact
  const funFactYearInput = document.getElementById("fun-fact-year");
  const showFunFactBtn = document.getElementById("show-fun-fact-btn");
  const funFactDisplayArea = document.getElementById("fun-fact-display-area");
  const funFactYearDisplaySpan = document.getElementById(
    "fun-fact-year-display"
  );
  const funFactVolumeSpan = document.getElementById("fun-fact-volume");
  const noFunFactDataMsg = document.getElementById("no-fun-fact-data-msg");

  let dailyCoffees = [];
  let coffeeTypeDefinitions = {}; // Stores {name: {cost: X, volume: Y}}

  // --- Utility Functions ---
  const getFormattedDate = (dateObj) => {
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
    logDateInput.value = getFormattedDate(today);
    updateSelectedDateDisplays(logDateInput.value);

    await fetchCoffeeDefinitions();
    populateReportSelects();
    populateMonthYearInputs();

    await loadDailyLog();

    // Event Listeners
    logDateInput.addEventListener("change", () => {
      updateSelectedDateDisplays(logDateInput.value);
      loadDailyLog();
    });
    todayBtn.addEventListener("click", () => setDateAndReload(new Date()));
    yesterdayBtn.addEventListener("click", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setDateAndReload(yesterday);
    });
    addCoffeeBtn.addEventListener("click", handleAddCoffee);
    clearDayBtn.addEventListener("click", handleClearDay);
    generateMonthlyReportBtn.addEventListener(
      "click",
      handleGenerateMonthlyReport
    );
    generateYearlyReportBtn.addEventListener(
      "click",
      handleGenerateYearlyReport
    );
    showFunFactBtn.addEventListener("click", handleShowFunFact);
  };

  const setDateAndReload = (dateObj) => {
    logDateInput.value = getFormattedDate(dateObj);
    logDateInput.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const updateSelectedDateDisplays = (dateString) => {
    if (!dateString) {
      const today = new Date();
      dateString = getFormattedDate(today);
    }
    const parts = dateString.split("-");
    const displayDateObj = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
    const displayDate = displayDateObj.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    selectedDateDisplayLog.textContent = displayDate;
    selectedDateDisplayCost.textContent = displayDate;
    selectedDateDisplayClear.textContent = displayDate;
  };

  const fetchCoffeeDefinitions = async () => {
    try {
      const response = await fetch("/api/coffee-types");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const types = await response.json();

      coffeeTypeSelect.innerHTML =
        '<option value="">-- Select Coffee Type --</option>';
      coffeeTypeDefinitions = {};
      types.forEach((type) => {
        coffeeTypeDefinitions[type.name] = {
          cost: type.cost,
          volume: type.volume,
        };
        const option = document.createElement("option");
        option.value = type.name;
        option.textContent = `${type.name} (€${type.cost.toFixed(2)})`;
        coffeeTypeSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error fetching coffee definitions:", error);
      showMessage("Could not load coffee types.", "error");
      coffeeTypeSelect.innerHTML =
        '<option value="">Error loading types</option>';
    }
  };

  const populateReportSelects = () => {
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
    } else {
      console.warn(
        "Coffee definitions not yet loaded for populating report selects."
      );
    }
  };

  const populateMonthYearInputs = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    reportYearMonthlyInput.value = currentYear;
    reportYearMonthlyInput.min = currentYear - 10;
    reportYearMonthlyInput.max = currentYear + 1;
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
    reportYearYearlyInput.max = currentYear + 1;

    funFactYearInput.value = currentYear;
    funFactYearInput.min = currentYear - 10;
    funFactYearInput.max = currentYear + 1;
  };

  // --- Daily Log Functions ---
  const loadDailyLog = async () => {
    let selectedDate = logDateInput.value;
    if (!selectedDate) {
      const today = new Date();
      selectedDate = getFormattedDate(today);
      logDateInput.value = selectedDate;
      updateSelectedDateDisplays(selectedDate);
    }
    try {
      const response = await fetch(`/api/coffees/${selectedDate}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to load log: ${response.status}. ${errorData.error || ""}`
        );
      }
      dailyCoffees = await response.json();
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
    coffeeListUl.innerHTML = "";
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
          "coffee-item bg-white p-2.5 rounded-md shadow-sm border border-gray-200 flex justify-between items-center text-sm";
        listItem.textContent = `${coffee.type} (at ${coffee.time})`;
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
            "cost-item flex justify-between items-center text-sm p-1.5 bg-white rounded";
          costItem.innerHTML = `<span>${type} (x${count}):</span> <span class="font-medium">€${costsByType[
            type
          ].toFixed(2)}</span>`;
          dailyCostBreakdownListUl.appendChild(costItem);
        });
    } else if (dailyCoffees.length > 0) {
      noCostBreakdownMsg.style.display = "block";
      noCostBreakdownMsg.textContent = "Cost data unavailable for these types.";
    } else {
      noCostBreakdownMsg.textContent = "No costs to display.";
    }
  };

  const handleAddCoffee = async () => {
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
      coffeeTypeSelect.value = "";
    } catch (error) {
      console.error("Error adding coffee:", error);
      showMessage(`Error adding coffee: ${error.message}`, "error");
    }
  };

  const handleClearDay = async () => {
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
      } catch (error) {
        console.error("Error clearing log:", error);
        showMessage(`Error clearing log: ${error.message}`, "error");
      }
    }
  };

  // --- Report Rendering Helper ---
  const renderReportBreakdown = (listElement, breakdownData) => {
    listElement.innerHTML = "";
    if (!breakdownData || Object.keys(breakdownData).length === 0) {
      const noBreakdownItem = document.createElement("li");
      noBreakdownItem.textContent = "No specific type data for this selection.";
      noBreakdownItem.className = "italic text-gray-500 text-sm";
      listElement.appendChild(noBreakdownItem);
      return;
    }
    const sortedTypes = Object.keys(breakdownData).sort();
    for (const typeName of sortedTypes) {
      const details = breakdownData[typeName];
      const listItem = document.createElement("li");
      listItem.className =
        "report-breakdown-item flex justify-between items-center text-sm p-1.5 bg-white rounded shadow-sm";
      listItem.innerHTML = `
                    <span>${typeName} (x${details.count}):</span>
                    <span class="font-medium">€${details.cost.toFixed(2)}</span>
                `;
      listElement.appendChild(listItem);
    }
  };

  // --- Monthly Report Functions ---
  const handleGenerateMonthlyReport = async () => {
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
          `Failed to generate report: ${response.status}. ${
            errorData.error || ""
          }`
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
      showMessage(`Error generating monthly report: ${error.message}`, "error");
      monthlyReportResultsArea.style.display = "none";
      noMonthlyReportDataMsg.style.display = "block";
      noMonthlyReportDataMsg.textContent = `Error generating report.`;
    }
  };

  // --- Yearly Report Functions ---
  const handleGenerateYearlyReport = async () => {
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
          `Failed to generate report: ${response.status}. ${
            errorData.error || ""
          }`
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
      showMessage(`Error generating yearly report: ${error.message}`, "error");
      yearlyReportResultsArea.style.display = "none";
      noYearlyReportDataMsg.style.display = "block";
      noYearlyReportDataMsg.textContent = `Error generating report.`;
    }
  };

  // --- Fun Fact Function ---
  const handleShowFunFact = async () => {
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
          `Failed to get fun fact: ${response.status}. ${errorData.error || ""}`
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
      showMessage(`Error getting fun fact: ${error.message}`, "error");
      funFactDisplayArea.style.display = "none";
      noFunFactDataMsg.style.display = "block";
      noFunFactDataMsg.textContent = "Could not load fun fact.";
    }
  };

  // --- Start the page ---
  initializePage();
});
