const STORAGE_KEY = "medtrack-local-state-v2";
const LOW_STOCK_LIMIT = 10;

const state = {
  medications: [],
  schedules: [],
  selectedDate: toDateKey(new Date()),
  visibleYear: new Date().getFullYear(),
  visibleMonth: new Date().getMonth(),
  activeTab: "inventory",
};

const els = {
  totalMedicationCount: document.querySelector("#totalMedicationCount"),
  lowStockCount: document.querySelector("#lowStockCount"),
  lowStockCard: document.querySelector("#lowStockCard"),
  totalStockValue: document.querySelector("#totalStockValue"),
  scheduledDoseCount: document.querySelector("#scheduledDoseCount"),
  inventoryValuePill: document.querySelector("#inventoryValuePill"),
  dynamicStockValue: document.querySelector("#dynamicStockValue"),
  medicineForm: document.querySelector("#medicineForm"),
  medicineId: document.querySelector("#medicineId"),
  medicineName: document.querySelector("#medicineName"),
  medicineStock: document.querySelector("#medicineStock"),
  medicinePrice: document.querySelector("#medicinePrice"),
  saveMedicineButton: document.querySelector("#saveMedicineButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  inventoryTableBody: document.querySelector("#inventoryTableBody"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarLabel: document.querySelector("#calendarLabel"),
  previousMonthButton: document.querySelector("#previousMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  scheduleForm: document.querySelector("#scheduleForm"),
  scheduleDate: document.querySelector("#scheduleDate"),
  scheduleTime: document.querySelector("#scheduleTime"),
  scheduleMedicine: document.querySelector("#scheduleMedicine"),
  addScheduleButton: document.querySelector("#addScheduleButton"),
  timelineList: document.querySelector("#timelineList"),
  reportTableBody: document.querySelector("#reportTableBody"),
  reportDate: document.querySelector("#reportDate"),
  reportTotal: document.querySelector("#reportTotal"),
  printReportButton: document.querySelector("#printReportButton"),
  clearDataButton: document.querySelector("#clearDataButton"),
  emptyRowTemplate: document.querySelector("#emptyRowTemplate"),
  tabButtons: document.querySelectorAll(".tab-button"),
  tabPanels: document.querySelectorAll(".tab-panel"),
};

function createId(prefix) {
  if (window.crypto && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "PHP",
  });
}

function integer(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateKey) {
  return fromDateKey(dateKey).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMedication(id) {
  return state.medications.find((medication) => medication.id === id);
}

function getStockValue(medication) {
  return medication.stock * medication.price;
}

function getTotalStockValue() {
  return state.medications.reduce(
    (total, medication) => total + getStockValue(medication),
    0,
  );
}

function loadState() {
  const rawState = localStorage.getItem(STORAGE_KEY);
  if (!rawState) return;

  try {
    const saved = JSON.parse(rawState);
    state.medications = Array.isArray(saved.medications)
      ? saved.medications
      : [];
    state.schedules = Array.isArray(saved.schedules) ? saved.schedules : [];
    state.selectedDate = saved.selectedDate || state.selectedDate;

    const selected = fromDateKey(state.selectedDate);
    state.visibleYear = Number.isInteger(saved.visibleYear)
      ? saved.visibleYear
      : selected.getFullYear();
    state.visibleMonth = Number.isInteger(saved.visibleMonth)
      ? saved.visibleMonth
      : selected.getMonth();
    state.activeTab = saved.activeTab || "inventory";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      medications: state.medications,
      schedules: state.schedules,
      selectedDate: state.selectedDate,
      visibleYear: state.visibleYear,
      visibleMonth: state.visibleMonth,
      activeTab: state.activeTab,
    }),
  );
}

function switchTab(tabName) {
  state.activeTab = tabName;

  els.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  els.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}Panel`);
  });

  if (tabName === "schedule") {
    renderCalendar();
    renderTimeline();
  } else if (tabName === "report") {
    renderReport();
  }

  saveState();
}

function render() {
  renderDashboard();
  renderInventory();
  renderMedicationSelect();

  if (state.activeTab === "schedule") {
    renderCalendar();
    renderTimeline();
  } else if (state.activeTab === "report") {
    renderReport();
  }

  saveState();
}

function renderDashboard() {
  const lowStockItems = state.medications.filter(
    (medication) => medication.stock < LOW_STOCK_LIMIT,
  );
  const totalStockValue = getTotalStockValue();

  els.totalMedicationCount.textContent = integer(state.medications.length);
  els.lowStockCount.textContent = integer(lowStockItems.length);
  els.totalStockValue.textContent = money(totalStockValue);
  els.inventoryValuePill.textContent = money(totalStockValue);
  els.dynamicStockValue.textContent = money(totalStockValue);
  els.scheduledDoseCount.textContent = integer(state.schedules.length);
  els.lowStockCard.classList.toggle("is-active", lowStockItems.length > 0);
}

function renderInventory() {
  els.inventoryTableBody.replaceChildren();

  if (!state.medications.length) {
    els.inventoryTableBody.append(
      createEmptyRow(5, "No medications added yet."),
    );
    return;
  }

  const sortedMedications = [...state.medications].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  sortedMedications.forEach((medication) => {
    const row = document.createElement("tr");
    const isLow = medication.stock < LOW_STOCK_LIMIT;

    row.innerHTML = `
      <td>
        <div class="medicine-name">
          <strong></strong>
          <span class="status-chip ${isLow ? "low" : ""}">${isLow ? "Running low" : "Healthy stock"}</span>
        </div>
      </td>
      <td>${integer(medication.stock)}</td>
      <td>${money(medication.price)}</td>
      <td>${money(getStockValue(medication))}</td>
      <td>
        <div class="row-actions">
          <button class="mini-button" type="button" data-action="edit" data-id="${medication.id}">Edit</button>
          <button class="mini-button danger" type="button" data-action="delete" data-id="${medication.id}">Delete</button>
        </div>
      </td>
    `;
    row.querySelector("strong").textContent = medication.name;
    els.inventoryTableBody.append(row);
  });
}

function renderMedicationSelect() {
  const previousValue = els.scheduleMedicine.value;
  els.scheduleMedicine.replaceChildren();

  if (!state.medications.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Add a medication first";
    els.scheduleMedicine.append(option);
    els.scheduleMedicine.disabled = true;
    els.addScheduleButton.disabled = true;
    return;
  }

  els.scheduleMedicine.disabled = false;
  els.addScheduleButton.disabled = false;

  [...state.medications]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((medication) => {
      const option = document.createElement("option");
      option.value = medication.id;
      option.textContent = medication.name;
      els.scheduleMedicine.append(option);
    });

  if (state.medications.some((medication) => medication.id === previousValue)) {
    els.scheduleMedicine.value = previousValue;
  }
}

function renderCalendar() {
  const monthStart = new Date(state.visibleYear, state.visibleMonth, 1);
  const firstGridDay = new Date(
    state.visibleYear,
    state.visibleMonth,
    1 - monthStart.getDay(),
  );
  const datesWithEvents = new Set(
    state.schedules.map((schedule) => schedule.date),
  );

  els.calendarLabel.textContent = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  els.calendarGrid.replaceChildren();

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
    const weekday = document.createElement("div");
    weekday.className = "weekday";
    weekday.textContent = day;
    els.calendarGrid.append(weekday);
  });

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(firstGridDay);
    date.setDate(firstGridDay.getDate() + index);

    const dateKey = toDateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.textContent = date.getDate();
    button.setAttribute("aria-label", formatDate(dateKey));

    button.classList.toggle("is-muted", date.getMonth() !== state.visibleMonth);
    button.classList.toggle("is-selected", dateKey === state.selectedDate);
    button.classList.toggle("has-event", datesWithEvents.has(dateKey));

    button.addEventListener("click", () => selectDate(dateKey));
    els.calendarGrid.append(button);
  }
}

function renderTimeline() {
  els.scheduleDate.value = state.selectedDate;
  els.timelineList.replaceChildren();

  const schedulesForDate = state.schedules
    .filter((schedule) => schedule.date === state.selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (!schedulesForDate.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = `${formatDate(state.selectedDate)} has no scheduled medication.`;
    els.timelineList.append(empty);
    return;
  }

  schedulesForDate.forEach((schedule) => {
    const medication = getMedication(schedule.medicationId);
    const item = document.createElement("article");
    item.className = "timeline-card";
    item.innerHTML = `
      <div>
        <strong></strong>
        <span>${schedule.time} on ${formatDate(schedule.date)}</span>
      </div>
      <button class="mini-button danger" type="button" data-schedule-id="${schedule.id}">Delete</button>
    `;
    item.querySelector("strong").textContent = medication
      ? medication.name
      : schedule.medicationName;
    els.timelineList.append(item);
  });
}

function renderReport() {
  const reportDate = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  els.reportDate.textContent = reportDate;
  els.reportTableBody.replaceChildren();

  if (!state.medications.length) {
    els.reportTableBody.append(
      createEmptyRow(4, "No medications available for this report."),
    );
  }

  [...state.medications]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((medication) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td></td>
        <td>${integer(medication.stock)}</td>
        <td>${money(medication.price)}</td>
        <td>${money(getStockValue(medication))}</td>
      `;
      row.firstElementChild.textContent = medication.name;
      els.reportTableBody.append(row);
    });

  els.reportTotal.textContent = money(getTotalStockValue());
}

function createEmptyRow(colspan, message) {
  const row = els.emptyRowTemplate.content.firstElementChild.cloneNode(true);
  const cell = row.querySelector("td");
  cell.colSpan = colspan;
  cell.textContent = message;
  return row;
}

function selectDate(dateKey) {
  const date = fromDateKey(dateKey);
  state.selectedDate = dateKey;
  state.visibleYear = date.getFullYear();
  state.visibleMonth = date.getMonth();
  renderCalendar();
  renderTimeline();
  saveState();
}

function resetMedicineForm() {
  els.medicineForm.reset();
  els.medicineId.value = "";
  els.saveMedicineButton.textContent = "Add Medication";
  els.cancelEditButton.classList.add("hidden");
}

function editMedication(id) {
  const medication = getMedication(id);
  if (!medication) return;

  els.medicineId.value = medication.id;
  els.medicineName.value = medication.name;
  els.medicineStock.value = medication.stock;
  els.medicinePrice.value = medication.price;
  els.saveMedicineButton.textContent = "Update Medication";
  els.cancelEditButton.classList.remove("hidden");
  els.medicineName.focus();
}

function deleteMedication(id) {
  const medication = getMedication(id);
  if (!medication) return;

  if (!confirm(`Delete ${medication.name} and its schedules?`)) return;

  state.medications = state.medications.filter((item) => item.id !== id);
  state.schedules = state.schedules.filter(
    (schedule) => schedule.medicationId !== id,
  );
  resetMedicineForm();
  render();
}

// Event Listeners
els.tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tabName = button.dataset.tab;
    if (tabName && tabName !== state.activeTab) {
      switchTab(tabName);
    }
  });
});

els.medicineForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const id = els.medicineId.value;
  const name = els.medicineName.value.trim();
  const stock = Math.max(0, Number.parseInt(els.medicineStock.value, 10) || 0);
  const price = Math.max(0, Number.parseFloat(els.medicinePrice.value) || 0);

  if (!name) return;

  if (id) {
    const medication = getMedication(id);
    if (medication) {
      medication.name = name;
      medication.stock = stock;
      medication.price = price;
      medication.updatedAt = new Date().toISOString();
    }
  } else {
    state.medications.push({
      id: createId("med"),
      name,
      stock,
      price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  resetMedicineForm();
  render();
});

els.inventoryTableBody.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  if (actionButton.dataset.action === "edit") {
    editMedication(actionButton.dataset.id);
  }

  if (actionButton.dataset.action === "delete") {
    deleteMedication(actionButton.dataset.id);
  }
});

els.cancelEditButton.addEventListener("click", resetMedicineForm);

els.scheduleForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const medication = getMedication(els.scheduleMedicine.value);
  const date = els.scheduleDate.value;
  const time = els.scheduleTime.value;

  if (!medication || !date || !time) return;

  state.schedules.push({
    id: createId("schedule"),
    medicationId: medication.id,
    medicationName: medication.name,
    date,
    time,
    createdAt: new Date().toISOString(),
  });

  selectDate(date);
  els.scheduleTime.value = "";
  renderDashboard();
});

els.timelineList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-schedule-id]");
  if (!deleteButton) return;

  state.schedules = state.schedules.filter(
    (schedule) => schedule.id !== deleteButton.dataset.scheduleId,
  );
  renderTimeline();
  renderDashboard();
});

els.scheduleDate.addEventListener("change", () => {
  if (els.scheduleDate.value) {
    selectDate(els.scheduleDate.value);
  }
});

els.previousMonthButton.addEventListener("click", () => {
  const previous = new Date(state.visibleYear, state.visibleMonth - 1, 1);
  state.visibleYear = previous.getFullYear();
  state.visibleMonth = previous.getMonth();
  renderCalendar();
  renderTimeline();
  saveState();
});

els.nextMonthButton.addEventListener("click", () => {
  const next = new Date(state.visibleYear, state.visibleMonth + 1, 1);
  state.visibleYear = next.getFullYear();
  state.visibleMonth = next.getMonth();
  renderCalendar();
  renderTimeline();
  saveState();
});

els.printReportButton.addEventListener("click", () => {
  switchTab("report");
  setTimeout(() => {
    window.print();
  }, 100);
});

els.clearDataButton.addEventListener("click", () => {
  if (!confirm("Clear all MedTrack data from this browser?")) return;

  state.medications = [];
  state.schedules = [];
  state.selectedDate = toDateKey(new Date());
  state.visibleYear = new Date().getFullYear();
  state.visibleMonth = new Date().getMonth();
  state.activeTab = "inventory";
  localStorage.removeItem(STORAGE_KEY);
  resetMedicineForm();
  switchTab("inventory");
  render();
});

// Initialize
loadState();
switchTab(state.activeTab);
render();
