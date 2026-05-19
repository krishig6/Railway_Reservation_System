const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Railway Reservation API is running");
});

app.get("/api/trains", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM Train");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/trains/search", async (req, res) => {
  try {
    const { source, destination, journeyDate } = req.query;

    const [rows] = await db.query(
      `
      SELECT
        t.train_id,
        t.train_name,
        t.train_type,
        t.source_station,
        t.destination_station,
        t.total_coaches,
        s.schedule_id,
        s.journey_date,
        s.departure_time,
        s.arrival_time
      FROM train t
      JOIN schedule s ON t.train_id = s.train_id
      WHERE LOWER(t.source_station) LIKE LOWER(?)
        AND LOWER(t.destination_station) LIKE LOWER(?)
        AND s.journey_date = ?
      ORDER BY s.departure_time
      `,
      [`%${source}%`, `%${destination}%`, journeyDate]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Search failed" });
  }
});

app.get("/api/admin/summary", async (req, res) => {
  try {
    const [[passengerCount]] = await db.query(
      "SELECT COUNT(*) AS total FROM passenger"
    );
    const [[bookingCount]] = await db.query(
      "SELECT COUNT(*) AS total FROM booking"
    );
    const [[paymentCount]] = await db.query(
      "SELECT COUNT(*) AS total FROM payment"
    );
    const [[cancelledCount]] = await db.query(
      "SELECT COUNT(*) AS total FROM ticket WHERE status = 'Cancelled'"
    );

    res.json({
      totalPassengers: passengerCount.total,
      totalBookings: bookingCount.total,
      totalPayments: paymentCount.total,
      cancelledTickets: cancelledCount.total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch admin summary" });
  }
});
app.post("/api/bookings", async (req, res) => {
  try {
    const { passenger, train, journeyDate, seatId } = req.body;

    const [[seatCheck]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM booking b
      JOIN ticket tk ON tk.passenger_id = b.passenger_id
        AND tk.train_id = b.train_id
        AND tk.journey_date = ?
      WHERE b.train_id = ?
        AND b.seat_id = ?
        AND tk.status <> 'Cancelled'
      `,
      [journeyDate, train.train_id, seatId]
    );

    if (seatCheck.count > 0) {
      return res.status(400).json({ error: "Seat already booked" });
    }



    const [[passengerIdRow]] = await db.query(
  "SELECT COALESCE(MAX(passenger_id), 0) + 1 AS next_id FROM passenger"
);

const passengerId = passengerIdRow.next_id;

await db.query(
  `
  INSERT INTO passenger (passenger_id, name, age, gender, phone, email)
  VALUES (?, ?, ?, ?, ?, ?)
  `,
  [
    passengerId,
    passenger.name,
    passenger.age,
    passenger.gender,
    passenger.phone,
    passenger.email
  ]
);


   const [[bookingIdRow]] = await db.query(
  "SELECT COALESCE(MAX(booking_id), 0) + 1 AS next_id FROM booking"
);

const bookingId = bookingIdRow.next_id;

await db.query(
  `
  INSERT INTO booking (booking_id, passenger_id, train_id, email, seats_booked, booking_date, seat_id)
VALUES (?, ?, ?, ?, ?, CURDATE(), ?)

  `,
 [bookingId, passengerId, train.train_id, passenger.email, 1, seatId]

);


   const [[ticketIdRow]] = await db.query(
  "SELECT COALESCE(MAX(ticket_id), 0) + 1 AS next_id FROM ticket"
);

const ticketId = ticketIdRow.next_id;

await db.query(
  `
 INSERT INTO ticket 
(ticket_id, booking_date, journey_date, status, total_fare, passenger_id, train_id)
VALUES (?, CURDATE(), ?, 'Confirmed', 500.00, ?, ?)

  `,
  [ticketId, journeyDate, passengerId, train.train_id]

);


    res.json({
      message: "Booking confirmed",
      passenger_id: passengerId,
      booking_id: bookingId,
      ticket_id: ticketId

    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Booking failed" });
  }
});

app.post("/api/payments", async (req, res) => {
  try {
    const { ticketId, paymentMode, amount } = req.body;

    const [[paymentIdRow]] = await db.query(
      "SELECT COALESCE(MAX(payment_id), 0) + 1 AS next_id FROM payment"
    );

    const paymentId = paymentIdRow.next_id;

    await db.query(
      `
      INSERT INTO payment (payment_id, payment_mode, amount, payment_status, ticket_id)
      VALUES (?, ?, ?, 'Paid', ?)
      `,
      [paymentId, paymentMode, amount, ticketId]
    );

    res.json({
      message: "Payment successful",
      payment_id: paymentId,
      payment_status: "Paid"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Payment failed" });
  }
});
app.get("/api/bookings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        b.booking_id,
        p.name,
        p.email,
        t.train_name,
        t.source_station,
        t.destination_station,
        tk.ticket_id,
        tk.journey_date,
        tk.status,
        tk.total_fare,
        py.payment_id,
        py.payment_mode,
        py.payment_status
      FROM booking b
      JOIN passenger p ON b.passenger_id = p.passenger_id
      JOIN train t ON b.train_id = t.train_id
      JOIN ticket tk ON tk.passenger_id = p.passenger_id
      LEFT JOIN payment py ON py.ticket_id = tk.ticket_id
      WHERE p.email = ?
      ORDER BY b.booking_id DESC
      `,
      [email]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch bookings" });
  }
});
app.post("/api/trains", async (req, res) => {
  try {
    const {
      train_name,
      train_type,
      source_station,
      destination_station,
      total_coaches
    } = req.body;

    const [[trainIdRow]] = await db.query(
      "SELECT COALESCE(MAX(train_id), 0) + 1 AS next_id FROM train"
    );

    const trainId = trainIdRow.next_id;

    await db.query(
      `
      INSERT INTO train 
      (train_id, train_name, train_type, source_station, destination_station, total_coaches)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        trainId,
        train_name,
        train_type,
        source_station,
        destination_station,
        total_coaches
      ]
    );
    const [[seatIdRow]] = await db.query(
  "SELECT COALESCE(MAX(seat_id), 0) + 1 AS next_id FROM seat"
);

let nextSeatId = seatIdRow.next_id;

const defaultSeats = [
  { coach_no: "A1", seat_no: 1, seat_type: "AC" },
  { coach_no: "A1", seat_no: 2, seat_type: "AC" },
  { coach_no: "A1", seat_no: 3, seat_type: "AC" },
  { coach_no: "S1", seat_no: 1, seat_type: "Sleeper" },
  { coach_no: "S1", seat_no: 2, seat_type: "Sleeper" },
  { coach_no: "S1", seat_no: 3, seat_type: "Sleeper" },
  { coach_no: "GEN1", seat_no: 1, seat_type: "General" },
  { coach_no: "GEN1", seat_no: 2, seat_type: "General" },
  { coach_no: "GEN1", seat_no: 3, seat_type: "General" }
];

for (const seat of defaultSeats) {
  await db.query(
    `
    INSERT INTO seat (seat_id, coach_no, seat_no, seat_type, train_id)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      nextSeatId,
      seat.coach_no,
      seat.seat_no,
      seat.seat_type,
      trainId
    ]
  );

  nextSeatId++;
}


    res.json({
  message: "Train added successfully",
  train_id: trainId,
  seats_created: defaultSeats.length
});

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not add train" });
  }
});
app.put("/api/tickets/:ticketId/cancel", async (req, res) => {
  try {
    const { ticketId } = req.params;

    const [result] = await db.query(
      `
      UPDATE ticket
      SET status = 'Cancelled'
      WHERE ticket_id = ?
      `,
      [ticketId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({
      message: "Ticket cancelled successfully",
      ticket_id: ticketId,
      status: "Cancelled"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not cancel ticket" });
  }
});
app.get("/api/trains/:trainId/seats", async (req, res) => {
  try {
    const { trainId } = req.params;
    const { journeyDate } = req.query;

    const [rows] = await db.query(
      `
      SELECT s.seat_id, s.coach_no, s.seat_no, s.seat_type
      FROM seat s
      WHERE s.train_id = ?
        AND (
          ? IS NULL
          OR s.seat_id NOT IN (
            SELECT b.seat_id
            FROM booking b
            JOIN ticket tk ON tk.passenger_id = b.passenger_id
              AND tk.train_id = b.train_id
              AND tk.journey_date = ?
            WHERE b.train_id = ?
              AND b.seat_id IS NOT NULL
              AND tk.status <> 'Cancelled'
          )
        )
      ORDER BY coach_no, seat_no
      `,
      [trainId, journeyDate || null, journeyDate || null, trainId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not fetch seats" });
  }
});
app.put("/api/trains/:trainId", async (req, res) => {
  try {
    const { trainId } = req.params;
    const {
      train_name,
      train_type,
      source_station,
      destination_station,
      total_coaches
    } = req.body;

    const [result] = await db.query(
      `
      UPDATE train
      SET train_name = ?, train_type = ?, source_station = ?, destination_station = ?, total_coaches = ?
      WHERE train_id = ?
      `,
      [train_name, train_type, source_station, destination_station, total_coaches, trainId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Train not found" });
    }

    res.json({ message: "Train updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not update train" });
  }
});
app.delete("/api/trains/:trainId", async (req, res) => {
  try {
    const { trainId } = req.params;

    const [[bookingCheck]] = await db.query(
      "SELECT COUNT(*) AS count FROM booking WHERE train_id = ?",
      [trainId]
    );

    if (bookingCheck.count > 0) {
      return res.status(400).json({
        error: "Cannot delete train because bookings exist for it"
      });
    }

    await db.query("DELETE FROM seat WHERE train_id = ?", [trainId]);
    await db.query("DELETE FROM schedule WHERE train_id = ?", [trainId]);

    const [result] = await db.query(
      "DELETE FROM train WHERE train_id = ?",
      [trainId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Train not found" });
    }

    res.json({ message: "Train deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete train" });
  }
});


app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on http://localhost:3000");
});
