import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [mode, setMode] = useState("passenger");
  const [trains, setTrains] = useState([]);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [confirmedTicket, setConfirmedTicket] = useState(null);
  const [journeyDate, setJourneyDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [myBookings, setMyBookings] = useState([]);
  const [cancelTicketId, setCancelTicketId] = useState("");
  const [cancelMessage, setCancelMessage] = useState("");
  const [seats, setSeats] = useState([]);
  const [selectedSeatId, setSelectedSeatId] = useState("");
  const [selectedSeatType, setSelectedSeatType] = useState("");
  const [selectedCoachNo, setSelectedCoachNo] = useState("");
  const [selectedSeatNo, setSelectedSeatNo] = useState("");
  const [editingTrain, setEditingTrain] = useState(null);
  const [toast, setToast] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(""); // "passenger" or "admin"
  const [adminSummary, setAdminSummary] = useState({
    totalPassengers: 0,
    totalBookings: 0,
    totalPayments: 0,
    cancelledTickets: 0
  });

  const [newTrain, setNewTrain] = useState({
    train_name: "",
    train_type: "",
    source_station: "",
    destination_station: "",
    total_coaches: ""
  });

  const [passenger, setPassenger] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    email: ""
  });

  useEffect(() => {
    loadTrains();
  }, []);

  useEffect(() => {
    if (selectedTrain && journeyDate) {
      loadSeats(selectedTrain.train_id, journeyDate);
    }
  }, [selectedTrain, journeyDate]);

  useEffect(() => {
    if (mode === "admin") {
      loadAdminSummary();
    }
  }, [mode]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }

  function loadTrains() {
    fetch("http://localhost:3000/api/trains")
      .then((res) => res.json())
      .then((data) => setTrains(data))
      .catch((err) => console.error(err));
  }

  function loadAdminSummary() {
    fetch("http://localhost:3000/api/admin/summary")
      .then((res) => res.json())
      .then((data) => setAdminSummary(data))
      .catch((err) => console.error(err));
  }

  async function searchTrains(e) {
    e.preventDefault();

    try {
      const params = new URLSearchParams({
        source,
        destination,
        journeyDate: searchDate
      });

      const res = await fetch(`http://localhost:3000/api/trains/search?${params}`);
      const data = await res.json();

      if (!res.ok) {
        showToast("Could not search trains", "error");
        return;
      }

      setTrains(data);
    } catch (error) {
      console.error(error);
      showToast("Something went wrong while searching trains", "error");
    }
  }

  function handlePassengerChange(e) {
    const { name, value } = e.target;

    setPassenger({
      ...passenger,
      [name]: value
    });
  }

  async function confirmBooking(e) {
    e.preventDefault();

    const today = new Date().toISOString().split("T")[0];

    if (Number(passenger.age) <= 0) {
      showToast("Age must be a positive number", "error");
      return;
    }

    if (!/^\d{10}$/.test(passenger.phone)) {
      showToast("Phone number must be exactly 10 digits", "error");
      return;
    }

    if (journeyDate < today) {
      showToast("Journey date cannot be in the past", "error");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          passenger,
          train: selectedTrain,
          journeyDate,
          seatId: selectedSeat?.seat_id || selectedSeatId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast("Booking failed", "error");
        return;
      }

      setConfirmedTicket({
        ticketId: data.ticket_id,
        bookingId: data.booking_id,
        passengerName: passenger.name,
        trainName: selectedTrain.train_name,
        status: "Confirmed",
        fare: 500,
        journeyDate
      });

      showToast(`Booking confirmed. Ticket ID: ${data.ticket_id}`, "success");

      setSelectedTrain(null);
      setPassenger({
        name: "",
        age: "",
        gender: "",
        phone: "",
        email: ""
      });
      setJourneyDate("");
      setSelectedSeatId("");
      setSelectedSeatType("");
      setSelectedCoachNo("");
      setSelectedSeatNo("");
    } catch (error) {
      console.error(error);
      showToast("Something went wrong", "error");
    }
  }

  async function makePayment(e) {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3000/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ticketId: confirmedTicket.ticketId,
          paymentMode,
          amount: confirmedTicket.fare
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast("Payment failed", "error");
        return;
      }

      setPaymentStatus(data.payment_status);

      showToast(`Payment successful. Payment ID: ${data.payment_id}`, "success");
    } catch (error) {
      console.error(error);
      showToast("Something went wrong during payment", "error");
    }
  }

  async function viewBookings(e) {
    e.preventDefault();

    try {
      const res = await fetch(`http://localhost:3000/api/bookings/${lookupEmail}`);
      const data = await res.json();

      if (!res.ok) {
        showToast("Could not fetch bookings", "error");
        return;
      }

      setMyBookings(data);
    } catch (error) {
      console.error(error);
      showToast("Something went wrong while fetching bookings", "error");
    }
  }

  function handleNewTrainChange(e) {
    const { name, value } = e.target;

    setNewTrain({
      ...newTrain,
      [name]: value
    });
  }

  async function addTrain(e) {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3000/api/trains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newTrain)
      });

      const data = await res.json();

      if (!res.ok) {
        showToast("Could not add train", "error");
        return;
      }

      showToast(`Train added. Train ID: ${data.train_id}`, "success");

      setNewTrain({
        train_name: "",
        train_type: "",
        source_station: "",
        destination_station: "",
        total_coaches: ""
      });

      loadTrains();
    } catch (error) {
      console.error(error);
      showToast("Something went wrong while adding train", "error");
    }
  }

  async function cancelTicket(e) {
    e.preventDefault();

    try {
      const res = await fetch(
        `http://localhost:3000/api/tickets/${cancelTicketId}/cancel`,
        {
          method: "PUT"
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast("Ticket not found or could not be cancelled", "error");
        return;
      }

      setCancelMessage(`Ticket ${data.ticket_id} has been ${data.status}`);
      setCancelTicketId("");
      loadAdminSummary();
    } catch (error) {
      console.error(error);
      showToast("Something went wrong while cancelling ticket", "error");
    }
  }

  async function chooseTrain(train) {
    setSelectedTrain(train);
    setJourneyDate(train.journey_date || "");
    setSelectedSeatId("");
    setSelectedSeatType("");
    setSelectedCoachNo("");
    setSelectedSeatNo("");

    if (train.journey_date) {
      loadSeats(train.train_id, train.journey_date);
    } else {
      setSeats([]);
    }
  }

  async function loadSeats(trainId, date) {
    try {
      const params = new URLSearchParams({ journeyDate: date });
      const res = await fetch(
        `http://localhost:3000/api/trains/${trainId}/seats?${params}`
      );
      const data = await res.json();
      setSeats(data);
    } catch (error) {
      console.error(error);
      showToast("Could not load seats", "error");
    }
  }

  function startEditTrain(train) {
    setEditingTrain({ ...train });
  }

  function handleEditTrainChange(e) {
    const { name, value } = e.target;

    setEditingTrain({
      ...editingTrain,
      [name]: value
    });
  }

  async function updateTrain(e) {
    e.preventDefault();

    const res = await fetch(
      `http://localhost:3000/api/trains/${editingTrain.train_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editingTrain)
      }
    );

    if (!res.ok) {
      showToast("Could not update train", "error");
      return;
    }

    showToast("Train updated", "success");
    setEditingTrain(null);
    loadTrains();
  }

  async function deleteTrain(trainId) {
    const confirmed = confirm("Are you sure you want to delete this train?");

    if (!confirmed) return;

    const res = await fetch(`http://localhost:3000/api/trains/${trainId}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Could not delete train", "error");
      return;
    }

    showToast("Train deleted", "success");
    loadTrains();
  }

  const seatTypes = [...new Set(seats.map((seat) => seat.seat_type))];

  const coachOptions = [
    ...new Set(
      seats
        .filter((seat) => !selectedSeatType || seat.seat_type === selectedSeatType)
        .map((seat) => seat.coach_no)
    )
  ];

  const seatNoOptions = seats.filter((seat) => {
    return (
      (!selectedSeatType || seat.seat_type === selectedSeatType) &&
      (!selectedCoachNo || seat.coach_no === selectedCoachNo)
    );
  });

  const selectedSeat = seats.find((seat) => {
    return (
      seat.seat_type === selectedSeatType &&
      seat.coach_no === selectedCoachNo &&
      String(seat.seat_no) === String(selectedSeatNo)
    );
  });
if (!isLoggedIn) {
  return (
    <div className="app">
      <h1>Railway Reservation System</h1>

      <div className="login-card">
        <h2>Select Mode</h2>

        <button
          className="login-btn passenger"
          onClick={() => {
            setUserType("passenger");
            setMode("passenger");
            setIsLoggedIn(true);
          }}
        >
          Passenger Login
        </button>

        <button
          className="login-btn admin"
          onClick={() => {
            setUserType("admin");
            setMode("admin");
            setIsLoggedIn(true);
          }}
        >
          Admin Login
        </button>
      </div>
    </div>
  );
}


  return (
    <div className="app">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.type === "error" ? "Error" : "Success"}</span>
          <p>{toast.message}</p>
        </div>
      )}
      <h1>Railway Reservation System</h1>

     <div className="logout-container">
  <button
    className="login-btn"
    onClick={() => {
      setIsLoggedIn(false);
      setUserType("");
    }}
  >
    Logout
  </button>
</div>

      <div className="mode-switch">
  <button
    disabled={userType !== "passenger"}
    className={mode === "passenger" ? "active-mode" : ""}
    onClick={() => setMode("passenger")}
  >
    Passenger Mode
  </button>

  <button
    disabled={userType !== "admin"}
    className={mode === "admin" ? "active-mode" : ""}
    onClick={() => setMode("admin")}
  >
    Admin Mode
  </button>
</div>

      {mode === "passenger" && (
        <>
          <form className="search-form" onSubmit={searchTrains}>
            <input
              type="text"
              placeholder="Source station"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <input
              type="text"
              placeholder="Destination station"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              required
            />
            <button type="submit">Search</button>
            <button
              type="button"
              onClick={() => {
                setSource("");
                setDestination("");
                setSearchDate("");
                loadTrains();
              }}
            >
              Show All
            </button>
          </form>

          {selectedTrain && (
            <div className="booking-section">
              <h2>Book Ticket</h2>
              <p>
                Selected Train: <strong>{selectedTrain.train_name}</strong>
              </p>

              <form className="booking-form" onSubmit={confirmBooking}>
                <input
                  type="text"
                  name="name"
                  placeholder="Passenger name"
                  value={passenger.name}
                  onChange={handlePassengerChange}
                  required
                />
                <input
                  type="number"
                  name="age"
                  placeholder="Age"
                  value={passenger.age}
                  onChange={handlePassengerChange}
                  min="1"
                  required
                />
                <select
                  name="gender"
                  value={passenger.gender}
                  onChange={handlePassengerChange}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="text"
                  name="phone"
                  placeholder="Phone"
                  value={passenger.phone}
                  onChange={handlePassengerChange}
                  pattern="[0-9]{10}"
                  maxLength="10"
                  title="Phone number must be exactly 10 digits"
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={passenger.email}
                  onChange={handlePassengerChange}
                  required
                />
                <input
                  type="date"
                  value={journeyDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setJourneyDate(e.target.value);
                    setSelectedSeatId("");
                    setSelectedSeatType("");
                    setSelectedCoachNo("");
                    setSelectedSeatNo("");
                  }}
                  required
                />
                <select
                  value={selectedSeatType}
                  onChange={(e) => {
                    setSelectedSeatType(e.target.value);
                    setSelectedCoachNo("");
                    setSelectedSeatNo("");
                  }}
                  required
                >
                  <option value="">Select seat type</option>
                  {seatTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedCoachNo}
                  onChange={(e) => {
                    setSelectedCoachNo(e.target.value);
                    setSelectedSeatNo("");
                  }}
                  required
                >
                  <option value="">Select coach</option>
                  {coachOptions.map((coach) => (
                    <option key={coach} value={coach}>
                      Coach {coach}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedSeatNo}
                  onChange={(e) => setSelectedSeatNo(e.target.value)}
                  required
                >
                  <option value="">Select seat no</option>
                  {seatNoOptions.map((seat) => (
                    <option key={seat.seat_id} value={seat.seat_no}>
                      Seat {seat.seat_no}
                    </option>
                  ))}
                </select>
                <button type="submit">Confirm Booking</button>
              </form>
            </div>
          )}

          {confirmedTicket && (
            <div className="ticket-section">
              <h2>Ticket Confirmed</h2>
              <p>
                <strong>Ticket ID:</strong> {confirmedTicket.ticketId}
              </p>
              <p>
                <strong>Booking ID:</strong> {confirmedTicket.bookingId}
              </p>
              <p>
                <strong>Passenger:</strong> {confirmedTicket.passengerName}
              </p>
              <p>
                <strong>Train:</strong> {confirmedTicket.trainName}
              </p>
              <p>
                <strong>Journey Date:</strong> {confirmedTicket.journeyDate}
              </p>
              <p>
                <strong>Status:</strong> {confirmedTicket.status}
              </p>
              <p>
                <strong>Total Fare:</strong> Rs.{confirmedTicket.fare}
              </p>
            </div>
          )}

          {confirmedTicket && !paymentStatus && (
            <div className="payment-section">
              <h2>Payment</h2>
              <form className="payment-form" onSubmit={makePayment}>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  required
                >
                  <option value="">Select payment mode</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cash">Cash</option>
                </select>
                <p>
                  <strong>Amount:</strong> Rs.{confirmedTicket.fare}
                </p>
                <button type="submit">Pay Now</button>
              </form>
            </div>
          )}

          {paymentStatus && (
            <div className="payment-success">
              <h2>Payment Successful</h2>
              <p>
                <strong>Status:</strong> {paymentStatus}
              </p>
            </div>
          )}

          <div className="cancel-section">
            <h2>Cancel Ticket</h2>
            <form className="cancel-form" onSubmit={cancelTicket}>
              <input
                type="number"
                placeholder="Enter ticket ID"
                value={cancelTicketId}
                onChange={(e) => setCancelTicketId(e.target.value)}
                required
              />
              <button type="submit">Cancel Ticket</button>
            </form>
            {cancelMessage && <p className="cancel-message">{cancelMessage}</p>}
          </div>

          <div className="lookup-section">
            <h2>View My Bookings</h2>
            <form className="lookup-form" onSubmit={viewBookings}>
              <input
                type="email"
                placeholder="Enter your email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                required
              />
              <button type="submit">View Bookings</button>
            </form>

            {myBookings.length > 0 && (
              <div className="booking-results">
                {myBookings.map((booking) => (
                  <div className="booking-result-card" key={booking.booking_id}>
                    <h3>{booking.train_name}</h3>
                    <p>
                      <strong>Passenger:</strong> {booking.name}
                    </p>
                    <p>
                      <strong>From:</strong> {booking.source_station}
                    </p>
                    <p>
                      <strong>To:</strong> {booking.destination_station}
                    </p>
                    <p>
                      <strong>Journey Date:</strong> {booking.journey_date}
                    </p>
                    <p>
                      <strong>Ticket ID:</strong> {booking.ticket_id}
                    </p>
                    <p>
                      <strong>Ticket Status:</strong> {booking.status}
                    </p>
                    <p>
                      <strong>Fare:</strong> Rs.{booking.total_fare}
                    </p>
                    <p>
                      <strong>Payment:</strong>{" "}
                      {booking.payment_status || "Not paid"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {mode === "admin" && (
        <>
          <div className="admin-summary">
            <div className="summary-card">
              <span>Total Passengers</span>
              <strong>{adminSummary.totalPassengers}</strong>
            </div>
            <div className="summary-card">
              <span>Total Bookings</span>
              <strong>{adminSummary.totalBookings}</strong>
            </div>
            <div className="summary-card">
              <span>Total Payments</span>
              <strong>{adminSummary.totalPayments}</strong>
            </div>
            <div className="summary-card">
              <span>Cancelled Tickets</span>
              <strong>{adminSummary.cancelledTickets}</strong>
            </div>
          </div>

          <div className="admin-section">
            <h2>Admin: Add Train</h2>
            <form className="admin-form" onSubmit={addTrain}>
              <input
                type="text"
                name="train_name"
                placeholder="Train name"
                value={newTrain.train_name}
                onChange={handleNewTrainChange}
                required
              />
              <input
                type="text"
                name="train_type"
                placeholder="Train type"
                value={newTrain.train_type}
                onChange={handleNewTrainChange}
                required
              />
              <input
                type="text"
                name="source_station"
                placeholder="Source station"
                value={newTrain.source_station}
                onChange={handleNewTrainChange}
                required
              />
              <input
                type="text"
                name="destination_station"
                placeholder="Destination station"
                value={newTrain.destination_station}
                onChange={handleNewTrainChange}
                required
              />
              <input
                type="number"
                name="total_coaches"
                placeholder="Total coaches"
                value={newTrain.total_coaches}
                onChange={handleNewTrainChange}
                required
              />
              <button type="submit">Add Train</button>
            </form>
          </div>

          {editingTrain && (
            <div className="admin-section">
              <h2>Admin: Update Train</h2>
              <form className="admin-form" onSubmit={updateTrain}>
                <input
                  name="train_name"
                  value={editingTrain.train_name}
                  onChange={handleEditTrainChange}
                  required
                />
                <input
                  name="train_type"
                  value={editingTrain.train_type}
                  onChange={handleEditTrainChange}
                  required
                />
                <input
                  name="source_station"
                  value={editingTrain.source_station}
                  onChange={handleEditTrainChange}
                  required
                />
                <input
                  name="destination_station"
                  value={editingTrain.destination_station}
                  onChange={handleEditTrainChange}
                  required
                />
                <input
                  name="total_coaches"
                  type="number"
                  value={editingTrain.total_coaches}
                  onChange={handleEditTrainChange}
                  required
                />
                <button type="submit">Update Train</button>
                <button type="button" onClick={() => setEditingTrain(null)}>
                  Cancel
                </button>
              </form>
            </div>
          )}
        </>
      )}

      <h2>Available Trains</h2>
      <div className="train-list">
        {trains.map((train) => (
          <div className="train-card" key={train.train_id}>
            <h3>{train.train_name}</h3>
            <p>Type: {train.train_type}</p>
            <p>From: {train.source_station}</p>
            <p>To: {train.destination_station}</p>
            <p>Total Coaches: {train.total_coaches}</p>
            {train.journey_date && <p>Journey Date: {train.journey_date}</p>}
            {train.departure_time && <p>Departure: {train.departure_time}</p>}
            {train.arrival_time && <p>Arrival: {train.arrival_time}</p>}

            {mode === "passenger" && (
              <button onClick={() => chooseTrain(train)}>Book Ticket</button>
            )}

            {mode === "admin" && (
              <>
                <button onClick={() => startEditTrain(train)}>Edit</button>
                <button onClick={() => deleteTrain(train.train_id)}>Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;







