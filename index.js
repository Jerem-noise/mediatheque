const WORKER_URL = "https://proxy-bnf.batteux-jerem.workers.dev/";
let books = [];
let filter = "all";
async function loadBooks(){
  const res = await fetch(WORKER_URL);
  books = await res.json();
  render();
}
async function save(){
  await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(books)
  });
}
async function save(){
  await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(books)
  });
}
function addBook(){
  const title = document.getElementById("title").value.trim();
  const author = document.getElementById("author").value.trim();
  const member = document.getElementById("member").value;
  const date = document.getElementById("date").value;

  if(!title || !date) return;

  books.unshift({
    title,
    author,
    member,
    borrowDate: date,
    returnDate: computeReturn(date)
  });

  save();
  render();

  document.getElementById("title").value = "";
  document.getElementById("author").value = "";
}
function render(){
  const list = books
    .filter(b => filter === "all" ? true : b.member === filter)
    .sort((a,b) => new Date(a.returnDate) - new Date(b.returnDate));

  document.getElementById("list").innerHTML = list.map(b => `
    <div class="card">
      <b>${b.title}</b><br>
      ${b.author || ""}<br>
      👤 ${b.member}<br>
      📅 retour : ${b.returnDate}
    </div>
  `).join('');
}
async function search(q){
  if(q.length < 2) return [];

  try {
    const r = await fetch(WORKER_URL + "?q=" + encodeURIComponent(q));
    return await r.json();
  } catch {
    return [];
  }
}
function addToGoogle(book){
  const title = encodeURIComponent("📚 Rendre : " + book.title);
  const details = encodeURIComponent(book.author || "");
  const date = book.returnDate.replaceAll("-", "");

  const url =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${title}` +
    `&dates=${date}/${date}` +
    `&details=${details}`;

  window.open(url, "_blank");
}
loadBooks();
