const express = require('express');
const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const User = require('./models/User');
const Update = require('./models/Update'); // Added this line
const admin = require('./FirebaseAdmin');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGOURI)
  .then(() => console.log("MongoDB Connected"))
  .catch(() => console.log("Connection error"));

// --- SOCKET.IO SETUP ---
const server = http.createServer(app); // IMPORTANT: Attach HTTP server to socket.io
const io = socketIo(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('newUpdate', (update) => {
    io.emit('updatePosted', update); // Broadcast to all clients
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.set('socketio', io); // Optional, if you need it elsewhere

// --- USER APIs ---
app.post('/register', async (req, res) => {
  const { username, name, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const newUser = new User({ username, name, password });
    await newUser.save();

    return res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed.", error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    return res.status(200).json({ message: "Login successful", user: { username: user.username, name: user.name } });
  } catch (error) {
    return res.status(500).json({ message: "Login failed.", error: error.message });
  }
});

// --- ASSIGNMENT APIs ---
app.post("/addAssignment", async (req, res) => {
  try {
    const { assignmentName, dueDate, noOfQuestions, technology } = req.body;

    const newAssignment = new Assignment({
      assignmentName,
      dueDate,
      noOfQuestions,
      technology
    });

    await newAssignment.save();

    const formatedDate = new Date(dueDate);

    const message = {
      notification: {
        title: "📢 New Assignment Posted",
        body: `${assignmentName} is now live. Due on ${formatedDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        })}`,
      },
      topic: "all"
    };

    await admin.messaging().send(message);

    return res.status(201).json({ message: "Assignment Posted.!!" });
  } catch (error) {
    return res.status(500).json({ error: "Error adding assignment", details: error.message });
  }
});

app.get("/getSchedule", async (req, res) => {
  return res.status(200).json({
    week: "Week 1",
    schedule: "https://tcscomprod.sharepoint.com/:x:/s/TD_IgniteManagementTeam-TrainingOperations/Ecxpfi42OC5BnYrirBjGdcABjhXtGX4ur1RzNFuAfx5Lsg?e=bCqFzn"
  });
});

app.get("/assignments", async (req, res) => {
  try {
    const currentDate = new Date();

    const assignments = await Assignment.find({
      dueDate: { $gt: currentDate }
    });

    if (assignments.length === 0) {
      return res.status(404).send("No assignments");
    }

    const formattedAssignments = assignments.map(a => {
      const formatedDate = new Date(a.dueDate);
      const remainingTime = new Date(a.dueDate) - currentDate;
      const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

      return {
        id: a._id,
        assignmentName: a.assignmentName,
        dueDate: formatedDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        noOfQuestions: a.noOfQuestions,
        technology: a.technology,
        remainingDays
      };
    });

    return res.status(200).json(formattedAssignments);

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch assignments", details: error.message });
  }
});

app.get("/allAssignments", async (req, res) => {
  try {
    const currentDate = new Date();
    const assignments = await Assignment.find();

    if (assignments.length === 0) {
      return res.status(404).send("No assignments found");
    }

    const formattedAssignments = assignments.map(a => {
      const formattedDate = new Date(a.dueDate);
      const remainingTime = formattedDate - currentDate;
      const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

      return {
        id: a._id,
        assignmentName: a.assignmentName,
        dueDate: formattedDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        noOfQuestions: a.noOfQuestions,
        technology: a.technology,
        remainingDays
      };
    });

    return res.status(200).json(formattedAssignments);

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch assignments", details: error.message });
  }
});

// --- UPDATES APIs ---
app.post('/addUpdate', async (req, res) => {
  try {
    const { adminName, updateText } = req.body;

    const newUpdate = new Update({ adminName, updateText });
    await newUpdate.save();

    // Send FCM Notification
    const message = {
      notification: {
        title: '🆕 New Update',
        body: `${adminName} posted: ${updateText}`,
      },
      topic: 'all',
    };

    await admin.messaging().send(message);

    // Emit update to all clients via socket
    const io = req.app.get('socketio');
    io.emit('updatePosted', newUpdate);

    res.status(201).json({ message: 'Update posted successfully', update: newUpdate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/getUpdates', async (req, res) => {
  try {
    const updates = await Update.find().sort({ postedAt: -1 });
    res.status(200).json(updates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  return res.status(200).json({ message: 'Assignmate server running!' });
});

// --- IMPORTANT: Use server.listen (not app.listen) ---
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
