const form = document.querySelector("[data-quote-form]");
const status = document.querySelector("[data-form-status]");

const trackEvent = (eventName, parameters = {}) => {
  if (typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, parameters);
};

document.querySelectorAll("a[href^='tel:']").forEach((link) => {
  link.addEventListener("click", () => {
    trackEvent("phone_click", {
      event_category: "engagement",
      event_label: link.getAttribute("href")
    });
  });
});

document.querySelectorAll("a[href^='mailto:']").forEach((link) => {
  link.addEventListener("click", () => {
    trackEvent("email_click", {
      event_category: "engagement",
      event_label: link.getAttribute("href")
    });
  });
});

if (form && status) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    status.textContent = "";
    status.className = "form-status";

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      form.reset();
      status.textContent = data.message || "Your quote request was sent successfully.";
      status.classList.add("success");
      trackEvent("generate_lead", {
        event_category: "lead",
        method: "quote_form",
        service: payload.service || "Not specified",
        city: payload.city || "Not specified"
      });
    } catch (error) {
      status.textContent = error.message || "We could not send your request right now.";
      status.classList.add("error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send Quote Request";
    }
  });
}
