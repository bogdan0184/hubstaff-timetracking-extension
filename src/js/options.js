let gitlabUrlInput = document.getElementById("gitlab-url");
let gitlabPATInput = document.getElementById("gitlab-pat");
let resetDataButton = document.getElementById("reset-data");
let dashboardDayAmountEnabled = document.getElementById("dashboard-day-amount-enabled");
let dashboardDayAmountDiv = document.getElementById("dashboard-day-amount-div");
let dashboardDayAmount = document.getElementById("dashboard-day-amount");

function constructSettings() {
  chrome.storage.sync.get(["gitlabUrl", "gitlabPAT", "dashboardDayAmountEnabled", "dashboardDayAmount"], function (data) {
    if (data.gitlabUrl) {
      gitlabUrlInput.value = data.gitlabUrl;
    }
    if (data.gitlabPAT) {
      gitlabPATInput.value = data.gitlabPAT;
    }
    if (data.dashboardDayAmountEnabled) {
      dashboardDayAmountEnabled.checked = data.dashboardDayAmountEnabled;
      dashboardDayAmountDiv.classList.remove("hidden");
      if (data.dashboardDayAmount) {
        dashboardDayAmount.value = data.dashboardDayAmount;
      } else {
        dashboardDayAmount.value = 7;
      }
    }
    dashboardDayAmountEnabled.addEventListener("change", function () {
      chrome.storage.sync.set({
        dashboardDayAmountEnabled: dashboardDayAmountEnabled.checked
      });
      if (dashboardDayAmountEnabled.checked) {
        dashboardDayAmountDiv.classList.remove("hidden");
        if (data.dashboardDayAmount) {
          dashboardDayAmount.value = data.dashboardDayAmount;
        } else {
          dashboardDayAmount.value = 7;
        }
      } else {
        dashboardDayAmountDiv.classList.add("hidden");
      }
    });
    dashboardDayAmount.addEventListener("change", function () {
      chrome.storage.sync.set({
        dashboardDayAmount: dashboardDayAmount.value
      });
    });
    gitlabUrlInput.addEventListener("change", function () {
      chrome.storage.sync.set({ gitlabUrl: this.value });
      let request = new Request(`${this.value}api/v4/projects`, {});
      fetch(request)
        .then((response) => {
          if (gitlabUrlInput.classList.contains("is-invalid")) {
            gitlabUrlInput.classList.remove("is-invalid");
            document
              .getElementById("validationServer03Feedback")
              .classList.add("invisible");
          }
        })
        .catch((error) => {
          gitlabUrlInput.classList.add("is-invalid");
          document
            .getElementById("validationServer03Feedback")
            .classList.remove("invisible");
        });
    });
    gitlabPATInput.addEventListener("change", function () {
      chrome.storage.sync.set({ gitlabPAT: this.value });
      chrome.storage.sync.get("gitlabUrl", ({ gitlabUrl }) => {
        let request = new Request(`${gitlabUrl}api/v4/user`, {
          headers: {
            "PRIVATE-TOKEN": this.value,
          },
        });
        fetch(request)
          .then((response) => {
            if (gitlabPATInput.classList.contains("is-invalid")) {
              gitlabPATInput.classList.remove("is-invalid");
              document
                .getElementById("validationServer04Feedback")
                .classList.add("invisible");
            }
            response.json().then((data) => {
              if (data.message == "401 Unauthorized") {
                gitlabPATInput.classList.add("is-invalid");
                document
                  .getElementById("validationServer04Feedback")
                  .classList.remove("invisible");
              } else {
                chrome.storage.sync.set({ gitlabUserID: data.id });
              }
            });
          })
          .catch((error) => {
            gitlabPATInput.classList.add("is-invalid");
            document
              .getElementById("validationServer04Feedback")
              .classList.remove("invisible");
          });
      });
    });
  });
  resetDataButton.addEventListener("click", function () {
    chrome.storage.sync.get(["gitlabUrl", "gitlabPAT", "gitlabUserID"], function (data) {
      chrome.storage.sync.clear();
      chrome.storage.sync.set({
        gitlabUrl: data.gitlabUrl,
        gitlabPAT: data.gitlabPAT,
        gitlabUserID: data.gitlabUserID,
      });
    });
  });
}
constructSettings();
