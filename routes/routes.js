const express = require('express');
const mongodb = require('mongodb') 
const ObjectId = mongodb.ObjectId;
const db = require('../data/database');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const { v4: uuidv4 } = require('uuid');

// Simplified storage - single folder for all images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folder = 'images/clothing';
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        cb(null, folder);  
    },
    filename: function (req, file, cb) {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueId}${ext}`);
    }
});

const upload = multer({ storage: storage });

// POST route for submitting clothing item
router.post('/report', upload.single('image'), async function(req, res) {
    console.log('--- /report POST Hit ---');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    const { 
        title,
        description,
        category,
        size,
        condition
    } = req.body;
    
    const uploadedImageFile = req.file;

    if (!uploadedImageFile) {
        return res.status(400).send('Image file is required.');
    }

    const uploadedImageFilePath = '/images/clothing/' + uploadedImageFile.filename;
    const uniqueId = path.basename(uploadedImageFile.filename, path.extname(uploadedImageFile.filename));

    // Clothing item data structure
    const itemData = {
        _id: uniqueId,
        title,
        description,
        category,
        size,
        condition,
        isAvailable: true,  // Default false
        isSwapped: false,
        swappedWith: null, // Initially null
        imagePath: uploadedImageFilePath,
        postedBy: req.session.user.id, // Store who posted this item
        postedAt: new Date()
    };

    try {
        // Insert clothing item into database
        await db.getDb().collection('clothingItems').insertOne(itemData);

        // Update user's posted items
        await db.getDb()
            .collection('users')
            .updateOne(
                { _id: new ObjectId(req.session.user.id) },
                { $push: { clothingItems: uniqueId } }
            );

        req.session.reportSubmitted = true;
        return res.redirect('/report-submitted');
    } catch (err) {
        console.error(err);
        // Clean up uploaded image if insertion fails
        fs.unlinkSync(uploadedImageFile.path);
        res.status(500).render('500');
    }
});


router.get('/', function(req, res) {
    res.render('index'); 
});

router.get('/contact-us', function(req, res) {
    res.render('contact-us'); 
});


router.get('/login', function(req, res) {
    res.render('login', { error: req.query.error }); 
});

router.get('/signup', function (req, res) {
    let sessionInputData = req.session.inputData;
    if(!sessionInputData) {
        sessionInputData = {
        usernameError: false,
        passwordError: false,
        username: '',
        password: '',
        confirmPassword: '',
        fullname: '',
        userType: '',
        terms: ''
      };
    }
    req.session.inputData = null;
    res.render('signup', {inputData: sessionInputData});
});

router.get('/report', function(req, res) {
    if(!req.session.isAuthenticated) {          // if(!req.session.user)
        return res.status(401).render('401');
    }
    res.render('report'); 
});

router.get('/report-submitted', function(req, res) {
    if(!req.session.isAuthenticated) {          // if(!req.session.user)
        return res.status(401).render('401');
    }
    if (!req.session.reportSubmitted) {
        return res.redirect('/report');  
    }
    
    req.session.reportSubmitted = false;
    res.render('report-submitted'); 
});


router.get('/report-submitted-found', function(req, res) {
    if(!req.session.isAuthenticated) {          // if(!req.session.user)
        return res.status(401).render('401');
    }
    if (!req.session.reportSubmitted) {
        return res.redirect('/report');  
    }
    
    req.session.reportSubmitted = false;
    res.render('report-submitted-found'); 
});


// router.get('/account/:username', async function(req, res) {  // Dynamically captures username from URL
//     if (!req.session.isAuthenticated) {  // Check if the user is authenticated
//         return res.status(401).render('401');
//     }

//     // Check if the username in the URL matches the session user
//     if (req.params.username !== req.session.user.username) {
//         return res.status(403).render('403'); // Forbidden if trying to access another user's profile
//     }

//     try {
//         // Fetch the user document and include the necessary fields
//         const user = await db.getDb().collection('users').findOne(
//             { _id: new ObjectId(req.session.user.id) },
//             { projection: { username: 1, fullname: 1, userType: 1, reports: 1 } }  // Include necessary fields
//         );
    
//         // Check if user was found
//         if (!user) {
//             return res.status(404).render('404'); // Handle user not found
//         }
        
//         const reports = await db.getDb().collection('reports').find({
//             _id: { $in: user.reports }  
//         }).toArray();
    
//         // Render the 'account' page, passing the user's reports to the template
//         res.render('account', { user: user, reports: reports });
//     } catch (error) {
//         console.error('Error fetching reports:', error);
//         res.status(500).render('500'); // Render error page in case of issues
//     }
// });
router.get('/account/:username', async function(req, res) {
    if (!req.session.isAuthenticated) {
        return res.status(401).render('401');
    }

    if (req.params.username !== req.session.user.username) {
        return res.status(403).render('403');
    }

    try {
        const user = await db.getDb().collection('users').findOne(
            { _id: new ObjectId(req.session.user.id) },
            { projection: { username: 1, fullname: 1, userType: 1, clothingItems: 1, userSince: 1 } }
        );

        if (!user) {
            return res.status(404).render('404');
        }

        const clothingItemIds = user.clothingItems || []; // fallback if null

        console.log('🧺 Clothing Item IDs:', clothingItemIds);

        // Get all clothing items posted by this user using string _id
        const items = await db.getDb().collection('clothingItems').find({
            _id: { $in: clothingItemIds }
        }).toArray();

        // Add info about who they swapped with (optional)
        for (const item of items) {
            if (item.isSwapped && item.swappedWith) {
                const swappedItem = await db.getDb().collection('clothingItems').findOne({
                    _id: item.swappedWith
                });

                if (swappedItem && swappedItem.postedBy) {
                    const swappedUser = await db.getDb().collection('users').findOne(
                        { _id: new ObjectId(swappedItem.postedBy) },
                        { projection: { username: 1 } }
                    );
                    item.swappedWithUser = swappedUser;
                }
            }
        }

        console.log('✅ Final Items:', items);
        res.render('account', { user: user, items: items });
    } catch (error) {
        console.error('❌ Error rendering /account:', error);
        res.status(500).render('500');
    }
});


router.get('/account/report/:id', async function(req, res, next) {
    if (!req.session.isAuthenticated) {  
        return res.status(401).render('401');
    }

    try {
        const report = await db.getDb().collection('reports').findOne({ _id: req.params.id });
        if (!report) {
            return res.status(404).render('404');
        }
        
        res.render('report-detail', {report: report});
        
    }
    catch {
        console.error('Error fetching reports:', error);
        res.status(500).render('500');
    }

});

router.get('/explore', function(req, res) {
    res.render('explore'); 
});

// Category routes
router.get('/explore/:category', async function(req, res) {
    const category = req.params.category;
    const formattedCategory = formatCategoryName(category); // Helper function to format URL to DB category name
    
    try {
        const items = await db.getDb().collection('clothingItems')
            .find({ 
                category: formattedCategory,
                isSwapped: false // Only show available items
            })
            .toArray();

        // Get owner info for each item
        const itemsWithOwners = await Promise.all(items.map(async item => {
            const owner = await db.getDb().collection('users').findOne(
                { _id: new ObjectId(item.postedBy) },
                { projection: { username: 1, fullname: 1 } }
            );
            return { ...item, owner };
        }));

        res.render('category', { 
            category: formattedCategory,
            items: itemsWithOwners 
        });
    } catch (error) {
        console.error('Error fetching category items:', error);
        res.status(500).render('500');
    }
});

// Helper function to convert URL-friendly names to DB category names
function formatCategoryName(urlName) {
    const map = {
        'dresses': 'Dress',
        'tops-blouses': 'Tops&Blouses',
        'bottoms': 'Bottom',
        'jewelry': 'Jwellery',
        'bags': 'Bags'
    };
    return map[urlName] || urlName;
}


router.get('/about', function(req, res) {
    res.render('about'); 
});

router.get('/technologies', function(req, res) {
    res.render('technologies'); 
});

router.get('/contact', function(req, res) {
    res.render('contact-us'); 
});

router.get('/terms-and-conditions', function(req, res) {
    res.render('terms-and-conditions'); 
});

router.get('/401', function(req, res) {
    res.render('401'); 
});

router.get('/404', function(req, res) {
    res.render('404'); 
});

router.get('/500', function(req, res) {
    res.render('500'); 
});



router.post('/signup', async function (req, res) {
    const { username, password, confirmPassword, fullname, userType, terms } = req.body;

    const existingUser = await db.getDb().collection('users').findOne({username: username});

    let usernameError = existingUser ? true : false;
    let passwordError = password !== confirmPassword;

    if (usernameError || passwordError) {
        req.session.inputData = {
            usernameError: usernameError,
            passwordError: passwordError,
            username: username,
            password: password,
            confirmPassword: confirmPassword,
            fullname: fullname,
            terms: terms
        };

          req.session.save(function() {
            res.redirect('/signup');
          });
          return;
    };

    const hashedPassword = await bcrypt.hash(confirmPassword, 12);
const user = {
    username: username.toLowerCase(),
    password: hashedPassword, 
    fullname: fullname,
    reports: [],
    clothingItems: [],  
    userSince: new Date()
};

    
    try {
        await db.getDb().collection('users').insertOne(user);
        res.redirect('/login');
    } 
    catch (err) {
        console.error(err);
        res.status(500).render('500');
    }

});

router.post('/login', async function(req, res) {
    let { username, password } = req.body;
    username = username.toLowerCase();

    const existingUser = await db.getDb().collection('users').findOne({ username: username });
    if (!existingUser) {
        return res.render('login', { error: 'Incorrect username or password!' });
    }
  
    const isPasswordEqual = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordEqual) {
        return res.render('login', { error: 'Incorrect username or password!' });
    }

    req.session.user = {id: existingUser._id.toString(), username: existingUser.username};
    req.session.isAuthenticated = true;
    req.session.save(function() {
      res.redirect('/');
    })
});


router.get('/item/:id', async (req, res) => {
    try {
        const item = await db.getDb().collection('clothingItems').findOne({
            _id: req.params.id
        });

        if (!item) {
            return res.status(404).render('404');
        }

        // Get owner details
        const owner = await db.getDb().collection('users').findOne(
            { _id: new ObjectId(item.postedBy) },
            { projection: { username: 1, fullname: 1 } }
        );

        res.render('item-detail', {
            item: { ...item, owner },
            isOwner: req.session.user?.id === item.postedBy.toString()
        });
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).render('500');
    }
});


// // Add this new route for handling swaps
// router.post('/swap-item', async function(req, res) {
//     const { itemId, swapWithId } = req.body;
    
//     try {
//         // Update both items to mark them as swapped
//         await db.getDb().collection('clothingItems').updateOne(
//             { _id: itemId },
//             { $set: { isSwapped: true,  isAvailable: false, swappedWith: swapWithId } }
//         );
        
//         await db.getDb().collection('clothingItems').updateOne(
//             { _id: swapWithId },
//             { $set: { isSwapped: true,  isAvailable: false, swappedWith: itemId } }
//         );
        
//         // Optionally move images to swapped folder
//         // You would need to implement this function
//         await moveToSwappedFolder(itemId);
//         await moveToSwappedFolder(swapWithId);
        
//         res.json({ success: true });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false });
//     }
// });

// async function moveToSwappedFolder(itemId) {
//     // Implement logic to move image to swapped folder
//     // This would involve:
//     // 1. Finding the item in database
//     // 2. Getting its image path
//     // 3. Moving the file to new location
//     // 4. Updating the imagePath in database
// }





























router.post('/verify-image', upload.single('image'), function(req, res) {
    const uploadedImageFile = req.file;
    const personStatus = req.body.personStatus;
    console.log(personStatus)

    const uploadedImageFilePath = (uploadedImageFile.destination) + ('/') + (uploadedImageFile.filename);
    
    
    // Defining the arguments to pass to the Python script
    const arg1 = uploadedImageFilePath;
    const arg2 = personStatus;

    // Spawn the Python process
    const pythonProcess = spawn('python', ['main.py', arg1, arg2]);

    // Variables to hold the output from Python
    let fullOutput = '';  // Store full output as a string

    // Handle output from the Python script
    pythonProcess.stdout.on('data', (data) => {
        // Collect full output data (could arrive in chunks)
        fullOutput += data.toString();
    });

    // Handle errors from the Python script
    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
    });


    // Handle when the Python process exits
    pythonProcess.on('exit', (code) => {
        console.log(`Python process exited with code ${code}`);
        
        // Split the full output by new lines
        const outputLines = fullOutput.trim().split('\n');
    
        // Assign output lines to x and y, if available
        if (outputLines.length >= 2) {
            const detect_face = outputLines[0]; // First line of output
            const match_face = outputLines[1]; // Second line of output
            console.log(`Detect Face: ${detect_face}`);
            console.log(`Match Face: ${match_face}`);
            return res.json({ detect_face, match_face });
        } else {
            console.error('Not enough output from Python script.');
            return res.status(500).json({ message: 'Error processing the image.' });
        }
    });

    // Ensure the image is deleted after processing
    pythonProcess.on('exit', (code) => {
        // Delete the uploaded image file regardless of the Python script success
        fs.unlink(uploadedImageFilePath, (err) => {
            if (err) {
                console.error(`Error deleting the image: ${err}`);
            } else {
                console.log('Uploaded image deleted successfully.');
            }
        });
    });
});


router.post('/logout', function (req, res) {
    req.session.user = null;
    req.session.isAuthenticated = false;
    res.redirect('/');
});

module.exports = router;