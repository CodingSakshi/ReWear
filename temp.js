const express = require('express');
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;
const db = require('../data/database');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

(async () => {
    try {
        const user = await db.getDb().collection('reports').findOne(
            { fullname: 'Emma' },
            { projection: { username: 1, fullname: 1, userType: 1, reports: 1 } }  // Include necessary fields
        );

        console.log(user);  // Now it will log the actual user data
    } catch (err) {
        console.log('Error fetching user:', err);  // Log any error that occurs during the fetch
    }
})();
