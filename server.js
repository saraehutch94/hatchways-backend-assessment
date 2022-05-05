// *** All tests for API requests made in test.txt file ***
// *** Including tests for cache routes ***

// Require dependencies
const express = require("express");
const morgan = require("morgan");
const axios = require("axios");
const redis = require("redis");

// Cache dependency (Express-Redis cache library)
const expressRedisCache = require("express-redis-cache");

// Cache variable --> initialize library
const cache = expressRedisCache({
    expire: 5
});

//

// Cache error handling
cache.on('error', function (error) {
    throw new Error('Cache error!:' + error);
});

// Initialize Express application
const app = express();

// API URL
const apiURL = "https://api.hatchways.io/assessment/blog/posts/";

// Configure application settings

// Set up port value
require("dotenv").config();

// Save port value to variable
const PORT = process.env.PORT || 3000;

// Redis port
const REDIS_PORT = process.env.PORT || 6379;

// Create Redis client
const clientPort = redis.createClient(REDIS_PORT);

// Create Redis client
const client = redis.createClient({url: process.env.REDIS_URL});

// Mount JSON middleware
app.use(express.json());

// Mount morgan middleware
app.use(morgan("dev"));

// Define routes

// Ping route
app.get("/api/ping", async (req, res) => {
    // make asynchronous API call using axios --> check for successful API call
    await axios.get(apiURL + "?tag=''")
    .then(response => {
        const successMessage = {
            "success": true
        };
        console.log(response.data);
        // return success message object if API call is successful
        return res.json(successMessage);
    })

    .catch(error => {
        // return error message if API call was not successful
        return res.send(error);
    })
});

// Cache ping route
app.get("/api/ping/cache", cache.route(), async (req, res) => {
    // make asynchronous API call using axios --> check for successful API call
    await axios.get(apiURL + "?tag=''")
    .then(response => {
        const successMessage = {
            "success": true
        };
        console.log(response.data);
        // return success message object if API call is successful
        return res.json(successMessage);
    })

    .catch(error => {
        // return error message if API call was not successful
        return res.send(error);
    })
});

// Posts route
app.get("/api/posts", async (req, res) => {

    // error message objects (used multiple times
    // when checking for queries in conditions below)
    const noTagsError = {
        "error": "Tags query is required"
    };
    const directionError = {
        "error": "direction query is invalid"
    };
    const sortByError = {
        "error": "sortBy query is invalid"
    };

    // if there is no tags query
    if (!req.query.tags) {
        // send 400 status code + send no tags error message
        res.status(400)
        return res.json(noTagsError)
    }

    // split tags string at commas into array for looping
    const tagArray = req.query.tags.split(",");

    // if the tag array has a length greater than 0,
    // continue with API calls using tags
    if (tagArray.length > 0) {

        // variables for forthcoming code
        let previousArray = null;
        let combinedArrays = [];
        const newSet = new Set();

        // loop through tagArray array
        for (let i = 0; i < tagArray.length; i++) {
            // make asynchronous API call using axios, plug in each iteration
            // from tagArray loop into tag query of API call
            // (API can only accept 1 tag at a time --> reason for implementing loop)
            await axios.get(apiURL + `?tag=${tagArray[i]}`)
            .then(response => {
                // save each posts array to a variable (above for loop to utilize during each iteration)
                previousArray = response.data.posts;
                // take combinedArrays array and concat with response data/array
                combinedArrays = combinedArrays.concat(previousArray);
                // next time this runs, combineArray will have the previousArray concatted to it
                // and previousArray will equal new response data/array
            })
            .catch(error => {
                // log any errors to the console
                console.log(error);
            })
        }

        // if the length of the combinedArrays is 0
        if (combinedArrays.length === 0) {
            // no results were found in the API call using the tags provided
            const noResultsError = {
                "error": "No results found with tag(s) provided"
            }
            res.status(400);
            // return no results found error
            return res.json(noResultsError);
        }

        // filter out all of the repeated objects in the combinedArrays array
        const filteredArray = combinedArrays.filter(obj => {
            // check if the newSet variable (above in variables section)
            // contains the same id as the object being checked
            const inSet = newSet.has(obj.id);
            // add id to the newSet variable
            // Set() will make sure the same id is not added to the set multiple times
            newSet.add(obj.id);
            // return opposite of inSet variable each time an object is checked
            // for filtration
            // if !inSet === true, keep obj in filteredArray; if !inSet === false, remove obj from filteredArray
            return !inSet;
        });

        // conditionals for checking if direction + sortBy queries

        // if both direction and sortBy queries are present
        if (req.query.direction && req.query.sortBy) {
            // if both direction and sortBy queries are valid values
            if ((req.query.sortBy === "id" || req.query.sortBy === "likes" || req.query.sortBy === "reads" || req.query.sortBy === "popularity") && (req.query.direction === "asc" || req.query.direction === "desc")) {
                // sort through filteredArray based on the sortBy value provided
                filteredArray.sort(function (a, b) {
                    return a[req.query.sortBy] - b[req.query.sortBy];
                });
                // if the direction provided is descending/"desc", take the sorted array and reverse it's direction
                if (req.query.direction === "desc") filteredArray.reverse();
                // otherwise, direction provided was ascending/"asc" --> leave it the way it is
                // return either the ascending or descending filteredArray
                return res.json(filteredArray);
            // if neither sortBy or direction queries provided are valid values
            } else if ((req.query.sortBy != "id" && req.query.sortBy != "likes" && req.query.sortBy != "reads" && req.query.sortBy != "popularity") && (req.query.direction != "asc" && req.query.direction != "desc")) {
                const bothQueryError = {
                    "error": "Neither sortBy or direction queries are valid"
                };
                res.status(400);
                // return error that both queries are invalid
                return res.json(bothQueryError);
            // if direction query is invalid
            } else if (req.query.direction != "asc" && req.query.direction != "desc") {
                res.status(400);
                // return direction query is invalid error
                return res.json(directionError);
            // if sortBy query is invalid
            } else {
                res.status(400);
                // return sortBy query is invalid error
                return res.json(sortByError);
            }
        // if only sortBy query is provided
        // default direction is ascending/"asc" (direction query was not provided)
        } else if (req.query.sortBy) {
            // if the value that was passed to the sortBy query is invalid
            if (req.query.sortBy != "id" && req.query.sortBy != "likes" && req.query.sortBy != "reads" && req.query.sortBy != "popularity") {
                res.status(400);
                // return sortBy query is invalid error
                return res.json(sortByError);
            }
            // if sortBy query value is valid, sort through filteredArray using sortBy value provided
            filteredArray.sort(function (a, b) {
                return a[req.query.sortBy] - b[req.query.sortBy];
            });
            // return sorted ascending filteredArray
            return res.json(filteredArray);
        // if only direction query is provided
        // default sortBy is id (sortBy query was not provided)
        } else if (req.query.direction) {
            // if the value that was passed to the direction query is invalid
            if (req.query.direction != "asc" && req.query.direction != "desc") {
                res.status(400);
                // return direction query is invalid error
                return res.json(directionError);
            }
            // if direction query value is valid, sort through filteredArray using direction value provided
            filteredArray.sort(function (a, b) {
                // reiterating: default sortBy is id
                return a["id"] - b["id"];
            });
            // if the direction provided is descending/"desc", reverse the sorted-by-id array
            if (req.query.direction === "desc") filteredArray.reverse();
            // return either ascending or descending filteredArray
            return res.json(filteredArray);
        } else {
            // only tags query were provided (required) but not direction or sortBy queries
            // return original filteredArray
            return res.json(filteredArray);
        }
    // if no tags query are provided
    } else {
        res.status(400);
        // return no tags query provided error
        return res.json(noTagsError);
    }
});

// Cache posts route
app.get("/api/posts/cache", cache.route(), async (req, res) => {

    // error message objects (used multiple times
    // when checking for queries in conditions below)
    const noTagsError = {
        "error": "Tags query is required"
    };
    const directionError = {
        "error": "direction query is invalid"
    };
    const sortByError = {
        "error": "sortBy query is invalid"
    };

    // if there is no tags query
    if (!req.query.tags) {
        // send 400 status code + send no tags error message
        res.status(400)
        return res.json(noTagsError)
    }

    // split tags string at commas into array for looping
    const tagArray = req.query.tags.split(",");

    // if the tag array has a length greater than 0,
    // continue with API calls using tags
    if (tagArray.length > 0) {

        // variables for forthcoming code
        let previousArray = null;
        let combinedArrays = [];
        const newSet = new Set();

        // loop through tagArray array
        for (let i = 0; i < tagArray.length; i++) {
            // make asynchronous API call using axios, plug in each iteration
            // from tagArray loop into tag query of API call
            // (API can only accept 1 tag at a time --> reason for implementing loop)
            await axios.get(apiURL + `?tag=${tagArray[i]}`)
            .then(response => {
                // save each posts array to a variable (above for loop to utilize during each iteration)
                previousArray = response.data.posts;
                // take combinedArrays array and concat with response data/array
                combinedArrays = combinedArrays.concat(previousArray);
                // next time this runs, combineArray will have the previousArray concatted to it
                // and previousArray will equal new response data/array
            })
            .catch(error => {
                // log any errors to the console
                console.log(error);
            })
        }

        // if the length of the combinedArrays is 0
        if (combinedArrays.length === 0) {
            // no results were found in the API call using the tags provided
            const noResultsError = {
                "error": "No results found with tag(s) provided"
            }
            res.status(400);
            // return no results found error
            return res.json(noResultsError);
        }

        // filter out all of the repeated objects in the combinedArrays array
        const filteredArray = combinedArrays.filter(obj => {
            // check if the newSet variable (above in variables section)
            // contains the same id as the object being checked
            const inSet = newSet.has(obj.id);
            // add id to the newSet variable
            // Set() will make sure the same id is not added to the set multiple times
            newSet.add(obj.id);
            // return opposite of inSet variable each time an object is checked
            // for filtration
            // if !inSet === true, keep obj in filteredArray; if !inSet === false, remove obj from filteredArray
            return !inSet;
        });

        // conditionals for checking if direction + sortBy queries

        // if both direction and sortBy queries are present
        if (req.query.direction && req.query.sortBy) {
            // if both direction and sortBy queries are valid values
            if ((req.query.sortBy === "id" || req.query.sortBy === "likes" || req.query.sortBy === "reads" || req.query.sortBy === "popularity") && (req.query.direction === "asc" || req.query.direction === "desc")) {
                // sort through filteredArray based on the sortBy value provided
                filteredArray.sort(function (a, b) {
                    return a[req.query.sortBy] - b[req.query.sortBy];
                });
                // if the direction provided is descending/"desc", take the sorted array and reverse it's direction
                if (req.query.direction === "desc") filteredArray.reverse();
                // otherwise, direction provided was ascending/"asc" --> leave it the way it is
                // return either the ascending or descending filteredArray
                return res.json(filteredArray);
            // if neither sortBy or direction queries provided are valid values
            } else if ((req.query.sortBy != "id" && req.query.sortBy != "likes" && req.query.sortBy != "reads" && req.query.sortBy != "popularity") && (req.query.direction != "asc" && req.query.direction != "desc")) {
                const bothQueryError = {
                    "error": "Neither sortBy or direction queries are valid"
                };
                res.status(400);
                // return error that both queries are invalid
                return res.json(bothQueryError);
            // if direction query is invalid
            } else if (req.query.direction != "asc" && req.query.direction != "desc") {
                res.status(400);
                // return direction query is invalid error
                return res.json(directionError);
            // if sortBy query is invalid
            } else {
                res.status(400);
                // return sortBy query is invalid error
                return res.json(sortByError);
            }
        // if only sortBy query is provided
        // default direction is ascending/"asc" (direction query was not provided)
        } else if (req.query.sortBy) {
            // if the value that was passed to the sortBy query is invalid
            if (req.query.sortBy != "id" && req.query.sortBy != "likes" && req.query.sortBy != "reads" && req.query.sortBy != "popularity") {
                res.status(400);
                // return sortBy query is invalid error
                return res.json(sortByError);
            }
            // if sortBy query value is valid, sort through filteredArray using sortBy value provided
            filteredArray.sort(function (a, b) {
                return a[req.query.sortBy] - b[req.query.sortBy];
            });
            // return sorted ascending filteredArray
            return res.json(filteredArray);
        // if only direction query is provided
        // default sortBy is id (sortBy query was not provided)
        } else if (req.query.direction) {
            // if the value that was passed to the direction query is invalid
            if (req.query.direction != "asc" && req.query.direction != "desc") {
                res.status(400);
                // return direction query is invalid error
                return res.json(directionError);
            }
            // if direction query value is valid, sort through filteredArray using direction value provided
            filteredArray.sort(function (a, b) {
                // reiterating: default sortBy is id
                return a["id"] - b["id"];
            });
            // if the direction provided is descending/"desc", reverse the sorted-by-id array
            if (req.query.direction === "desc") filteredArray.reverse();
            // return either ascending or descending filteredArray
            return res.json(filteredArray);
        } else {
            // only tags query were provided (required) but not direction or sortBy queries
            // return original filteredArray
            return res.json(filteredArray);
        }
    // if no tags query are provided
    } else {
        res.status(400);
        // return no tags query provided error
        return res.json(noTagsError);
    }
});

// Tell Express app to listen for client requests
app.listen(PORT, () => {
    console.log("Express is listening on port " + PORT);
});