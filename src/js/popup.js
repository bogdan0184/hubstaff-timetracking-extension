Number.prototype.toHHMMSS = function () {
  var sec_num = parseInt(this, 10); // don't forget the second param
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - hours * 3600) / 60);
  var seconds = sec_num - hours * 3600 - minutes * 60;

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return hours + ":" + minutes + ":" + seconds;
};

let dashboardButton = document.getElementById("dashboard-button");
let buttonStart = document.getElementById("time-start-button");
let buttonStop = document.getElementById("time-stop-button");
let buttonPause = document.getElementById("time-pause-button");
let timeDisplay = document.getElementById("time-display");
let issueTable = document.getElementById("issue-table");
let issueTableBody = document.getElementById("issue-table-body");
let issueTableSearchBox = document.getElementById("issue-table-search-box");
let issueTableSortBox = document.getElementById("issue-table-sort-box");
let issueASCDESCButton = document.getElementById("asc-desc-button");
let currentIssueInformation = document.getElementById("current-issue");
let popup = document.getElementById("popup");

let timer = null;

let port = chrome.runtime.connect();

issueTableSearchBox.addEventListener("input", searchIssues);

issueTableSortBox.addEventListener("change", function () {
  clearIssueTable();
  window.sessionStorage.setItem("sort", this.value);
  loadIssues(true);
});

issueASCDESCButton.addEventListener("click", function () {
  clearIssueTable();
  if (this.innerText === "v") {
    window.sessionStorage.setItem("sorting", "asc");
  } else {
    window.sessionStorage.setItem("sorting", "desc");
  }
  loadIssues(true);
  if (this.innerText === "v") {
    this.innerText = "^";
  } else {
    this.innerText = "v";
  }
});
chrome.storage.onChanged.addListener(function (changes, areaName) {
  if (areaName === "sync" && changes.hasOwnProperty("currentIssue")) {
    chrome.storage.sync.get(
      ["gitlabUrl", "gitlabPAT", "gitlabUserID"],
      function (data) {
        if (data.gitlabUrl && data.gitlabPAT && data.gitlabUserID) {
          let request = new Request(
            `${data.gitlabUrl}api/v4/issues?assignee_id=${data.gitlabUserID}&private_token=${data.gitlabPAT}&scope=all&state=opened`,
            {
              headers: {
                "PRIVATE-TOKEN": data.gitlabPAT,
              },
            }
          );
          fetch(request)
            .then((response) => response.json())
            .then((data) => {
              let issue = data.filter(
                (issue) => issue.id == changes.currentIssue.newValue
              )[0];
              currentIssueInformation.innerHTML = `<h2>Current issue: <a href='${issue.web_url}' target='_blank'>${issue.references.short} ${issue.title}</a></h2>`;
            });
        }
      }
    );
  }
});

dashboardButton.addEventListener("click", function () {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/html/dashboard.html") });
});

buttonStart.addEventListener("click", function () {
  chrome.storage.sync.get(["currentIssue", "timerPaused"], function (cdata) {
    if (cdata.currentIssue) {
      chrome.storage.sync.get(cdata.currentIssue, function (data) {
        let key = "startTime";
        if (cdata.timerPaused) {
          key = "resumeTime";
        }
        if (data[cdata.currentIssue]) {
          data = data[cdata.currentIssue];
          data.push({ [key]: new Date().getTime() });
          chrome.storage.sync.set({ [cdata.currentIssue]: data });
        } else {
          chrome.storage.sync.set({
            [cdata.currentIssue]: [{ [key]: new Date().getTime() }],
          });
        }
      });
      chrome.storage.sync.set({ timerPaused: false });
      chrome.storage.sync.set({ timerStarted: true });
      timer = runTimer();
    }
  });
  this.classList.add("timer-button-activated");
  buttonStop.classList.remove("timer-button-activated");
  buttonPause.classList.remove("timer-button-activated");
  buttonStart.disabled = true;
  buttonStop.disabled = false;
  buttonPause.disabled = false;
});

buttonStop.addEventListener("click", stopAction);

function stopAction() {
  chrome.storage.sync.get(
    ["currentIssue", "countedTime", "timerPaused", "timerStarted"],
    function (cdata) {
      chrome.storage.sync.get(cdata.currentIssue, function (data) {
      if (cdata.currentIssue && !cdata.timerPaused && cdata.timerStarted) {
          if (data[cdata.currentIssue]) {
            data = data[cdata.currentIssue];
            data.push({ stopTime: new Date().getTime() });
            chrome.storage.sync.set({ [cdata.currentIssue]: data });
          } else {
            chrome.storage.sync.set({
              [cdata.currentIssue]: [{ stopTime: new Date().getTime() }],
            });
          }
        } else {
          if (data[cdata.currentIssue]) {
            data = data[cdata.currentIssue];
            data.push({ stopTime: data[data.length-1].pauseTime });
            chrome.storage.sync.set({ [cdata.currentIssue]: data });
          } else {
            chrome.storage.sync.set({
              [cdata.currentIssue]: [{ stopTime: data[data.length-1].pauseTime }],
            });
          }
        }
      });
    });
  buttonStop.classList.add("timer-button-activated");
  buttonStart.classList.remove("timer-button-activated");
  buttonPause.classList.remove("timer-button-activated");
  buttonStart.disabled = false;
  buttonStop.disabled = true;
  buttonPause.disabled = true;
  clearInterval(timer);
  chrome.storage.sync.set({ timerStarted: false });
  chrome.storage.sync.set({ timerPaused: false });
  chrome.storage.sync.set({ countedTime: 0 });
  timeDisplay.children[0].innerText = "00:00:00";
}

buttonPause.addEventListener("click", function () {
  chrome.storage.sync.get("currentIssue", function (cdata) {
    if (cdata.currentIssue) {
      chrome.storage.sync.get([cdata.currentIssue], function (data) {
        if (data[cdata.currentIssue]) {
          data = data[cdata.currentIssue];
          data.push({ pauseTime: new Date().getTime() });
          chrome.storage.sync.set({ [cdata.currentIssue]: data });
        } else {
          chrome.storage.sync.set({
            [cdata.currentIssue]: [{ pauseTime: new Date().getTime() }],
          });
        }
      });
    }
  });
  this.classList.add("timer-button-activated");
  buttonStop.classList.remove("timer-button-activated");
  buttonStart.classList.remove("timer-button-activated");
  buttonStart.disabled = false;
  buttonStop.disabled = false;
  buttonPause.disabled = true;
  clearInterval(timer);
  chrome.storage.sync.set({ timerStarted: false });
  chrome.storage.sync.set({ timerPaused: true });
});

function selectIssue() {
  chrome.storage.sync.get("currentIssue", function (data) {
    if (data.currentIssue) {
      let issueRow = document.getElementById(data.currentIssue + "-button");
      if (issueRow) {
        issueRow.classList.add("btn-select");
        issueRow.classList.remove("btn-selected");
        issueRow.removeAttribute("disabled");
        issueRow.innerText = "Select";
      }
    }
  });
  stopAction();
  chrome.storage.sync.set({ currentIssue: this.id.split("-button")[0] });
  let issueRow = document.getElementById(this.id);
  issueRow.classList.add("btn-selected");
  issueRow.classList.remove("btn-select");
  issueRow.setAttribute("disabled", true);
  issueRow.innerText = "Selected";
  buttonStart.disabled = false;
  buttonStop.disabled = true;
  buttonPause.disabled = true;
}

function loadIssues(not) {
  let extendQuery = `&sort=asc&order_by=due_date`;
  let sort = window.sessionStorage.getItem("sort");
  let sorting = window.sessionStorage.getItem("sorting");
  let nameFilter = window.sessionStorage.getItem("nameFilter");
  if (!sort) {
    window.sessionStorage.setItem("sort", "due_date");
  }
  if (!sorting) {
    window.sessionStorage.setItem("sorting", "asc");
  }
  if (sort && sorting) {
    extendQuery = `&sort=${sorting}&order_by=${sort}`;
  }
  if (nameFilter) {
    extendQuery += `&search=${nameFilter}&in=title`;
  }
  chrome.storage.sync.get(
    ["gitlabUrl", "gitlabPAT", "gitlabUserID", "tableFields"],
    function (data) {
      if (
        data.gitlabUrl &&
        data.gitlabPAT &&
        data.gitlabUserID &&
        data.tableFields
      ) {
        let request = new Request(
          `${data.gitlabUrl}api/v4/issues?private_token=${data.gitlabPAT}&scope=assigned_to_me&state=opened${extendQuery}`,
          {
            headers: {
              "PRIVATE-TOKEN": data.gitlabPAT,
            },
          }
        );
        fetch(request)
          .then((response) => response.json())
          .then((issues) => {
            issues.forEach((issue) => {
              let fieldsForTable = Object.keys(data.tableFields).filter(
                (key) => data.tableFields[key].used
              );
              fieldsForTable = fieldsForTable.sort((a, b) => {
                return (
                  data.tableFields[a].sequence - data.tableFields[b].sequence
                );
              });
              let issueRow = document.createElement("tr");
              issueRow.setAttribute("id", issue.id);
              for (let field of fieldsForTable) {
                let issueTd = document.createElement("td");
                switch (field) {
                  case "selected":
                    issueTd.innerHTML =
                      "<button class='btn btn-primary btn-select' id='" +
                      issue.id +
                      "-button'>Select</button>";
                    break;
                  case "title":
                    let link = document.createElement("a");
                    link.innerText = issue.title;
                    link.href = issue.web_url;
                    link.target = "_blank";
                    issueTd.appendChild(link);
                    break;
                  case "short":
                    issueTd.innerText = issue.references.short;
                    break;
                  case "state":
                    issueTd.innerText = issue.state;
                    break;
                  case "time_spent":
                    issueTd.innerText =
                      issue.time_stats.total_time_spent.toHHMMSS();
                    break;
                  case "due_date":
                    issueTd.innerText = new Date(
                      issue.due_date
                    ).toLocaleDateString();
                    if (
                      issue.due_date < new Date().toISOString().split("T")[0]
                    ) {
                      issueTd.style.color = "red";
                    }
                    break;
                  case "repository":
                    chrome.storage.sync.get(
                      `id-${issue.project_id}`,
                      function (d) {
                        if (!d[`id-${issue.project_id}`]) {
                          let request = new Request(
                            `${issue._links.project}?private_token=${data.gitlabPAT}`,
                            {
                              headers: {
                                "PRIVATE-TOKEN": data.gitlabPAT,
                              },
                            }
                          );
                          fetch(request)
                            .then((response) => response.json())
                            .then((project) => {
                              chrome.storage.sync.set({
                                [`id-${issue.project_id}`]: project.name,
                              });
                              issueTd.innerText = project.name;
                            });
                        } else {
                          issueTd.innerText = d[`id-${issue.project_id}`];
                        }
                      }
                    );
                    break;
                  case "labels":
                    issueTd.innerText = issue.labels.map((label) => {
                      return label;
                    });
                }
                issueRow.appendChild(issueTd);
              }
              issueTableBody.appendChild(issueRow);
            });
            chrome.storage.sync.get("currentIssue", async function (data) {
              if (data.currentIssue) {
                let issueRow = document.getElementById(
                  data.currentIssue + "-button"
                );
                if (issueRow) {
                  issueRow.classList.add("btn-selected");
                  issueRow.classList.remove("btn-select");
                  issueRow.setAttribute("disabled", true);
                  issueRow.innerText = "Selected";
                  buttonStart.disabled = false;
                  buttonStop.disabled = true;
                  buttonPause.disabled = true;
                  chrome.storage.sync.get(
                    ["timerStarted", "timerPaused", "countedTime", "saveTime"],
                    function (data) {
                      if (data.timerStarted) {
                        buttonStart.classList.add("timer-button-activated");
                        buttonStart.disabled = true;
                        buttonStop.disabled = false;
                        buttonPause.disabled = false;
                        time = data.countedTime;
                        if (data.saveTime) {
                          time += (Date.now() - data.saveTime) / 1000;
                        }
                        chrome.storage.sync.set({ countedTime: time });
                        chrome.storage.sync.set({ saveTime: 0 });
                        timeDisplay.children[0].innerText = time.toHHMMSS();
                        if (!not) {
                          timer = runTimer();
                        }
                      } else if (data.timerPaused) {
                        buttonStop.disabled = false;
                        buttonPause.classList.add("timer-button-activated");
                        buttonPause.disabled = true;
                        if (data.countedTime) {
                          timeDisplay.children[0].innerText =
                            data.countedTime.toHHMMSS();
                        }
                      }
                    }
                  );
                }
                if (issues.length > 0) {
                  let issue = issues.filter(
                    (issue) => issue.id == data.currentIssue
                  )[0];
                  currentIssueInformation.innerHTML = `<h2>Current issue: <a href='${issue.web_url}' target='_blank'>${issue.references.short} ${issue.title}</a></h2>`;
                }
              }
            });
            let buttons = document.getElementsByClassName("btn-select");
            for (const button of buttons) {
              button.addEventListener("click", selectIssue);
            }
          });
      }
    }
  );
}

function runTimer() {
  chrome.storage.sync.get("countedTime", function (data) {
    if (!data.countedTime) {
      chrome.storage.sync.set({ countedTime: 0 });
    }
  });
  return setInterval(function () {
    chrome.storage.sync.get("countedTime", function (data) {
      chrome.storage.sync.set({ countedTime: data.countedTime + 1 });
      timeDisplay.children[0].innerText = (data.countedTime + 1).toHHMMSS();
    });
  }, 1000);
}

function searchIssues() {
  clearIssueTable();
  window.sessionStorage.setItem("nameFilter", this.value);
  loadIssues(true);
}

function clearIssueTable() {
  issueTableBody.innerHTML = "";
}

function setLayout() {
  chrome.storage.sync.get("layoutWidth", function (data) {
    if (data.layoutWidth >= 400 && data.layoutWidth <= 800) {
      popup.style.width = `${data.layoutWidth}px`;
    } else {
      popup.style.width = "400px";
    }
  });
}

generateTable();
loadIssues();
setLayout();

let issueTableHeadRow = document.getElementById("issue-table-head-row");

function loadTable() {
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
        issueTableHeadRow.appendChild(tableHeader);
      }
    }
  });
}

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
    loadTable();
  });
}
