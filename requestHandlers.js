var url = require("url");

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/happeningTest');

var themeSchema = mongoose.Schema({
    name: String,
    nameLowerCase: String,
    id: Number
});

var Theme = mongoose.model('Theme', themeSchema);

var happeningSchema = mongoose.Schema({
    name: String,
    id: Number,
    themes: Array,
    dates: {
        beginDate: Date,
        endDate: Date
    },
    location: {
        latitude: Number,
        longitude: Number,
        address: {
            city: String,
            country: String
        }
    }
});

var Happening = mongoose.model('Happening', happeningSchema);

var citySchema = mongoose.Schema({
    name: String,
    latitude: Number,
    longitude: Number
},
{
    'collection': 'cities'
});

var City = mongoose.model('City', themeSchema);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    // yay!
});

var headers = {};
// IE8 does not allow domains to be specified, just the *
headers["Access-Control-Allow-Origin"] = "*";
headers["Content-Type"] = "application/json";
// headers["Access-Control-Allow-Origin"] = "http://localhost";
headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE";
headers["Access-Control-Allow-Credentials"] = false;
headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";

// handler for the "themes" path
function cities(pathname, query, request, response) {
    var pathnameSegments = pathname.split("/");
    var searchString = query.searchstring;
    if (request.method === "GET") {
        if (pathnameSegments[2] === "search") {
            if (typeof searchString === "string" && searchString !== "") {
                City.find({ 'nameLowerCase': { $regex: '\\A' + searchString.toLowerCase() }}, {'_id': 0, 'name': 1, 'latitude': 1, 'longitude': 1, 'countryCode': 1, 'population': 1 }).limit(8).sort({population: -1}).exec( function(err, cities) {
                    // now create the actual response
                    response.writeHead(200, headers);
                    response.write(JSON.stringify(cities || "error!"));
                    response.end();
                });
            }
            else {
                response.writeHead(200, headers);
                response.write(JSON.stringify({
                    "errors": [{
                            message: "Sorry, but you have to pass in a valid search string to search for cities.",
                            code: 400
                        }]
                }));
                response.end();
            };
        }
        else {
            response.writeHead(400, headers);
            response.write(JSON.stringify({
            "errors": [{
                message: "You can't do that with cities (yet).",
                code: 400
                }]
            }));
        response.end();
        };
    }
    else {
        response.writeHead(405, headers);
        response.write(JSON.stringify({
            "errors": [{
                message: "That is not (yet) a valid HTTP method.",
                code: 405
                }]
            }));
        response.end();
    };
};

// TODO: switch themes search to themes/search path
// handler for the "themes" path
function themes(pathname, query, request, response) {
    var pathnameSegments = pathname.split("/");
    var themeId = pathnameSegments[2];
    var searchString = query.searchstring;
    var name = query.name;
    if (request.method === "GET") {//
        if (themeId === "search" && searchString !== undefined) {
            Theme.find({ 'nameLowerCase': { $regex: '\\A' + searchString.toLowerCase() }}, {'_id': 1, 'name': 1}, function(err, themes) {
                // now create the actual response
                response.writeHead(200, headers);
                response.write(JSON.stringify(themes));
                response.end();
            });
        }
        else if (!isNaN(parseInt(themeId))) {
            // call findOne, filtering for the passed id, specifying which fields to return, and defining the callback to be run on completion
            Theme.findOne({"id": themeId}, {'_id':0, 'id':1, 'name':1}, function(err, theme) {
                // now create the actual response
                response.writeHead(200, headers);
                response.write(JSON.stringify(theme));
                response.end();
            });
        }
        else {
            response.writeHead(400, headers);
            response.write(JSON.stringify({
                "errors": [{
                    message: "Sorry, but you can't do that with a GET request for themes.",
                    code: 400
                    }]
            }));
            response.end();
        };
    }
    else if (request.method === "POST") {
        console.log("handling a POST request for themes");
        if (typeof name === "string" && name !== "") {
            Theme.find({nameLowerCase: name.toLowerCase()}).exec(function(err, nameMatches) {
                if (nameMatches.length === 0) {
                    response.writeHead(200, headers);
                    var theme = new Theme({'name': name, 'nameLowerCase': name.toLowerCase()});
                    theme.save();
                    response.write(JSON.stringify(theme));
                    response.end();
                }
                else {
                    response.writeHead(400, headers);
                    response.write(JSON.stringify({
                        "errors": [{
                            message: "Sorry, but there is already a theme with that name.",
                            code: 400
                        }]
                    }));
                    response.end();
                };
            });
        }
        else {
            response.writeHead(400, headers);
            response.write(JSON.stringify({
                "errors": [{
                    message: "Sorry, but you have to pass in a valid theme name to POST a new theme.",
                    code: 400
                    }]
            }));
            response.end();
        };
    }
    else {
        response.writeHead(405, headers);
        response.write({
                "errors": [{
                    message: "That is not (yet) a valid HTTP method.",
                    code: 400
                    }]
            });
        response.end();
    };
};

// handler for the "happenings" path
function happenings(pathname, query, request, response) {
    var pathnameSegments = pathname.split("/");
    var happeningId = parseInt(pathnameSegments[2]);
    var themeId = parseInt(query.themeid);
    
    if (request.method === "GET") {
        if (!isNaN(happeningId)) {
            // call findOne, filtering for the passed id, specifying which fields to return, and defining the callback to be run on completion
            Happening.findOne({"id": happeningId}, {'_id':1, 'name':1, 'themes': 1, 'location': 1}).exec( function(err, happening) {
                // now create the actual response
                response.writeHead(200, headers);
                response.write(JSON.stringify(happening));
                response.end();
            });
        }
        else if (!isNaN(themeId)){
            // call findOne, filtering for the passed id, specifying which fields to return, and defining the callback to be run on completion
            console.log("filtering happenings by theme id");
            Happening.find({themes: themeId}).limit(20).exec(function(err, happenings) {
                // now create the actual response
                response.writeHead(200, headers);
                response.write(JSON.stringify(happenings));
                response.end();
            });
        }
        else {
            Happening.find().limit(20).exec(function(err, happenings) {
                // now create the actual response
                response.writeHead(200, headers);
                response.write(JSON.stringify(happenings));
                response.end();
            });
        };
    }
    else if (request.method === "POST") {
        console.log("handling a POST request for happenings");
        console.log(query);
        var beginDate = new Date(query.begindate),
            endDate = new Date(query.enddate),
            name = query.name,
            city = query.city,
            country = query.country,
            latitude = Number(query.latitude),
            longitude = Number(query.longitude),
            theme = Number(query.theme);
        
        if (!(!isNaN(beginDate) && !isNaN(endDate) && typeof name === "string" && typeof city === "string" && typeof country === "string" && !isNaN(latitude) && !isNaN(longitude) && -180 < latitude && latitude < 180 && -180 < longitude && longitude < 180)) {
            response.writeHead(400, headers);
            response.write(JSON.stringify({
                "errors": [{
                    message: "Sorry, but you have to pass in a valid begin date, end date, name, city, country, theme id, latitude, and longitude.",
                    code: 400
                }]
            }));
            response.end();
        }
        else if (beginDate > endDate) {
            response.writeHead(400, headers);
            response.write(JSON.stringify({
                "errors": [{
                    message: "Sorry, but you have to pass in a begin date that's the same as or before the end date.",
                    code: 400
                }]
            }));
            response.end();
        }
        else {
            console.log("latitude: " + latitude + " --- longitude: " + longitude);
            Happening.find({nameLowerCase: name.toLowerCase()}).exec(function(err, nameMatches) {
                if (nameMatches.length === 0) {
                    Theme.find({"_id": theme}).exec( function(err, themeMatches) {
                        console.log("themeMatches:" + themeMatches);
                        if (themeMatches.length === 1) {
                            
                            response.writeHead(200, headers);
                            var happening = new Happening({
                                name: name,
                                themes: [theme],
                                dates: {
                                    beginDate: beginDate,
                                    endDate: endDate
                                },
                                location: {
                                    latitude: latitude,
                                    longitude: longitude,
                                    address: {
                                        city: city,
                                        country: country
                                    }
                                }
                            });
                            happening.save();
                            response.write(JSON.stringify(happening));
                            response.end();
                        }
                        else {
                            response.writeHead(400, headers);
                            response.write(JSON.stringify({
                                "errors": [{
                                    message: "That theme does not exist.",
                                    code: 400
                                }]
                            }));
                            response.end();
                        };
                    });
                }
                else {
                    response.writeHead(400, headers);
                    response.write(JSON.stringify({
                        "errors": [{
                            message: "Sorry, but there is already a happening with that name.",
                            code: 400
                        }]
                    }));
                    response.end();
                };
            });
        };
    }
    else {
        response.writeHead(405, headers);
        response.write("That is not (yet) a valid HTTP method.");
        response.end();
    };
};
//
// make this file accessible to other files in node.js
exports.cities = cities;
exports.themes = themes;
exports.happenings = happenings;
