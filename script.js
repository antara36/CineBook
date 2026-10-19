const MOVIES = {
  "Interstellar": { price: 200, genre: "Sci-Fi · Adventure", poster: "poster-interstellar", title: "INTER<br>STELLAR" },
  "Inception": { price: 180, genre: "Sci-Fi · Thriller", poster: "poster-inception", title: "INCEPTION" },
  "The Dark Knight": { price: 220, genre: "Action · Crime", poster: "poster-darkknight", title: "THE DARK<br>KNIGHT" },
  "Avengers: Endgame": { price: 250, genre: "Action · Fantasy", poster: "poster-avengers", title: "AVENGERS<br><small>ENDGAME</small>" }
};
const STORAGE_KEY = "cinebookBookings";

function getBookings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}
function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function formatDate(dateString) {
  if (!dateString) return "Date not selected";
  const date = new Date(`${dateString}T12:00:00`);
  return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function initNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "✕" : "☰";
  });
}
function initYear() {
  document.querySelectorAll(".current-year").forEach(el => el.textContent = new Date().getFullYear());
}
function initMovieSearch() {
  const search = document.getElementById("movieSearch");
  const grid = document.getElementById("allMovies");
  if (!search || !grid) return;
  const cards = [...grid.querySelectorAll(".movie-card")];
  const count = document.getElementById("showingCount");
  const empty = document.getElementById("emptySearch");
  function update() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const match = (card.dataset.title || "").includes(query);
      card.classList.toggle("hidden", !match);
      if (match) visible++;
    });
    count.textContent = `${visible} movie${visible === 1 ? "" : "s"} available`;
    empty.classList.toggle("hidden", visible !== 0);
  }
  search.addEventListener("input", update);
}
function initBookingForm() {
  const form = document.getElementById("bookingForm");
  if (!form) return;
  const movieSelect = document.getElementById("movieSelect");
  const ticketCount = document.getElementById("ticketCount");
  const showDate = document.getElementById("showDate");
  const message = document.getElementById("formMessage");
  const params = new URLSearchParams(window.location.search);
  const requestedMovie = params.get("movie");
  if (requestedMovie && MOVIES[requestedMovie]) movieSelect.value = requestedMovie;

  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  showDate.min = localToday;

  function updateSummary() {
    const name = movieSelect.value;
    const movie = MOVIES[name];
    const quantity = Number(ticketCount.value || 1);
    const poster = document.getElementById("summaryPoster");
    document.getElementById("summaryMovie").textContent = movie ? name : "Choose your movie";
    document.getElementById("summaryGenre").textContent = movie ? movie.genre : "Your selection will appear here";
    document.getElementById("summaryPrice").textContent = `₹${movie ? movie.price : 0}`;
    document.getElementById("summaryTickets").textContent = String(quantity);
    document.getElementById("summaryTotal").textContent = `₹${(movie ? movie.price : 0) * quantity}`;
    poster.className = `summary-art ${movie ? movie.poster : "poster-interstellar"}`;
    document.getElementById("summaryPosterTitle").innerHTML = movie ? movie.title : "INTER<br>STELLAR";
    poster.querySelector(".poster-graphic").className = `poster-graphic ${movie ? ({
      "Interstellar": "graphic-space", "Inception": "graphic-city", "The Dark Knight": "graphic-bat", "Avengers: Endgame": "graphic-energy"
    })[name] : "graphic-space"}`;
  }
  movieSelect.addEventListener("change", updateSummary);
  ticketCount.addEventListener("change", updateSummary);
  updateSummary();

  form.addEventListener("submit", event => {
    event.preventDefault();
    message.className = "form-message hidden";
    const formData = new FormData(form);
    const name = String(formData.get("customerName") || "").trim();
    const email = String(formData.get("customerEmail") || "").trim();
    const movieName = String(formData.get("movie") || "");
    const date = String(formData.get("showDate") || "");
    const time = String(formData.get("showTime") || "");
    const quantity = Number(formData.get("ticketCount") || 1);

    if (!name || !email || !MOVIES[movieName] || !date || !time || !quantity) {
      message.textContent = "Please complete all fields before confirming your booking.";
      message.className = "form-message error";
      return;
    }
    if (date < localToday) {
      message.textContent = "Please choose today or a future date.";
      message.className = "form-message error";
      return;
    }
    const movie = MOVIES[movieName];
    const booking = {
      id: `CB${Date.now().toString().slice(-8)}`,
      customerName: name,
      customerEmail: email,
      movie: movieName,
      showDate: date,
      showTime: time,
      ticketCount: quantity,
      pricePerTicket: movie.price,
      total: movie.price * quantity,
      createdAt: new Date().toISOString()
    };
    const bookings = getBookings();
    bookings.unshift(booking);
    try {
      saveBookings(bookings);
      message.textContent = "Booking saved successfully! Opening your bookings…";
      message.className = "form-message success";
      form.reset();
      movieSelect.value = "";
      ticketCount.value = "1";
      updateSummary();
      window.setTimeout(() => { window.location.href = "my-bookings.html"; }, 700);
    } catch (error) {
      message.textContent = "Your browser could not save this booking. Please check your browser storage settings.";
      message.className = "form-message error";
    }
  });
}
function initBookingsList() {
  const list = document.getElementById("bookingsList");
  if (!list) return;
  const empty = document.getElementById("emptyBookings");
  const count = document.getElementById("bookingCount");
  function render() {
    const bookings = getBookings();
    empty.classList.toggle("hidden", bookings.length !== 0);
    list.classList.toggle("hidden", bookings.length === 0);
    count.textContent = `${bookings.length} reservation${bookings.length === 1 ? "" : "s"} saved on this browser.`;
    list.innerHTML = bookings.map(booking => {
      const movie = MOVIES[booking.movie] || MOVIES.Interstellar;
      const quantity = Number(booking.ticketCount || 1);
      const total = Number(booking.total || movie.price * quantity);
      return `
        <article class="booking-item">
          <div class="booking-thumb ${movie.poster}"></div>
          <div class="booking-info">
            <h3>${escapeHTML(booking.movie)}</h3>
            <p>Booked by ${escapeHTML(booking.customerName)} · ${escapeHTML(booking.customerEmail)}</p>
            <div class="booking-details">
              <span class="detail-chip">▦ ${escapeHTML(formatDate(booking.showDate))}</span>
              <span class="detail-chip">◷ ${escapeHTML(booking.showTime)}</span>
              <span class="detail-chip">♙ ${quantity} ticket${quantity === 1 ? "" : "s"}</span>
              <span class="detail-chip">ID: ${escapeHTML(booking.id || "CineBook")}</span>
            </div>
          </div>
          <div class="booking-item-side">
            <strong class="booking-total">₹${total}</strong>
            <button class="cancel-booking" type="button" data-cancel="${escapeHTML(booking.id)}">Cancel booking</button>
          </div>
        </article>`;
    }).join("");
  }
  list.addEventListener("click", event => {
    const button = event.target.closest("[data-cancel]");
    if (!button) return;
    const id = button.getAttribute("data-cancel");
    if (!window.confirm("Cancel this booking?")) return;
    saveBookings(getBookings().filter(booking => String(booking.id) !== String(id)));
    render();
  });
  render();
}
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initYear();
  initMovieSearch();
  initBookingForm();
  initBookingsList();
});
