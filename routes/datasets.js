var express = require("express"),
    router = express.Router(),
    hat = require("hat"),
    mongoose = require("mongoose"),
    Dataset = mongoose.model("Dataset"),
    helper = require("../utils");

// GET request to push data to the dataset
router.get("/update", function(req, res) {
    var apiKey = req.query.key;
    delete req.query.key;

    var values = [];
    var updateQuery = {};
    Dataset.findOne({write_key:apiKey}, function(err, dataset) {
        if (err) {
            console.log("Error retrieving dataset: " + err);
            res.sendStatus(-1);
        } else if (dataset.data) {
          console.log("all okay..");
            for (var property in req.query) {
                if (req.query.hasOwnProperty(property)&dataset.data.hasOwnProperty(property)) {
                  updateQuery["data." + property + ".values"] = [parseInt(req.query[property]), Date.now()];
                }
            }
            console.log(updateQuery);
            dataset.update({$push: updateQuery,
                            $inc: {entries_number: 1},
                            last_entry_at: Date.now()}, function(err, datasetID) {
                if (err) {
                    console.log("Error updating dataset: " + err);
                    res.sendStatus(-1);
                } else {
                    console.log("New entry for dataset with API key: " + apiKey);
                    res.sendStatus(200);
                }
            });
        } else {
            console.log("Either no dataset was found for this API key: " + apiKey + " or the dataset doesn't have any variables set");
            res.sendStatus(0);
        }
    });
});

//GET request to get data
router.get("/request", function(req, res) {

    var apiKey = req.query.key;

    Dataset.findOne({read_key: apiKey}, function(err, dataset) {
        if (err) {
            console.log("Error retrieving dataset: " + err);
            res.sendStatus(-1);
        } else if (dataset) {
            var cleanDataset = {owner_name: dataset.owner_name,
                                name: dataset.name,
                                index: dataset.index,
                                public: dataset.public,
                                created_at: dataset.created_at,
                                last_entry_at: dataset.last_entry_at,
                                entries_number: dataset.entries_number,
                                data: dataset.data
                                }
            res.json(cleanDataset);
        } else {
            console.log("No dataset found for this API key: " + apiKey);
            res.sendStatus(0);
        }
    });
});

// GET new dataset page
router.get("/new", helper.authenticate, function(req, res) {
    res.render("datasets/new");
});

// GET edit dataset page
router.get("/:index/edit", helper.authenticate, function(req, res) {
    var index = req.params.index;

    Dataset.findOne({index: index}, function(err, dataset) {
        res.render("datasets/edit", {"dataset": dataset});
    });
});

// Get show dataset page
router.get("/:index", function(req, res) {
    var index = req.params.index;

    Dataset.findOne({index: index}, function(err, dataset) {
        if (err) {
            req.session.error = "Error retrieving the dataset";
            res.redirect("/index");
        } else {
            var cleanDataset = {name : dataset.name,
                                created_at: dataset.created_at,
                                last_entry_at: dataset.last_entry_at,
                                entries_number: dataset.entries_number,
                                data: dataset.data}

            if (!dataset.public) {
                helper.authenticate(req, res, function() {
                    res.render("datasets/show", {dataset: cleanDataset})
                });
            } else {
                res.render("datasets/show", {dataset: cleanDataset});
            }
        }
    });
});

// POST new dataset request
router.post("/", helper.authenticate, function(req, res) {

    var sessionUser = req.session.user.name;

    var name = req.body.name;
    var isPublic = req.body.public != undefined ? true:false;

    delete req.body.name;
    delete req.body.public;

    var propertiesList = [];
    for (var property in req.body) {
        //if (req.body.hasOwnProperty(property)) {
            propertiesList.push(property);
        //}
    }
    propertiesList.reverse();

    var variablesFields = {};
    for (var i in propertiesList) {
        console.log(propertiesList[i])
        variablesFields[propertiesList[i]] = {name:req.body[propertiesList[i]],
                                    values: Array};
    }


    Dataset.create({
        index: helper.uniqueIndex(),
        name: name,
        owner_name: sessionUser,
        read_key: hat(),
        write_key: hat(),
        public: isPublic,
        data: variablesFields
    }, function(err, dataset) {
        if (err) {
            console.log("Error creating the dataset: " + err);
            req.session.error = "A problem occured when creating the dataset. Please try again.";
        } else {
            console.log("New dataset created with id: " + dataset._id);
            req.session.success = "Dataset " + name + " created successfully.";
        }
        res.redirect("/index");
    });
});

// PUT request to update dataset
router.put("/:id/", helper.authenticate, function(req, res) {
    var name = req.body.name;
    var isPublic = req.body.public != undefined ? true:false;
    delete req.body.name
    delete req.body.public

    var setList = {};
    var unsetList = {};
    var updateQuery = {};

    Dataset.findById(req.params.id, function(err, dataset) {
        updateQuery = {
            name: name,
            public: isPublic
        }
        for (var property in req.body) {
            if (!dataset.data) {
                console.log(property)
                console.log(req.body[property])
                setList["data."+ property] = {name:req.body[property],
                                                values: Array};
            }
        }

        for (var property in dataset.data) {
            if (dataset.data)
            {
                unsetList["data."+property] = true;
            }
        }

        if (Object.keys(setList).length) {
            updateQuery["$set"] = setList;
        }
        if (Object.keys(unsetList).length) {
            updateQuery["$unset"] = unsetList;
        }

        // Update dataset
        dataset.update(updateQuery, function(err, response) {
            if (err) {
                console.log("Error updating dataset: " + err);
                req.session.error = "Update failed, please try again.";
            } else {
                console.log("Update on dataset: " + dataset._id);
                req.session.success = "Update successul.";
            }
            res.redirect("/index");
        });
    });
});

// DELETE dataset request
router.delete("/:id/", helper.authenticate, function(req, res) {

    Dataset.findById(req.params.id, function(err, dataset) {
        if (err) {
            console.log("Error retrieving the dataset: " + err);
            req.session.error = "A problem occured retrieving the dataset.";
            req.location("index");
            res.redirect("/index");
        } else {
            dataset.remove(function(err, dataset) {
                if (err) {
                    console.log("Error deleting dataset: " + err);
                    req.session.error("A problem occured deleting the dataset. Please try again.");
                } else {
                    console.log("Deleted dataset with id: " + dataset._id);
                    req.session.success = "Successfully deleted dataset " + dataset.name;
                }
                res.redirect("/index");
            });
        }
    });
});

// POST request to update API key
router.post("/update/key", helper.authenticate, function(req, res) {
    var redirectUrl = req.headers.referer;
    var id = req.body.id;
    var key = req.body.key;

    var updateJson = {};
    updateJson[key+"_key"] = hat();

    Dataset.findById(id, function(err, dataset) {
        if (err) {
            console.log("Error retrieving dataset: " + err);
            req.session.error = "A problem occured finding the dataset";
            res.redirect(redirectUrl);
        } else {
            dataset.update(updateJson, function(err, datasetID) {
                console.log("API key updated: " + key);
                res.redirect(redirectUrl);
            });
        }
    });
});

module.exports = router;
