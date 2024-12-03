const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User'); // Assuming you have a User model
const bcrypt = require('bcrypt'); // Assuming you use bcrypt for password hashing
const WaterIntake = require('../models/Intake');
const moment = require('moment'); // Import moment.js
const { DateTime } = require('luxon');

// GET route to view all water intake entries with pagination
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;  // Default to page 1
  const limit = 3;  // Limit to 3 entries per page

  WaterIntake.find({ user: req.session.userId })
    .skip((page - 1) * limit)
    .limit(limit)
    .then(waterIntakes => {
      WaterIntake.countDocuments({ user: req.session.userId })
        .then(totalEntries => {
          const totalPages = Math.ceil(totalEntries / limit);
          User.findById(req.session.userId)  // Fetch the user's username
            .then(user => {
              if (!user) {
                console.error('User not found');
                return res.redirect('/login');  // Redirect to login if user not found
              }
              console.log('User found:', user);  // Debugging line to check the user object
              res.render('waterIntakeList', {
                waterIntakes,
                totalPages,
                currentPage: page,
                username: user.username || 'User'  // Pass the user's username to the view
              });
            })
            .catch(err => {
              console.error('Error retrieving user data:', err);  // Debugging line
              res.redirect('/login');  // Redirect to login on error
            });
        })
        .catch(err => {
          console.error('Error counting water intake data:', err);  // Debugging line
          res.status(500).send('Error counting water intake data');
        });
    })
    .catch(err => {
      console.error('Error retrieving water intake data:', err);  // Debugging line
      res.status(500).send('Error retrieving water intake data');
    });
});

// POST route to add water intake entry
router.post('/add', async (req, res) => {
  const { amount } = req.body;

  // Validate amount
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).send('Invalid amount. Please provide a positive number.');
  }

  try {
    // Convert current time to IST (Indian Standard Time)
    const localDate = DateTime.local().setZone('Asia/Kolkata'); // User's local time (IST)
    const currentDateIST = localDate.toISO();  // Convert to ISO string in IST
    console.log('Current Date (IST):', currentDateIST);

    // Convert the IST time to UTC for storage in MongoDB
    const currentDateUTC = localDate.toUTC().toISO();  // Store as UTC in the database
    console.log('Current Date (UTC):', currentDateUTC);

    // Check if a water intake entry already exists for today (in IST)
    const startOfToday = localDate.startOf('day'); // Start of today in IST
    const existingIntake = await WaterIntake.findOne({
      user: req.session.userId,
      date: { $gte: startOfToday.toUTC().toISO() } // Compare against UTC date
    });

    if (existingIntake) {
      const page = parseInt(req.query.page) || 1;  // Default to page 1
      const limit = 3;  // Limit to 3 entries per page

      const waterIntakes = await WaterIntake.find({ user: req.session.userId })
        .skip((page - 1) * limit)
        .limit(limit);

      const totalEntries = await WaterIntake.countDocuments({ user: req.session.userId });
      const totalPages = Math.ceil(totalEntries / limit);
      const user = await User.findById(req.session.userId);

      return res.render('waterIntakeList', {
        waterIntakes,
        totalPages,
        currentPage: page,
        username: user.username || 'User',
        errorMessage: 'You have already added your water intake for today.'
      });
    }

    // Create and save new water intake entry
    const newIntake = new WaterIntake({
      user: req.session.userId,
      amount: amount,
      date: currentDateUTC // Save date in UTC
    });

    await newIntake.save();
    return res.redirect('/water-intake');
  } catch (error) {
    console.error('Error adding water intake:', error);
    return res.status(500).send('Internal server error.');
  }
});


// Route to log out and destroy the session
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    res.redirect('/login');
  });
});

// Route to get all water intake entries with pagination
router.get('/water-intake', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login'); // Redirect to login if not authenticated
  }

  const page = parseInt(req.query.page) || 1;  // Default to page 1
  const limit = 3;  // Limit to 3 entries per page

  // Set cache control to prevent the browser from caching this page
  res.setHeader('Cache-Control', 'no-store');

  // Find water intake entries for the user with pagination
  WaterIntake.find({ user: req.session.userId })
    .skip((page - 1) * limit)
    .limit(limit)
    .then(waterIntakes => {
      if (!waterIntakes || waterIntakes.length === 0) {
        return res.status(404).send('No water intake records found.');
      }

      // Count total documents to calculate total pages
      WaterIntake.countDocuments({ user: req.session.userId })
        .then(totalEntries => {
          const totalPages = Math.ceil(totalEntries / limit);
          User.findById(req.session.userId)  // Fetch the user's username
            .then(user => {
              if (!user) {
                console.error('User not found');
                return res.redirect('/login');  // Redirect to login if user not found
              }
              console.log('User found:', user);  // Debugging line to check the user object
              res.render('waterIntakeList', {
                waterIntakes,
                totalPages,
                currentPage: page,
                username: user.username || 'User'  // Pass the user's username to the view
              });
            })
            .catch(err => {
              console.error('Error retrieving user data:', err);  // Debugging line
              res.redirect('/login');  // Redirect to login on error
            });
        })
        .catch(err => {
          console.error('Error counting water intake data:', err);  // Debugging line
          res.status(500).send('Error counting water intake data');
        });
    })
    .catch(err => {
      console.error('Error retrieving water intake data:', err);  // Debugging line
      res.status(500).send('Error retrieving water intake data');
    });
});




// Route to delete water intake entry
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;  // Get the entry ID from the request

  // Delete the water intake entry by ID
  WaterIntake.deleteOne({ _id: id, user: req.session.userId })
    .then(() => {
      res.status(200).send('Entry deleted successfully');  // Respond with success
    })
    .catch(err => {
      res.status(500).send('Error deleting water intake entry');  // Respond with error
    });
});

// Route to update water intake entry
router.put('/update/:id', (req, res) => {
  const { id } = req.params;
  const { amount, date } = req.body;  // Get the new amount and the original date

  // Find the water intake entry and update it
  WaterIntake.findOneAndUpdate(
    { _id: id, user: req.session.userId },
    { amount: amount },  // Only update the amount, not the date
    { new: true }  // Return the updated document with the original date
  )
  .then(updatedEntry => {
    if (!updatedEntry) {
      return res.status(404).send('Entry not found or permission denied');
    }
    // Respond with the updated entry, including the original date
    res.status(200).json(updatedEntry);
  })
  .catch(err => {
    res.status(500).send('Error updating water intake entry');
  });
  
});




// routes/waterIntakeRoutes.js difference

router.get('/difference', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).send('Start date and end date are required.');
  }

  console.log('Received start date:', startDate);
  console.log('Received end date:', endDate);

  // Adjust dates to cover the full day range
  const start = moment(startDate, 'YYYY-MM-DD').startOf('day').toDate();
  const end = moment(endDate, 'YYYY-MM-DD').endOf('day').toDate();

  console.log('Adjusted start date (UTC):', start);
  console.log('Adjusted end date (UTC):', end);

  try {
    // Convert session user ID to ObjectId
    const userId = new mongoose.Types.ObjectId(req.session.userId);

    // Fetch records within the specified date range
    const records = await WaterIntake.find({
      user: userId,
      date: { $gte: start, $lte: end }
    });

    console.log('Fetched records:', records);

    // If there are less than two records, return a message or no difference
    if (records.length < 2) {
      return res.status(200).json({ difference: 0, message: 'Not enough data to calculate difference.' });
    }

    // Sort the records by date to calculate the difference between the first and last record
    records.sort((a, b) => a.date - b.date); // Sort by date in ascending order

    // Calculate the difference between the first and last records
    const firstRecordAmount = records[0].amount;
    const lastRecordAmount = records[records.length - 1].amount;

    const difference = Math.abs(lastRecordAmount - firstRecordAmount);

    res.json({ difference });
  } catch (err) {
    console.error('Error calculating water intake difference:', err.message);
    res.status(500).send('Error calculating water intake difference.');
  }
});


module.exports = router;