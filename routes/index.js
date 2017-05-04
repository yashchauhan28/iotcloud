var express = require("express"),
    router = express.Router(),
    helper = require("../utils"),
    mongoose = require("mongoose"),
    User = mongoose.model("User"),
    Dataset = mongoose.model("Dataset");

router.get("/", function(req, res, next) {
    var errorMessage = req.session.error;
    var successMessage = req.session.success;

    delete req.session.error;
    delete req.session.success;

    User.count({}, function(err, count){
        if (count) {
            if (req.session.user) {
                res.redirect("/index");
            } else {
                res.render("login", {errorMessage: errorMessage,
                                    successMessage: successMessage});
            }
        } else {
            res.render("setup");
        }
    });

});

// GET setup page
router.get("/setup", function(req, res) {
    var errorMessage = req.session.error;
    var successMessage = req.session.success;

    delete req.session.error;
    delete req.session.success;

    res.render("setup", {errorMessage: errorMessage,
                        successMessage: successMessage});
});

// GET index page
router.get("/index", helper.authenticate, function(req, res, next) {
    var sessionUser = req.session.user.name;
    var errorMessage = req.session.error;
    var successMessage = req.session.success;

    delete req.session.error;
    delete req.session.success;

    Dataset.find({owner_name: sessionUser}, function(err, datasets) {
        if (err) {
            console.log("Error retrieving datasets: " + err);
            errorMessage = "A problem occured retrieving the datasets";
            res.render("index", {datasets: {},
                                errorMessage: errorMessage});
        } else {
            res.render("index", {datasets: datasets,
                                errorMessage: errorMessage,
                                successMessage: successMessage});
        }
    });
});

// GET settings page
router.get("/settings", helper.authenticate, function(req, res) {
    var errorMessage = req.session.error;
    var successMessage = req.session.success;

    delete req.session.error;
    delete req.session.success;

    res.render("settings", {user:req.session.user,
                            errorMessage: errorMessage,
                            successMessage: successMessage});
});

/* Requests controllers */
// POST setup request
router.post("/setup", function(req, res) {

    var username = req.body.username;
    var password = req.body.password;


    User.create({
        name: username,
        password: password
    }, function(err, user) {
        if (err) {
            console.log("Error creating the user: " + err);
            req.session.error = "An error occured creating the user.";
            req.redirect("/setup");
        } else {
            console.log("POST creating new user: " + user);
            req.session.regenerate(function() {
                req.session.user = user;
                res.redirect("/index");
            });
        }
    })
});

// POST login request
router.post("/login", function(req, res) {

    var username = req.body.username;
    var password = req.body.password;

    User.findOne({name:username}, function(err, user) {
            if (err) {
                console.log("Error retrieving user " + err);
                req.session.error = "A problem occured while retrieving the user";
                req.redirect("/")
            } else if (user) {
                user.comparePassword(password, function(err, isMatch) {
                    if (err) throw err;

                    if (isMatch) {
                        req.session.regenerate(function() {
                            req.session.user = user;
                            req.session.success = "Authenticated as " + user.name;
                            res.redirect("/index");
                        });
                    } else {
                        req.session.error = "Authentication failed, please check your password.";
                        res.redirect("/");
                    }
                });
            } else {
                req.session.error = "Authentication failed, please check your username.";
                res.redirect("/");
            };
    });
});

// GET logout request
router.get("/logout", helper.authenticate, function(req, res) {
    var errorMessage = req.session.error;
    var successMessage = req.session.success;

    req.session.regenerate(function() {
        req.session.error = errorMessage;
        req.session.success = successMessage;
        res.redirect("/");
    });
});


module.exports = router;
