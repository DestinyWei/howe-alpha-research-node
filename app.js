const data = window.RESEARCH_DATA || [];
const state = { query: "", chain: "ALL", month: "ALL", date: "", sort: "desc" };

const recordsEl = document.querySelector("#records");
const archiveEl = document.querySelector("#archive");
const searchConsoleEl = document.querySelector(".search-console");
const chainListEl = document.querySelector("#chain-list");
const monthListEl = document.querySelector("#month-list");
const resultCountEl = document.querySelector("#result-count");
const searchEl = document.querySelector("#search");
const dialog = document.querySelector("#detail-dialog");

document.querySelector("#total-count").textContent = data.length;
document.querySelector("#last-date").textContent = data[0]?.date.replaceAll("-", ".") || "--";
const verifiedChainCount = data.filter((item) => item.chainVerified).length;
const pendingChainCount = data.length - verifiedChainCount;
const chainStatusEl = document.querySelector("#chain-status");
chainStatusEl.textContent = `${verifiedChainCount} / ${data.length}`;
chainStatusEl.classList.toggle("warning", pendingChainCount > 0);
document.querySelector("#metadata-note").textContent = pendingChainCount
  ? `已确认 ${verifiedChainCount} 篇链信息，剩余 ${pendingChainCount} 篇因原始正文没有明确链或 CA 信息而保留为待确认。`
  : `全部 ${verifiedChainCount} 篇分析记录的链信息均已确认。`;

function tickClock() {
  const now = new Date();
  document.querySelector("#clock").textContent = now.toLocaleTimeString("zh-CN", { hour12: false });
}
tickClock();
setInterval(tickClock, 1000);

async function syncGlobalVisits() {
  const visitsEl = document.querySelector("#visits");
  visitsEl.textContent = "------";
  visitsEl.title = "正在同步全站访问数据";

  try {
    const response = await fetch("/api/visits", {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const result = await response.json();

    if (!response.ok || typeof result.count !== "number") {
      throw new Error(result.error || "counter_unavailable");
    }

    visitsEl.textContent = String(result.count).padStart(6, "0");
    visitsEl.title = "全站累计访问次数";
  } catch (error) {
    visitsEl.textContent = "------";
    visitsEl.title = "全站访问计数等待 Vercel KV 配置";
  }
}
syncGlobalVisits();

function getFiltered() {
  const query = state.query.trim().replace(/^\$/, "").toLowerCase();
  return data.filter((item) => {
    const haystack = `${item.title} ${item.project} ${item.tokens.join(" ")} ${item.summary} ${item.content.join(" ")}`.toLowerCase();
    const queryMatch = !query || haystack.includes(query);
    const chainMatch = state.chain === "ALL" || item.chains.includes(state.chain);
    const monthMatch = state.month === "ALL" || `${item.year}-${String(item.month).padStart(2, "0")}` === state.month;
    const dateMatch = !state.date || item.date === state.date;
    return queryMatch && chainMatch && monthMatch && dateMatch;
  }).sort((a, b) => state.sort === "desc"
    ? b.date.localeCompare(a.date) || b.id - a.id
    : a.date.localeCompare(b.date) || a.id - b.id);
}

function renderRecords() {
  const filtered = getFiltered();
  searchConsoleEl.classList.toggle("date-filter-active", Boolean(state.date));
  resultCountEl.textContent = state.date
    ? `${state.date.replaceAll("-", ".")} · ${filtered.length} 条记录 / RECORDS`
    : `${filtered.length} 条记录 / RECORDS`;
  recordsEl.innerHTML = filtered.map((item) => `
    <article class="record ${item.date === state.date ? "date-selected" : ""}" data-id="${item.id}" data-date="${item.date}" tabindex="0">
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
  `).join("") || `<div class="data-note"><strong>无匹配记录 / NO SIGNAL</strong><p>没有找到符合条件的记录。</p></div>`;

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
    <button class="filter-row ${state.chain === "ALL" ? "active" : ""}" data-chain="ALL"><span>全部链 / ALL NETWORKS</span><span>${data.length}</span></button>
    ${chainNames.map((chain) => `
      <button class="filter-row ${state.chain === chain ? "active" : ""}" data-chain="${chain}">
        <span>${chain === "Other" ? "其他 / OTHER" : chain.toUpperCase()}</span><span>${counts[chain]}</span>
      </button>
      <div class="bar"><i style="width:${(counts[chain] / max) * 100}%"></i></div>
    `).join("")}
  `;
  chainListEl.querySelectorAll("[data-chain]").forEach((button) => button.addEventListener("click", () => {
    state.chain = button.dataset.chain;
    state.date = "";
    searchEl.value = state.query;
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
    <button class="month-row ${state.month === "ALL" ? "active" : ""}" data-month="ALL"><span>全部月份 / ALL MONTHS</span><span>${data.length}</span></button>
    ${Object.entries(counts).sort(([a], [b]) => b.localeCompare(a)).map(([month, count]) => `
      <button class="month-row ${state.month === month ? "active" : ""}" data-month="${month}">
        <span>${month.replace("-", " / ")}</span><span>${String(count).padStart(2, "0")}</span>
      </button>
    `).join("")}
  `;
  monthListEl.querySelectorAll("[data-month]").forEach((button) => button.addEventListener("click", () => {
    state.month = button.dataset.month;
    state.date = "";
    searchEl.value = state.query;
    renderAll();
  }));
}

function renderHeatmap() {
  const counts = data.reduce((acc, item) => {
    acc[item.date] = (acc[item.date] || 0) + 1;
    return acc;
  }, {});
  const heatmap = document.querySelector("#heatmap");
  const monthAxis = document.querySelector("#heatmap-months");
  const tooltip = document.querySelector("#heatmap-tooltip");
  const shell = document.querySelector(".heatmap-shell");
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - 370);
  const cells = [];
  const months = [];
  let previousMonth = -1;

  for (let i = 0; i < 371; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const count = counts[key] || 0;
    const level = count === 0 ? 0 : count === 1 ? 2 : count === 2 ? 3 : 4;
    const tooltipText = count ? `${key} · 当日上线 ${count} 篇分析` : `${key} · 无分析记录`;
    const interactiveAttrs = count ? ` role="button" tabindex="0"` : "";
    cells.push(`<span class="heat-cell l${level}" data-date="${key}" data-count="${count}" aria-label="${tooltipText}" title="${tooltipText}"${interactiveAttrs}></span>`);

    if (date.getMonth() !== previousMonth) {
      months.push(`<span style="grid-column:${Math.floor(i / 7) + 1}">${date.getMonth() + 1}月</span>`);
      previousMonth = date.getMonth();
    }
  }
  heatmap.innerHTML = cells.join("");
  monthAxis.innerHTML = months.join("");

  const positionTooltip = (event) => {
    const shellRect = shell.getBoundingClientRect();
    const left = Math.min(event.clientX - shellRect.left + 12, shell.clientWidth - tooltip.offsetWidth - 4);
    const top = Math.max(event.clientY - shellRect.top - tooltip.offsetHeight - 12, 0);
    tooltip.style.left = `${Math.max(left, 0)}px`;
    tooltip.style.top = `${top}px`;
  };

  heatmap.querySelectorAll(".heat-cell").forEach((cell) => {
    cell.addEventListener("pointerenter", (event) => {
      const count = Number(cell.dataset.count);
      tooltip.textContent = count
        ? `${cell.dataset.date} · 当日上线 ${count} 篇分析`
        : `${cell.dataset.date} · 无分析记录`;
      tooltip.classList.add("visible");
      positionTooltip(event);
    });
    cell.addEventListener("pointermove", positionTooltip);
    cell.addEventListener("pointerleave", () => tooltip.classList.remove("visible"));
    cell.addEventListener("click", () => jumpToDate(cell.dataset.date));
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        jumpToDate(cell.dataset.date);
      }
    });
  });
}

function jumpToDate(date) {
  const recordsForDate = data.filter((item) => item.date === date);
  if (!recordsForDate.length) return;

  state.date = date;
  state.query = "";
  state.chain = "ALL";
  state.month = "ALL";
  searchEl.value = getDateTokenLabel(recordsForDate);
  renderAll();

  requestAnimationFrame(() => {
    archiveEl.scrollIntoView({ behavior: "smooth", block: "start" });
    recordsEl.querySelector(`[data-date="${date}"]`)?.focus({ preventScroll: true });
  });
}

function getDateTokenLabel(records) {
  const tokens = [...new Set(records.flatMap((item) => item.tokens.map((token) => `$${token}`)))];
  return tokens.length ? tokens.join(" / ") : records.map((item) => item.title).join(" / ");
}

function openDetail(id) {
  const item = data.find((record) => record.id === id);
  if (!item) return;
  document.querySelector("#dialog-id").textContent = String(item.id).padStart(3, "0");
  document.querySelector("#dialog-title").textContent = item.title;
  document.querySelector("#dialog-meta").innerHTML = [
    { type: "date", value: item.date },
    { type: "chain", value: `链 / CHAIN: ${item.chains.join("/")}` },
    { type: "token", value: `代币 / TOKEN: ${item.tokens.map((token) => `$${token}`).join(" / ")}` },
    { type: "status", value: item.chainVerified ? "链信息已确认 / CHAIN VERIFIED" : "链信息待确认 / CHAIN PENDING" },
    { type: "content", value: item.content.length ? "完整正文 / FULL TEXT" : "正文待整理 / FULL TEXT PENDING" },
    item.contentReview ? { type: "review", value: item.contentReview } : null,
  ].filter(Boolean).map((meta) => `<span class="meta-${meta.type}">${meta.value}</span>`).join("");
  document.querySelector("#dialog-content").innerHTML = renderResearchContent(item);
  document.querySelector("#dialog-notion").href = item.notionUrl;
  dialog.showModal();
  dialog.scrollTop = 0;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function renderInlineLinks(value) {
  return escapeHtml(value).replace(/@([A-Za-z0-9_]+)/g, '<a class="content-handle" href="https://x.com/$1" target="_blank" rel="noreferrer">@$1</a>');
}

function renderResearchContent(item) {
  if (!item.content.length) {
    return `
      <div class="content-pending">
        <strong>正文待整理 / FULL TEXT PENDING</strong>
        <p>${escapeHtml(item.summary)}</p>
        <p>完整研究正文尚未迁入站内，后续将逐篇整理补充。</p>
      </div>
    `;
  }

  return item.content.map((paragraph, index) => {
    if (paragraph === "---") return "<hr>";
    const isTokenHeading = /^\$[A-Za-z0-9]+(?:\s|$)/.test(paragraph);
    const classNames = [
      isTokenHeading || index === 0 ? "content-lead" : "",
      paragraph.startsWith("CA(") ? "content-ca" : "",
      paragraph.startsWith("玩法：") ? "content-play" : "",
      paragraph.startsWith("#") ? "content-tags" : "",
    ].filter(Boolean).join(" ");
    return `<p class="${classNames}">${renderInlineLinks(paragraph)}</p>`;
  }).join("");
}

function renderAll() {
  renderRecords();
  renderChains();
  renderMonths();
}

searchEl.addEventListener("input", (event) => {
  state.query = event.target.value;
  state.date = "";
  renderRecords();
});
document.querySelector("#clear-search").addEventListener("click", () => {
  state.query = "";
  state.chain = "ALL";
  state.month = "ALL";
  state.date = "";
  searchEl.value = "";
  renderAll();
});
document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => {
  state.sort = button.dataset.sort;
  document.querySelectorAll("[data-sort]").forEach((item) => {
    const isActive = item.dataset.sort === state.sort;
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
  renderRecords();
}));
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

renderHeatmap();
renderAll();
