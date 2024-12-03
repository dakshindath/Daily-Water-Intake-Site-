const express = require('express');
const bcrypt = require('bcryptjs');
const { validatePassword } = require('./validation'); // Import custom password validation middleware
const { validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();  // Only declare this once

// Render the signup page
router.get('/signup', (req, res) => {
  res.render('signup', { errors: [], username: '' });
});

// User Sign-Up Route (POST request)
router.post('/signup', [validatePassword], async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  // Handle validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('signup', {
      errors: errors.array(),
      username,
    });
  }

  if (password !== confirmPassword) {
    return res.render('signup', {
      errors: [{ msg: 'Passwords do not match.' }],
      username,
    });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('signup', {
        errors: [{ msg: 'Username already taken.' }],
        username,
      });
    }

    // Hash the password and create a new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    req.session.userId = newUser._id;
    res.redirect('/water-intake');
  } catch (err) {
    res.status(500).render('error', { message: 'Error processing request.', error: err });
  }
});

// Render the login page
router.get('/login', (req, res) => {
  res.render('login', { errors: [], username: '' });
});

// User Login Route (POST request)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.render('login', { errors: [{ msg: 'User not found.' }], username });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { errors: [{ msg: 'Incorrect password.' }], username });
    }

    req.session.userId = user._id;
    res.redirect('/water-intake');
  } catch (err) {
    res.status(500).render('error', { message: 'Error processing login.', error: err });
  }
});


// Logout Route
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.render('error', { message: 'Error during logout.', error: err });
    }
    res.redirect('/login');  // Redirect to login page after logout
  });
});


module.exports = router;