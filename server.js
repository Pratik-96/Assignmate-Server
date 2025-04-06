const express = require('express');
const { default: mongoose } = require('mongoose');
const Assignment = require('./models/Assignment');
const app = express();
const port = 3000; // Or any other port you prefer
app.use(express.json());
const cors = require("cors");
const User = require('./models/User');
const admin = require("./FirebaseAdmin");
require('dotenv').config();

app.use(cors());

mongoose.connect(process.env.MONGOURI).then(() => console.log("MongoDB Connected"))
  .catch(() => console.log("Connection error"))


//User apis
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
   return  res.status(500).json({ message: "Login failed.", error: error.message });
  }
});






// Assignment apis
app.post("/addAssignment", async (req, res) => {
  try {

    const { assignmentName, dueDate, noOfQuestions, technology } = req.body

    const newAssignment = new Assignment({
      assignmentName,
      dueDate,
      noOfQuestions,
      technology
    })

    await newAssignment.save()

    const formatedDate = new Date(dueDate)
    


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


    return res.status(201).json({
      message: "Assignment Posted.!!"
    })

  } catch (error) {
    return res.status(500).json({ error: "Error adding assignment", details: error.message });

  }
})

app.get("/getSchedule", async (req, res) => {

  return res.status(200).json({
    week: "Week 14",
    schedule: "https://tcscomprod.sharepoint.com/:x:/s/TD_IgniteManagementTeam-TrainingOperations/EVJJAUr1i_9EhHt1xcHw54kB37F_U2R1TKSvFEyWXtw1NA?e=1an5lP"
  })
})


app.get("/assignments", async (req, res) => {
  try {
    const currentDate = new Date();

    // Fetch assignments with dueDate in the future
    const assignments = await Assignment.find({
      dueDate: { $gt: currentDate }
    });

    if (assignments.length === 0) {
      return res.status(404).send("No assignments")
    }

    // Add remainingDays to each assignment
    const formattedAssignments = assignments.map(a => {
      const formatedDate = new Date(a.dueDate)
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

    // Fetch all assignments from the database
    const assignments = await Assignment.find();

    if (assignments.length === 0) {
      return res.status(404).send("No assignments found");
    }

    // Format and calculate remaining days (even for past dates)
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



app.get('/', (req, res) => {
  return res.status(200).json({ message: 'Assignmate server running!' }); // Respond with "Hello World!" on the root route
});

app.listen(port, () => {
  return console.log(`Server listening on port ${port}`);
});