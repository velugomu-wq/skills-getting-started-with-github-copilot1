document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Simple HTML escape to avoid injecting arbitrary content
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select to avoid duplicated options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants markup
        const participants = details.participants || [];
        let participantsMarkup = `<div class="participants-section"><strong>Participants:</strong>`;

        if (participants.length) {
          participantsMarkup += `<ul>${participants
            .map(
              (p) =>
                `<li class="participant" data-email="${escapeHtml(p)}" data-activity="${escapeHtml(
                  name
                )}">${escapeHtml(p)}<button class="unregister-btn" aria-label="Unregister ${escapeHtml(
                  p
                )}">&times;</button></li>`
            )
            .join("")}</ul>`;
        } else {
          participantsMarkup += `<p class="no-participants">No participants yet</p>`;
        }
        participantsMarkup += `</div>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsMarkup}
        `;

        activitiesList.appendChild(activityCard);

        // Handle unregister (delete) clicks via event delegation
        activityCard.addEventListener("click", async (ev) => {
          const target = ev.target;
          if (!target.classList.contains("unregister-btn")) return;

          const li = target.closest("li.participant");
          if (!li) return;

          const email = li.dataset.email;
          const activityName = li.dataset.activity;

          try {
            const resp = await fetch(
              `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(
                email
              )}`,
              { method: "DELETE" }
            );

            const result = await resp.json().catch(() => ({}));

            if (resp.ok) {
              messageDiv.textContent = result.message || `Unregistered ${email}`;
              messageDiv.className = "message success";
              messageDiv.classList.remove("hidden");
              // Refresh list
              fetchActivities();
            } else {
              messageDiv.textContent = result.detail || "Failed to unregister";
              messageDiv.className = "message error";
              messageDiv.classList.remove("hidden");
            }

            setTimeout(() => messageDiv.classList.add("hidden"), 4000);
          } catch (err) {
            console.error("Error unregistering:", err);
            messageDiv.textContent = "Failed to unregister. Please try again.";
            messageDiv.className = "message error";
            messageDiv.classList.remove("hidden");
          }
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities so participants list updates immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
