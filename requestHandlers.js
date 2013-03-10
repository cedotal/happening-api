var url = require("url");

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/happeningTest');

var themeSchema = mongoose.Schema({
    name: String,
    id: Number
});

var Theme = mongoose.model('Theme', themeSchema);

var happeningSchema = mongoose.Schema({
    name: String,
    id: Number,
    themes: Array
});

var Happening = mongoose.model('Happening', happeningSchema);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    // yay!
});

// handler for the "themes" path
function themes(pathname, query, response) {
    var pathnameSegments = pathname.split("/");
    var themeId = parseInt(pathnameSegments[2]);
    if (!isNaN(themeId)) {
        // call findOne, filtering for the passed id, specifying which fields to return, and defining the callback to be run on completion
        Theme.findOne({"id": themeId}, {'_id':0, 'id':1, 'name':1}, function(err, theme) {
            // now create the actual response
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(JSON.stringify(theme));
            response.end();
        });
    }
    else {
        Theme.find(function(err, themes) {
            // now create the actual response
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(JSON.stringify(themes));
            response.end();
        });
    };
};

// handler for the "happenings" path
function happenings(pathname, query, response) {
    var pathnameSegments = pathname.split("/");
    var happeningId = parseInt(pathnameSegments[2]);
    var themeId = parseInt(query.themeid);
    if (!isNaN(happeningId)) {
        // call findOne, filtering for the passed id, specifying which fields to return, and defining the callback to be run on completion
        Happening.findOne({"id": happeningId}, {'_id':0, 'id':1, 'name':1, 'themes': 1}, function(err, happening) {
            // now create the actual response
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(JSON.stringify(happening));
            response.end();
        });
    }
    else if (!isNaN(themeId)){
        // call findOne, filtering for the passed id, specifying which fields to return, and defining the callback to be run on completion
        Happening.find({"themes": themeId}, {'_id':0, 'id':1, 'name':1, 'themes': 1}, function(err, happenings) {
            // now create the actual response
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(JSON.stringify(happenings));
            response.end();
        });
    }
    else {
        Happening.find({}, function(err, happenings) {
            // now create the actual response
            response.writeHead(200, {"Content-Type": "text/html"});
            response.write(JSON.stringify(happenings));
            response.end();
        });
    };
};
//
// make this file accessible to others in node.js
exports.themes = themes;
exports.happenings = happenings;

/*

// put mongoose in a var, then connect it to the database
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/kittens');

// create a schema for the Theme model
var themeSchema = mongoose.Schema({
    "name": String,
    "id": Number
});
    
// create the City model by passing in its schema
var Theme = mongoose.model('Theme', themeSchema); 

// function to return a response to a cities query
function themes(query, response) {
    // write out header
    response.writeHead(200, {"Content-Type": "text/html"});
    
    // execute the query
    Theme.find(function (err, payload) {
        if (err) return handleError(err);
        response.write(JSON.stringify(payload));
        // response.write(cities.toString());
        response.end();
    });
    
};

*/



// saving this for later
// create a Query object that finds all cities named "New York City"
// var query = City.find({ 'name': { $regex: '\\A' + searchString }});
