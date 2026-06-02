const MEMBERS = ["Jérémy", "Marion"];
const STORAGE_KEY = "mediatheque_books_v10";

let books = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let currentFilter = "all";
let currentSearch = "";
let currentBookId = null;
let currentRating = 0;

let autocompleteTimeout = null;

// ================= SAFE HTML =================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ================= STORAGE =================
const saveBooks = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
};

// ================= STATS (PAS EN LOOP) =================
const updateStats = () => {
  const active = books.filter(b => !b.returned);
  const urgent = active.filter(b => daysLeft(b.returnDate) <= 5);

  document.getElementById("stat-active").textContent = active.length;
  document.getElementById("stat-urgent").textContent = urgent.length;
  document.getElementById("stat-jeremy").textContent =
    active.filter(b => b.member === "Jérémy").length;

  document.getElementById("stat-marion").textContent =
    active.filter(b => b.member === "Marion").length;
};

// ================= DATE UTILS =================
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};

const daysLeft = (dateStr) => {
  if (!dateStr) return 0;
  const now = new Date(); now.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.ceil((d - now) / 86400000);
};

// ================= FILTER =================
function getFilteredBooks() {
  const s = currentSearch.toLowerCase();

  return books.filter(b => {
    if (s && !(
      (b.title || "").toLowerCase().includes(s) ||
      (b.author || "").toLowerCase().includes(s)
    )) return false;

    if (currentFilter === "jeremy") return b.member === "Jérémy";
    if (currentFilter === "marion") return b.member === "Marion";
    if (currentFilter === "active") return !b.returned;
    if (currentFilter === "returned") return b.returned;

    return true;
  });
}

// ================= RENDER OPTIMISÉ =================
function renderBooks() {
  const container = document.getElementById("books-list");
  const list = getFilteredBooks();

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        Aucun livre trouvé
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(book => {
    const days = daysLeft(book.returnDate);

    let badge = "normal";
    let text = `${days} jours`;

    if (book.returned) {
      badge = "returned";
      text = "Rendu";
    } else if (days < 0) {
      badge = "late";
      text = "En retard";
    } else if (days <= 5) {
      badge = "urgent";
      text = "Urgent";
    }

    return `
      <div class="book-card ${book.returned ? "returned" : ""}">
        <div class="book-card-left">
          <div class="book-card-title">${escapeHtml(book.title)}</div>
          <div class="book-card-author">${escapeHtml(book.author)}</div>

          <div class="book-card-tags">
            <span class="badge ${book.member === "Jérémy" ? "jeremy" : "marion"}">
              ${book.member}
            </span>
            <span class="badge ${badge}">
              ${text}
            </span>
          </div>

          <div class="book-card-dates">
            Retour : <strong>${formatDate(book.returnDate)}</strong>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ================= SMART RENDER (ANTI LAG) =================
let renderLock = false;

function smartRender() {
  if (renderLock) return;
  renderLock = true;

  requestAnimationFrame(() => {
    renderBooks();
    renderLock = false;
  });
}

// ================= SEARCH =================
let searchTimer;

document.getElementById("search-input").addEventListener("input", (e) => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    currentSearch = e.target.value;
    smartRender();
  }, 200);
});

// ================= FILTERS =================
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");

    currentFilter = e.target.dataset.filter;
    smartRender();
  });
});

// ================= AUTOCOMPLETE (SAFE) =================
const WORKER_URL = "https://proxy-bnf.batteux-jerem.workers.dev/";

async function searchBooks(q) {
  try {
    const res = await fetch(`${WORKER_URL}?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

document.getElementById("book-title").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  const list = document.getElementById("autocomplete-list");

  if (q.length < 2) {
    list.innerHTML = "";
    return;
  }

  clearTimeout(autocompleteTimeout);

  autocompleteTimeout = setTimeout(async () => {
    const results = await searchBooks(q);

    list.innerHTML = (results || [])
      .slice(0, 8)
      .filter(b => b && b.title)
      .map(b => `
        <div class="autocomplete-item"
          onclick='selectBook(${JSON.stringify(b.title)}, ${JSON.stringify(b.author || "")})'>

          <div class="book-info">
            <div class="book-title">${escapeHtml(b.title)}</div>
            <div class="book-author">${escapeHtml(b.author || "")}</div>
          </div>
        </div>
      `).join("");
  }, 250);
});

// ================= SELECT AUTOCOMPLETE =================
window.selectBook = (title, author) => {
  document.getElementById("book-title").value = title;
  document.getElementById("book-author").value = author;
  document.getElementById("autocomplete-list").innerHTML = "";
};

// ================= BOOK ACTIONS =================
function addBook(book) {
  books.unshift(book);
  saveBooks();
  updateStats();
  smartRender();
}

function updateBook(updated) {
  const i = books.findIndex(b => b.id === updated.id);
  if (i !== -1) books[i] = updated;

  saveBooks();
  updateStats();
  smartRender();
}

function deleteBook(id) {
  books = books.filter(b => b.id !== id);
  saveBooks();
  updateStats();
  smartRender();
}

// ================= INIT =================
updateStats();
renderBooks();
