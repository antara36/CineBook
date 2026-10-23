const MOVIES = {
  "Interstellar": { price: 200, genre: "Sci-Fi · Adventure", poster: "poster-interstellar", title: "INTER<br>STELLAR" },
  "Inception": { price: 180, genre: "Sci-Fi · Thriller", poster: "poster-inception", title: "INCEPTION" },
  "The Dark Knight": { price: 220, genre: "Action · Crime", poster: "poster-darkknight", title: "THE DARK<br>KNIGHT" },
  "Avengers: Endgame": { price: 250, genre: "Action · Fantasy", poster: "poster-avengers", title: "AVENGERS<br><small>ENDGAME</small>" },
  "Dune: Part Two": { price: 240, genre: "Sci-Fi · Adventure", poster: "poster-avengers", title: "DUNE<br><small>PART TWO</small>" },
  "Spider-Man: No Way Home": { price: 230, genre: "Action · Adventure", poster: "poster-darkknight", title: "SPIDER-MAN" },
  "Jurassic World": { price: 210, genre: "Action · Sci-Fi", poster: "poster-interstellar", title: "JURASSIC<br>WORLD" },
  "The Batman": { price: 220, genre: "Action · Crime", poster: "poster-darkknight", title: "THE BATMAN" },
  "Top Gun: Maverick": { price: 200, genre: "Action · Drama", poster: "poster-inception", title: "TOP GUN<br><small>MAVERICK</small>" },
  "Avatar: The Way of Water": { price: 250, genre: "Fantasy · Sci-Fi", poster: "poster-interstellar", title: "AVATAR<br><small>WAY OF WATER</small>" },
  "Barbie": { price: 190, genre: "Comedy · Fantasy", poster: "poster-avengers", title: "BARBIE" },
  "Oppenheimer": { price: 220, genre: "Drama · History", poster: "poster-inception", title: "OPPENHEIMER" },
  "The Super Mario Bros. Movie": { price: 180, genre: "Animation · Adventure", poster: "poster-avengers", title: "SUPER MARIO<br><small>BROS.</small>" }
};

const STORAGE_KEY = "cinebookBookings";

const THEATRES = [
  { name: "CineBook Central", areas: ["mumbai", "andheri", "bandra", "thane", "pune", "delhi", "bengaluru", "bangalore", "hyderabad", "chennai"] },
  { name: "PVR Galaxy", areas: ["mumbai", "andheri", "bandra", "delhi", "pune", "bengaluru", "bangalore"] },
  { name: "INOX Riverside", areas: ["mumbai", "thane", "pune", "hyderabad", "chennai", "kolkata"] },
  { name: "CityLights Multiplex", areas: ["mumbai", "delhi", "pune", "chennai", "kolkata", "hyderabad"] }
];

const SEATS = ["A", "B", "C", "D", "E", "F"].flatMap(
  row => Array.from({ length: 8 }, (_, i) => `${row}${i + 1}`)
);

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

function getSeatBookings() {
  return getBookings();
}

// Normalize text to avoid differences caused by capitalization or extra spaces.
function normalizeBookingValue(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Seats are unique to a particular movie, location, theatre, date and showtime.
function isSameShow(first, second) {
  return (
    normalizeBookingValue(first.movie) === normalizeBookingValue(second.movie) &&
    normalizeBookingValue(first.location) === normalizeBookingValue(second.location) &&
    normalizeBookingValue(first.theatre) === normalizeBookingValue(second.theatre) &&
    String(first.showDate || "") === String(second.showDate || "") &&
    normalizeBookingValue(first.showTime) === normalizeBookingValue(second.showTime)
  );
}

function getBookedSeatsForShow(bookings, showDetails) {
  const occupied = new Set();

  bookings
    .filter(booking => isSameShow(booking, showDetails))
    .forEach(booking => {
      (booking.seats || []).forEach(seat => occupied.add(String(seat)));
    });

  return occupied;
}

// Re-check availability before saving to prevent duplicate seat bookings.
async function saveBookingIfAvailable(booking) {
  const reserve = () => {
    const latestBookings = getBookings();
    const occupied = getBookedSeatsForShow(latestBookings, booking);
    const conflicts = (booking.seats || []).filter(
      seat => occupied.has(String(seat))
    );

    if (conflicts.length) {
      return { ok: false, conflicts };
    }

    saveBookings([booking, ...latestBookings]);
    return { ok: true, conflicts: [] };
  };

  if (navigator.locks && typeof navigator.locks.request === "function") {
    return navigator.locks.request("cinebook-seat-reservations", reserve);
  }

  return reserve();
}

/* CURRENT USER */
function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem("cinebookCurrentUser") || "null"
    );
  } catch (error) {
    return null;
  }
}

/* SHOW ONLY THE LOGGED-IN USER'S BOOKINGS */
function getMyBookings() {
  const user = getCurrentUser();

  if (!user || !user.email) {
    return [];
  }

  const email = user.email.trim().toLowerCase();

  return getBookings().filter(booking => {
    const ownerEmail = (
      booking.ownerEmail || booking.customerEmail || ""
    ).trim().toLowerCase();

    return ownerEmail === email;
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function formatDate(dateString) {
  if (!dateString) return "Date not selected";

  const date = new Date(`${dateString}T12:00:00`);

  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
}

/* NAVIGATION + LOGOUT BUTTON */
function initNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const links = document.querySelector(".nav-links");
  const currentUser = getCurrentUser();

  let loggedIn = false;

  try {
    loggedIn =
      sessionStorage.getItem("cinebookLoggedIn") === "yes" &&
      !!currentUser;
  } catch (error) {}

  document.querySelectorAll(".nav-cta").forEach(link => {
    link.remove();
  });

  document.querySelectorAll(".logout-btn").forEach(button => {
    button.remove();
  });

  if (loggedIn) {
    document.querySelectorAll('a[href="auth.html"]').forEach(link => {
      link.remove();
    });

    const logoutButton = document.createElement("button");

    logoutButton.type = "button";
    logoutButton.className = "logout-btn";
    logoutButton.textContent = "Logout";
    logoutButton.setAttribute("aria-label", "Log out of CineBook");

    Object.assign(logoutButton.style, {
      backgroundColor: "#f3ca86",
      color: "#101114",
      border: "none",
      padding: "9px 18px",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      marginLeft: "12px",
      transition: "background-color 0.2s ease"
    });

    logoutButton.addEventListener("mouseenter", () => {
      logoutButton.style.backgroundColor = "#f3ca86";
    });

    logoutButton.addEventListener("mouseleave", () => {
      logoutButton.style.backgroundColor = "#f3ca86";
    });

    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("cinebookCurrentUser");
      sessionStorage.removeItem("cinebookLoggedIn");
      window.location.href = "auth.html";
    });

    if (links) {
      links.appendChild(logoutButton);
    } else {
      const nav = document.querySelector("nav");
      if (nav) nav.appendChild(logoutButton);
    }
  }

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "✕" : "☰";
    });
  }
}

function initYear() {
  document.querySelectorAll(".current-year").forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

/* MOVIE SEARCH */
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

    if (count) {
      count.textContent =
        `${visible} movie${visible === 1 ? "" : "s"} available`;
    }

    if (empty) {
      empty.classList.toggle("hidden", visible !== 0);
    }
  }

  search.addEventListener("input", update);
}

/* BOOKING FORM */
function initBookingForm() {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  const movieSelect = document.getElementById("movieSelect");
  const ticketCount = document.getElementById("ticketCount");
  const showDate = document.getElementById("showDate");
  const message = document.getElementById("formMessage");

  movieSelect.innerHTML =
    '<option value="">Select a movie</option>' +
    Object.entries(MOVIES).map(([name, movie]) =>
      `<option value="${escapeHTML(name)}">${escapeHTML(name)} — ₹${movie.price}</option>`
    ).join("");

  const params = new URLSearchParams(window.location.search);
  const requestedMovie = params.get("movie");

  if (requestedMovie && MOVIES[requestedMovie]) {
    movieSelect.value = requestedMovie;
  }

  const today = new Date();
  const localToday = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);

  showDate.min = localToday;

  const locationInput = document.getElementById("userLocation");
  const theatreSelect = document.getElementById("theatreSelect");
  const seatMap = document.getElementById("seatMap");
  const selectedSeatsInput = document.getElementById("selectedSeats");
  const seatStatus = document.getElementById("seatStatus");

  let selectedSeats = [];

  function theatreList() {
    if (!locationInput || !theatreSelect) return;

    const location = locationInput.value.trim().toLowerCase();

    const matches = location
      ? THEATRES.filter(t =>
          t.areas.some(area => location.includes(area))
        )
      : [];

    const options = matches.length
      ? matches
      : (location ? THEATRES.slice(0, 3) : []);

    theatreSelect.innerHTML =
      '<option value="">Select a nearby theatre</option>' +
      options.map((t, i) =>
        `<option value="${escapeHTML(t.name)}">${escapeHTML(t.name)}${i === 0 ? " · suggested match" : ""}</option>`
      ).join("");

    selectedSeats = [];
    renderSeats();
  }

  function renderSeats() {
    if (!seatMap) return;

    const timeInput = document.getElementById("showTime");

    const ready =
      locationInput &&
      locationInput.value.trim() &&
      theatreSelect &&
      theatreSelect.value &&
      showDate.value &&
      timeInput &&
      timeInput.value;

    const occupied = ready
      ? getBookedSeatsForShow(getSeatBookings(), {
          movie: movieSelect.value,
          location: locationInput.value,
          theatre: theatreSelect.value,
          showDate: showDate.value,
          showTime: timeInput.value
        })
      : new Set();

    selectedSeats = selectedSeats.filter(seat => !occupied.has(seat));

    seatMap.innerHTML = ready
      ? '<div class="screen-label">SCREEN</div><div class="seat-grid">' +
        SEATS.map(seat =>
          `<button type="button" class="seat ${occupied.has(seat) ? "occupied" : ""} ${selectedSeats.includes(seat) ? "chosen" : ""}" data-seat="${seat}" ${occupied.has(seat) ? "disabled" : ""} aria-label="Seat ${seat}${occupied.has(seat) ? ", unavailable" : ""}">${seat}</button>`
        ).join("") +
        '</div><div class="seat-legend"><span>Available</span><span>Selected</span><span>Booked</span></div>'
      : '<p class="seat-placeholder">Enter your location, choose a theatre, date and showtime to view seats.</p>';

    if (seatStatus) {
      seatStatus.textContent = ready
        ? `${occupied.size} booked · ${SEATS.length - occupied.size} available`
        : "Select a theatre, date and showtime first";
    }

    if (selectedSeatsInput) {
      selectedSeatsInput.value = selectedSeats.join(",");
    }
  }

  if (locationInput) {
    locationInput.addEventListener("input", theatreList);
  }

  if (theatreSelect) {
    theatreSelect.addEventListener("change", () => {
      selectedSeats = [];
      renderSeats();
    });
  }

  [
    showDate,
    document.getElementById("showTime"),
    movieSelect
  ].forEach(el => {
    if (el) {
      el.addEventListener("change", () => {
        selectedSeats = [];
        renderSeats();
      });
    }
  });

  if (seatMap) {
    seatMap.addEventListener("click", event => {
      const btn = event.target.closest("[data-seat]");

      if (!btn || btn.disabled) return;

      const seat = btn.dataset.seat;

      if (selectedSeats.includes(seat)) {
        selectedSeats = selectedSeats.filter(x => x !== seat);
      } else if (
        selectedSeats.length < Number(ticketCount.value || 1)
      ) {
        selectedSeats.push(seat);
      }

      renderSeats();
    });
  }

  ticketCount.addEventListener("change", () => {
    selectedSeats = selectedSeats.slice(
      0,
      Number(ticketCount.value || 1)
    );

    renderSeats();
  });

  renderSeats();

  // Update the seat map if another tab books or cancels a seat.
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
      renderSeats();
    }
  });

  function updateSummary() {
    const name = movieSelect.value;
    const movie = MOVIES[name];
    const quantity = Number(ticketCount.value || 1);
    const poster = document.getElementById("summaryPoster");

    const summaryMovie = document.getElementById("summaryMovie");
    const summaryGenre = document.getElementById("summaryGenre");
    const summaryPrice = document.getElementById("summaryPrice");
    const summaryTickets = document.getElementById("summaryTickets");
    const summaryTotal = document.getElementById("summaryTotal");
    const posterTitle = document.getElementById("summaryPosterTitle");

    if (summaryMovie) {
      summaryMovie.textContent = movie ? name : "Choose your movie";
    }

    if (summaryGenre) {
      summaryGenre.textContent =
        movie ? movie.genre : "Your selection will appear here";
    }

    if (summaryPrice) {
      summaryPrice.textContent = `₹${movie ? movie.price : 0}`;
    }

    if (summaryTickets) {
      summaryTickets.textContent = String(quantity);
    }

    if (summaryTotal) {
      summaryTotal.textContent =
        `₹${(movie ? movie.price : 0) * quantity}`;
    }

    if (poster) {
      poster.className =
        `summary-art ${movie ? movie.poster : "poster-interstellar"}`;

      const graphicByPoster = {
        "poster-interstellar": "graphic-space",
        "poster-inception": "graphic-city",
        "poster-darkknight": "graphic-bat",
        "poster-avengers": "graphic-energy"
      };

      const graphic = poster.querySelector(".poster-graphic");

      if (graphic) {
        graphic.className =
          `poster-graphic ${movie ? graphicByPoster[movie.poster] : "graphic-space"}`;
      }
    }

    if (posterTitle) {
      posterTitle.innerHTML =
        movie ? movie.title : "INTER<br>STELLAR";
    }
  }

  movieSelect.addEventListener("change", updateSummary);
  ticketCount.addEventListener("change", updateSummary);
  updateSummary();

  form.addEventListener("submit", async event => {
    event.preventDefault();

    message.className = "form-message hidden";

    const currentUser = getCurrentUser();

    if (
      !currentUser ||
      !currentUser.email ||
      sessionStorage.getItem("cinebookLoggedIn") !== "yes"
    ) {
      message.textContent = "Please log in before making a booking.";
      message.className = "form-message error";
      return;
    }

    const formData = new FormData(form);
    const name = String(formData.get("customerName") || "").trim();
    const email = String(formData.get("customerEmail") || "").trim();
    const movieName = String(formData.get("movie") || "");
    const date = String(formData.get("showDate") || "");
    const time = String(formData.get("showTime") || "");
    const quantity = Number(formData.get("ticketCount") || 1);

    if (
      !name ||
      !email ||
      !MOVIES[movieName] ||
      !date ||
      !time ||
      !quantity ||
      !locationInput ||
      !locationInput.value.trim() ||
      !theatreSelect ||
      !theatreSelect.value ||
      selectedSeats.length !== quantity
    ) {
      message.textContent =
        "Please complete all fields, select a theatre, and choose exactly as many seats as tickets.";
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
      ownerEmail: currentUser.email.trim().toLowerCase(),
      customerName: name,
      customerEmail: email,
      movie: movieName,
      showDate: date,
      showTime: time,
      ticketCount: quantity,
      location: locationInput.value.trim(),
      theatre: theatreSelect.value,
      seats: [...selectedSeats],
      pricePerTicket: movie.price,
      total: movie.price * quantity,
      createdAt: new Date().toISOString()
    };

    try {
      const result = await saveBookingIfAvailable(booking);

      if (!result.ok) {
        const conflicts = result.conflicts;
        selectedSeats = selectedSeats.filter(
          seat => !conflicts.includes(seat)
        );

        renderSeats();

        message.textContent =
          `Sorry, seat${conflicts.length > 1 ? "s" : ""} ${conflicts.join(", ")} just got booked. Please select different seat${conflicts.length > 1 ? "s" : ""}.`;
        message.className = "form-message error";
        return;
      }

      message.textContent =
        "Booking saved successfully! Opening your bookings...";
      message.className = "form-message success";

      form.reset();
      movieSelect.value = "";
      ticketCount.value = "1";
      selectedSeats = [];
      renderSeats();
      updateSummary();

      window.setTimeout(() => {
        window.location.href =
          `success.html?id=${encodeURIComponent(booking.id)}`;
      }, 700);
    } catch (error) {
      message.textContent =
        "Your browser could not save this booking. Please check your browser storage settings.";
      message.className = "form-message error";
    }
  });
}

/* LOGIN AND SIGNUP */
function initAuth() {
  const form = document.getElementById("authForm");
  if (!form) return;

  const mode = document.getElementById("authMode");
  const nameField = document.getElementById("authNameField");
  const heading = document.getElementById("authHeading");
  const submit = document.getElementById("authSubmit");
  const message = document.getElementById("authMessage");

  const loginButton = document.getElementById("showLogin");
  const signupButton = document.getElementById("showSignup");

  function setMode(value) {
    mode.value = value;

    const signup = value === "signup";

    nameField.classList.toggle("hidden", !signup);
    document.getElementById("authName").required = signup;

    heading.textContent = signup
      ? "Create your account"
      : "Welcome back.";

    submit.textContent = signup
      ? "Create account"
      : "Log in →";

    loginButton.className =
      `button ${signup ? "button-secondary" : "button-primary"}`;

    signupButton.className =
      `button ${signup ? "button-primary" : "button-secondary"}`;

    message.classList.add("hidden");
  }

  loginButton.addEventListener("click", () => setMode("login"));
  signupButton.addEventListener("click", () => setMode("signup"));
  mode.addEventListener("change", () => setMode(mode.value));

  setMode("login");

  form.addEventListener("submit", event => {
    event.preventDefault();

    const email = document.getElementById("authEmail")
      .value.trim().toLowerCase();

    const password = document.getElementById("authPassword").value;
    const signup = mode.value === "signup";

    let users = [];

    try {
      users = JSON.parse(localStorage.getItem("cinebookUsers") || "[]");
      if (!Array.isArray(users)) users = [];
    } catch (error) {
      users = [];
    }

    const found = users.find(u => u.email === email);

    if (signup) {
      if (found) {
        message.textContent =
          "An account with this email already exists. Please log in instead.";
        message.className = "form-message error";
        return;
      }

      const name = document.getElementById("authName").value.trim();

      if (!name) {
        message.textContent = "Please enter your name.";
        message.className = "form-message error";
        return;
      }

      users.push({ name, email, password });

      try {
        localStorage.setItem("cinebookUsers", JSON.stringify(users));
      } catch (error) {
        message.textContent =
          "Could not save your account in this browser. Check storage settings.";
        message.className = "form-message error";
        return;
      }

      localStorage.removeItem("cinebookCurrentUser");
      sessionStorage.removeItem("cinebookLoggedIn");

      form.reset();
      setMode("login");

      document.getElementById("authEmail").value = email;

      message.textContent =
        "Account created successfully. Please log in with your email and password.";
      message.className = "form-message success";
      return;
    }

    if (!found || found.password !== password) {
      message.textContent =
        "Email or password is incorrect. If you're new, choose Sign up.";
      message.className = "form-message error";
      return;
    }

    localStorage.setItem(
      "cinebookCurrentUser",
      JSON.stringify({
        name: found.name,
        email: found.email
      })
    );

    sessionStorage.setItem("cinebookLoggedIn", "yes");

    message.textContent = "Login successful! Opening home page...";
    message.className = "form-message success";

    setTimeout(() => {
      location.href = "index.html";
    }, 400);
  });
}

/* BOOKING CONFIRMATION: OWNER ONLY */
function initSuccess() {
  const target = document.getElementById("successDetails");
  if (!target) return;

  const id = new URLSearchParams(location.search).get("id");
  const booking = getMyBookings().find(b => b.id === id);

  if (!booking) {
    target.innerHTML =
      "<p>Your booking confirmation could not be found for your account.</p>";
    return;
  }

  target.innerHTML = `
    <h2>${escapeHTML(booking.movie)}</h2>
    <p><strong>Booking ID:</strong> ${escapeHTML(booking.id)}</p>
    <p><strong>Theatre:</strong> ${escapeHTML(booking.theatre || "—")}</p>
    <p><strong>Location:</strong> ${escapeHTML(booking.location || "—")}</p>
    <p><strong>Date & time:</strong> ${escapeHTML(formatDate(booking.showDate))} · ${escapeHTML(booking.showTime)}</p>
    <p><strong>Seats:</strong> ${escapeHTML((booking.seats || []).join(", "))}</p>
    <p><strong>Tickets:</strong> ${booking.ticketCount} · <strong>Total:</strong> ₹${booking.total}</p>
  `;
}

/* MY BOOKINGS: CURRENT USER'S BOOKINGS ONLY */
function initBookingsList() {
  const list = document.getElementById("bookingsList");
  if (!list) return;

  const empty = document.getElementById("emptyBookings");
  const count = document.getElementById("bookingCount");

  function render() {
    const bookings = getMyBookings();

    if (empty) empty.classList.toggle("hidden", bookings.length !== 0);
    list.classList.toggle("hidden", bookings.length === 0);

    if (count) {
      count.textContent =
        `${bookings.length} reservation${bookings.length === 1 ? "" : "s"} saved on this browser.`;
    }

    list.innerHTML = bookings.map(booking => {
      const movie = MOVIES[booking.movie] || MOVIES.Interstellar;
      const quantity = Number(booking.ticketCount || 1);
      const total = Number(booking.total || movie.price * quantity);

      return `
        <article class="booking-item">
          <div class="booking-thumb ${movie.poster}"></div>

          <div class="booking-info">
            <h3>${escapeHTML(booking.movie)}</h3>

            <p>
              Booked by ${escapeHTML(booking.customerName)}
              · ${escapeHTML(booking.customerEmail)}
            </p>

            <div class="booking-details">
              <span class="detail-chip">▦ ${escapeHTML(formatDate(booking.showDate))}</span>
              <span class="detail-chip">◷ ${escapeHTML(booking.showTime)}</span>
              <span class="detail-chip">♙ ${quantity} ticket${quantity === 1 ? "" : "s"}</span>
              <span class="detail-chip">⌖ ${escapeHTML(booking.theatre || "Theatre not saved")}</span>
              <span class="detail-chip">Seats: ${escapeHTML((booking.seats || []).join(", ") || "Not recorded")}</span>
              <span class="detail-chip">ID: ${escapeHTML(booking.id || "CineBook")}</span>
            </div>
          </div>

          <div class="booking-item-side">
            <strong class="booking-total">₹${total}</strong>

            <button
              class="cancel-booking"
              type="button"
              data-cancel="${escapeHTML(booking.id)}"
            >
              Cancel booking
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  list.addEventListener("click", event => {
    const button = event.target.closest("[data-cancel]");
    if (!button) return;

    const id = button.getAttribute("data-cancel");

    if (!window.confirm("Cancel this booking?")) return;

    const myBookings = getMyBookings();

    const ownsBooking = myBookings.some(
      booking => String(booking.id) === String(id)
    );

    if (!ownsBooking) {
      render();
      return;
    }

    const currentEmail = getCurrentUser()?.email?.trim().toLowerCase();

    saveBookings(
      getBookings().filter(booking => {
        const ownerEmail = (
          booking.ownerEmail || booking.customerEmail || ""
        ).trim().toLowerCase();

        return !(
          ownerEmail === currentEmail &&
          String(booking.id) === String(id)
        );
      })
    );

    render();
  });

  render();
}

/* REQUIRE LOGIN */
function enforceLogin() {
  const page = (
    location.pathname.split("/").pop() || "index.html"
  ).toLowerCase();

  if (page === "auth.html") return;

  let loggedIn = false;

  try {
    loggedIn =
      sessionStorage.getItem("cinebookLoggedIn") === "yes" &&
      !!getCurrentUser();
  } catch (error) {}

  if (!loggedIn) {
    location.replace("auth.html");
  }
}

/* START APPLICATION */
document.addEventListener("DOMContentLoaded", () => {
  enforceLogin();
  initNavigation();
  initYear();
  initMovieSearch();
  initBookingForm();
  initBookingsList();
  initAuth();
  initSuccess();
});

