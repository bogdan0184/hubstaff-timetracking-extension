let gitlabUrlInput = document.getElementById("gitlab-url");
let gitlabPATInput = document.getElementById("gitlab-pat");
let layoutWidthBox = document.getElementById("layout-width-box");
let layoutWidthInput = document.getElementById("layout-width-input");

let ro = new ResizeObserver((entries) => {
  let width = parseInt(layoutWidthBox.style.width, 10);
  if (width >= 400 && width <= 800) {
    chrome.storage.sync.set({ layoutWidth: width });
    layoutWidthInput.value = width;
  }
});

ro.observe(layoutWidthBox);

let resetDataButton = document.getElementById("reset-data");
let dashboardDayAmountEnabled = document.getElementById("dashboard-day-amount-enabled");
let dashboardDayAmountDiv = document.getElementById("dashboard-day-amount-div");
let dashboardDayAmount = document.getElementById("dashboard-day-amount");

layoutWidthInput.addEventListener("input", function () {
  let width = this.value;
  if (width >= 400 && width <= 800) {
    chrome.storage.sync.set({ layoutWidth: width });
    layoutWidthBox.style.width = `${width}px`;
    layoutWidthInput.classList.remove("is-invalid");
    document
      .getElementById("validationServer05Feedback")
      .classList.add("invisible");
  } else {
    layoutWidthInput.classList.add("is-invalid");
    document
      .getElementById("validationServer05Feedback")
      .classList.remove("invisible");
  }
});

function constructSettings() {
  chrome.storage.sync.get(["gitlabUrl", "gitlabPAT", "dashboardDayAmountEnabled", "dashboardDayAmount", "layoutWidth"], function (data) {
    if (data.gitlabUrl) {
      gitlabUrlInput.value = data.gitlabUrl;
    }
    if (data.gitlabPAT) {
      gitlabPATInput.value = data.gitlabPAT;
    }
    if (!data.layoutWidth) {
      chrome.storage.sync.set({ layoutWidth: 400 });
      layoutWidthBox.style.width = "400px";
      layoutWidthInput.value = 400;
    } else {
      layoutWidthBox.style.width = `${data.layoutWidth}px`;
      layoutWidthInput.value = data.layoutWidth;
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

function generateTable() {
  chrome.storage.sync.get("tableFields", function (data) {
    if (!data.tableFields) {
      chrome.storage.sync.set({
        tableFields: {
          short: {
            name: "#",
            used: true,
            sequence: 1,
          },
          title: {
            name: "Issue",
            used: true,
            sequence: 2,
          },
          time_spent: {
            name: "Time spent",
            used: true,
            sequence: 3,
          },
          state: {
            name: "State",
            used: false,
            sequence: 4,
          },
          due_date: {
            name: "Due date",
            used: false,
            sequence: 5,
          },
          labels: {
            name: "Labels",
            used: false,
            sequence: 6,
          },
          repository: {
            name: "Repository",
            used: false,
            sequence: 7,
          },
          selected: {
            name: "Selected",
            used: true,
            notRemoveable: true,
            sequence: 0,
          },
        },
      });
    }
    loadTableAndList();
  });
}

let issueTableRow = document.getElementById("issue-table-row");
let issueListGroup = document.getElementById("issue-list-group");

function clearTableAndList() {
  issueTableRow.innerHTML = "";
  issueListGroup.innerHTML = "";
}

function loadTableAndList() {
  chrome.storage.sync.get("tableFields", function (data) {
    if (data.tableFields) {
      let fieldsForTable = Object.keys(data.tableFields).filter(
        (key) => data.tableFields[key].used
      );
      fieldsForTable = fieldsForTable.sort((a, b) => {
        return data.tableFields[a].sequence - data.tableFields[b].sequence;
      });
      for (let field of fieldsForTable) {
        let tableHeader = document.createElement("th");
        tableHeader.classList.add("table-cell");
        tableHeader.setAttribute("draggable", true);
        tableHeader.innerText = data.tableFields[field].name;
        tableHeader.id = field;
        let removeButton = document.createElement("button");
        removeButton.classList.add("btn", "btn-sm", "btn-primary");
        removeButton.style.float = "right";
        removeButton.innerHTML = "-";
        if (data.tableFields[field].notRemoveable === undefined) {
          removeButton.classList.add("remove-button");
          tableHeader.appendChild(removeButton);
        }
        issueTableRow.appendChild(tableHeader);
        let cells = document.getElementsByClassName("table-cell");
        for (let cell of cells) {
          cell.style.cursor = "pointer";
          addDragEvents(cell);
        }
      }
      let fieldsForList = Object.keys(data.tableFields).filter(
        (key) => !data.tableFields[key].used
      );
      fieldsForList = fieldsForList.sort((a, b) => {
        return data.tableFields[a].sequence - data.tableFields[b].sequence;
      });
      for (let field of fieldsForList) {
        let listGroupItem = document.createElement("li");
        listGroupItem.classList.add(
          "list-group-item",
          "d-flex",
          "justify-content-between"
        );
        listGroupItem.innerText = "" + data.tableFields[field].name;
        listGroupItem.id = field;
        let addSpan = document.createElement("span");
        addSpan.classList.add(
          "badge",
          "bg-primary",
          "rounded-pill",
          "add-button"
        );
        addSpan.innerText = "+";
        listGroupItem.appendChild(addSpan);
        issueListGroup.appendChild(listGroupItem);
      }
      let addButtons = document.getElementsByClassName("add-button");
      for (let addButton of addButtons) {
        addButton.addEventListener("click", function (e) {
          chrome.storage.sync.get("tableFields", function (data) {
            if (data.tableFields) {
              let field = e.target.parentElement.id;
              data.tableFields[field].used = true;
              chrome.storage.sync.set({ tableFields: data.tableFields });
              clearTableAndList();
              generateTable();
            }
          });
        });
      }
      let removeButtons = document.getElementsByClassName("remove-button");
      for (let removeButton of removeButtons) {
        removeButton.addEventListener("click", function (e) {
          chrome.storage.sync.get("tableFields", function (data) {
            if (data.tableFields) {
              let field = e.target.parentElement.id;
              data.tableFields[field].used = false;
              chrome.storage.sync.set({ tableFields: data.tableFields });
              clearTableAndList();
              generateTable();
            }
          });
        });
      }
    }
  });
}

generateTable();
