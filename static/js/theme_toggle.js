// static/js/theme_toggle.js
document.addEventListener("DOMContentLoaded", () => {
  const themeToggleButton = document.getElementById("theme-toggle-btn");
  const htmlElement = document.documentElement; // Get the <html> element

  // Function to apply the theme
  const applyTheme = (theme) => {
    if (theme === "dark") {
      htmlElement.classList.add("dark");
      if (themeToggleButton) themeToggleButton.textContent = "Light Mode"; // Update button text
    } else {
      htmlElement.classList.remove("dark");
      if (themeToggleButton) themeToggleButton.textContent = "Dark Mode"; // Update button text
    }
  };

  // Check for saved theme preference in localStorage
  const savedTheme = localStorage.getItem("theme");

  // Apply saved theme or default to system preference if supported, else light
  if (savedTheme) {
    applyTheme(savedTheme);
  } else if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    applyTheme("dark"); // Default to dark if system prefers it and no user choice
    localStorage.setItem("theme", "dark"); // Save this default
  } else {
    applyTheme("light"); // Default to light
  }

  // Event listener for the toggle button
  if (themeToggleButton) {
    themeToggleButton.addEventListener("click", () => {
      if (htmlElement.classList.contains("dark")) {
        applyTheme("light");
        localStorage.setItem("theme", "light");
      } else {
        applyTheme("dark");
        localStorage.setItem("theme", "dark");
      }
    });
  }

  // Listen for changes in system preference (optional, but good UX)
  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        // Only change if no explicit user choice has been made
        if (!localStorage.getItem("theme_user_chosen")) {
          const newColorScheme = event.matches ? "dark" : "light";
          applyTheme(newColorScheme);
          localStorage.setItem("theme", newColorScheme); // Update stored preference
        }
      });
  }
});
