const data = window.RESEARCH_DATA || [];
const state = { query: "", chain: "ALL", month: "ALL" };

const recordsEl = document.querySelector("#records");
const chainListEl = document.querySelector("#chain-list");
const monthListEl = document.querySelector("#month-list");
const resultCountEl = document.querySelector("#result-count");
const searchEl = document.querySelector("#search");
const dialog = document.querySelector("#detail-dialog");

document.querySelector("#total-count").textContent = data.length;
document.querySelector("#last-date").textContent = data[0]?.date.replaceAll("-", ".") || "--";

function tickClock() {
  const now = new Date();
  document.querySelector("#clock").textContent = now.toLocaleTimeString("zh-CN", { hour12: false });
}
tickClock();
setInterval(tickClock, 1000);

const visitKey = "howe-alpha-node-visits";
const visits = Number(localStorage.getItem(visitKey) || 0) + 1;
localStorage.setItem(visitKey, String(visits));
document.querySelector("#visits").textContent = String(visits).padStart(6, "0");

function getFiltered() {
  const query = state.query.trim().replace(/^\$/, "").toLowerCase();
  return data.filter((item) => {
    const haystack = `${item.title} ${item.project} ${item.tokens.join(" ")} ${item.summary}`.toLowerCase();
    const queryMatch = !query || haystack.includes(query);
    const chainMatch = state.chain === "ALL" || item.chains.includes(state.chain);
    const monthMatch = state.month === "ALL" || `${item.year}-${String(item.month).padStart(2, "0")}` === state.month;
    return queryMatch && chainMatch && monthMatch;
  });
}

function renderRecords() {
  const filtered = getFiltered();
  resultCountEl.textContent = `${filtered.length} RECORDS ONLINE`;
  recordsEl.innerHTML = filtered.map((item) => `
    <article class="record" data-id="${item.id}" tabindex="0">
      <div class="record-date">${item.date.replaceAll("-", ".")}</div>
      <div>
        <h3>${item.title}</h3>
        <div class="tags">
          ${item.chains.map((chain) => `<span class="tag ${item.chainVerified ? "verified" : ""}">${chain}</span>`).join("")}
          ${item.tokens.slice(0, 3).map((token) => `<span class="tag">$${token}</span>`).join("")}
        </div>
      </div>
      <div class="record-id">#${String(item.id).padStart(3, "0")}</div>
    </article>
  `).join("") || `<div class="data-note"><strong>NO SIGNAL</strong><p>没有找到符合条件的记录。</p></div>`;

  recordsEl.querySelectorAll(".record").forEach((el) => {
    const open = () => openDetail(Number(el.dataset.id));
    el.addEventListener("click", open);
    el.addEventListener("keydown", (event) => event.key === "Enter" && open());
  });
}

function renderChains() {
  const chainNames = ["BSC", "ETH", "Base", "Sol", "Other"];
  const counts = Object.fromEntries(chainNames.map((chain) => [chain, data.filter((item) => item.chains.includes(chain)).length]));
  const max = Math.max(...Object.values(counts));
  chainListEl.innerHTML = `
    <button class="filter-row ${state.chain === "ALL" ? "active" : ""}" data-chain="ALL"><span>ALL NETWORKS</span><span>${data.length}</span></button>
    ${chainNames.map((chain) => `
      <button class="filter-row ${state.chain === chain ? "active" : ""}" data-chain="${chain}">
        <span>${chain.toUpperCase()}</span><span>${counts[chain]}</span>
      </button>
      <div class="bar"><i style="width:${(counts[chain] / max) * 100}%"></i></div>
    `).join("")}
  `;
  chainListEl.querySelectorAll("[data-chain]").forEach((button) => button.addEventListener("click", () => {
    state.chain = button.dataset.chain;
    renderAll();
  }));
}

function renderMonths() {
  const counts = data.reduce((acc, item) => {
    const key = `${item.year}-${String(item.month).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  monthListEl.innerHTML = `
    <button class="month-row ${state.month === "ALL" ? "active" : ""}" data-month="ALL"><span>ALL MONTHS</span><span>${data.length}</span></button>
    ${Object.entries(counts).sort(([a], [b]) => b.localeCompare(a)).map(([month, count]) => `
      <button class="month-row ${state.month === month ? "active" : ""}" data-month="${month}">
        <span>${month.replace("-", " / ")}</span><span>${String(count).padStart(2, "0")}</span>
      </button>
    `).join("")}
  `;
  monthListEl.querySelectorAll("[data-month]").forEach((button) => button.addEventListener("click", () => {
    state.month = button.dataset.month;
    renderAll();
  }));
}

function renderHeatmap() {
  const counts = data.reduce((acc, item) => {
    acc[item.date] = (acc[item.date] || 0) + 1;
    return acc;
  }, {});
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - 370);
  const cells = [];
  for (let i = 0; i < 371; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const count = counts[key] || 0;
    const level = count === 0 ? 0 : count === 1 ? 2 : count === 2 ? 3 : 4;
    cells.push(`<span class="heat-cell l${level}" title="${key}: ${count} reports"></span>`);
  }
  document.querySelector("#heatmap").innerHTML = cells.join("");
}

function openDetail(id) {
  const item = data.find((record) => record.id === id);
  if (!item) return;
  document.querySelector("#dialog-id").textContent = String(item.id).padStart(3, "0");
  document.querySelector("#dialog-title").textContent = item.title;
  document.querySelector("#dialog-summary").textContent = item.summary;
  document.querySelector("#dialog-meta").innerHTML = [
    item.date,
    ...item.chains.map((chain) => `CHAIN: ${chain}`),
    ...item.tokens.map((token) => `TOKEN: $${token}`),
    item.chainVerified ? "CHAIN VERIFIED" : "CHAIN PENDING",
  ].map((value) => `<span>${value}</span>`).join("");
  document.querySelector("#dialog-notion").href = item.notionUrl;
  dialog.showModal();
}

function renderAll() {
  renderRecords();
  renderChains();
  renderMonths();
}

searchEl.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderRecords();
});
document.querySelector("#clear-search").addEventListener("click", () => {
  state.query = "";
  state.chain = "ALL";
  state.month = "ALL";
  searchEl.value = "";
  renderAll();
});
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

renderHeatmap();
renderAll();
