function addDragEvents(element) {
  element.addEventListener("dragstart", dragCell);
  element.addEventListener("dragover", allowDrop);
  element.addEventListener("drop", dropCell);
  element.addEventListener("dragenter", handleDragEnter);
  element.addEventListener("dragend", handleDragEnd);
}

function resetDragState(e) {
  let data = e.dataTransfer.getData("text/plain");
  if (data) {
    data = JSON.parse(data);
    let rows = document.getElementById(data.id).rows[0].cells;
    for (let row of rows) {
      if (row.classList.contains("ready-for-drop")) {
        row.classList.remove("ready-for-drop");
      }
      if (row.classList.length === 0) {
        row.classList.add("table-cell");
      }
      row.style.cursor = "pointer";
      addDragEvents(row);
    }
  }
}

function dragCell(e) {
  let cells = document.getElementsByClassName("table-cell");
  for (let cell of cells) {
    cell.style.cursor = "grabbing";
  }
  let draggedRow = e.target.closest("th");
  let rowNumber = draggedRow.cellIndex;
  let tableId = draggedRow.parentNode.parentNode.parentNode.getAttribute("id");
  let data = { id: tableId, rowNumber: rowNumber };
  let cellsdragged = draggedRow;
  let dataToTransfer = [];
  dataToTransfer.push(cellsdragged.outerHTML);
  data["cellContents"] = dataToTransfer;
  data = JSON.stringify(data);
  e.dataTransfer.setData("text/plain", data);
}

function allowDrop(e) {
  e.preventDefault();
}

function dropCell(e) {
  e.preventDefault();
  let data = e.dataTransfer.getData("text/plain");
  data = JSON.parse(data);
  let rowToDrop = e.target.closest("th");
  let targetIndex = rowToDrop.cellIndex;
  let targetId = rowToDrop.parentNode.parentNode.parentNode.getAttribute("id");
  if (data.id == targetId && data.rowNumber != targetIndex) {
    let cellsForDrop = rowToDrop;
    let draggedRow = document.getElementById(data.id).rows[0].cells[
      data.rowNumber
    ];
    let cellsOfDrag = draggedRow;
    cellsForDrop.outerHTML = cellsOfDrag.outerHTML;
    addDragEvents(cellsForDrop);
    cellsOfDrag.outerHTML = cellsForDrop.outerHTML;
    addDragEvents(cellsOfDrag);
    chrome.storage.sync.get("tableFields", function (data) {
      if (data.tableFields) {
        let sequence1 = data.tableFields[cellsForDrop.id].sequence;
        let sequence2 = data.tableFields[cellsOfDrag.id].sequence;
        data.tableFields[cellsOfDrag.id].sequence = sequence1;
        data.tableFields[cellsForDrop.id].sequence = sequence2;
        chrome.storage.sync.set({ tableFields: data.tableFields });
      }
    });
    resetDragState(e);
  }
}

var previousRow = null;

function handleDragEnter(e) {
  if (e.target.nodeType === 1) {
    let currentRow = this.closest("th");
    if (previousRow !== null) {
      if (currentRow !== previousRow) {
        previousRow.className = "";
      }
    }
    currentRow.className = "ready-for-drop";
    previousRow = currentRow;
  }
}

function handleDragEnd(e) {
  resetDragState(e);
}
