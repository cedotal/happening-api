// require express and create express object
var express = require('express');
var app = express();

// require, create, and init mongoose objects
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/happening');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    // nothing in the callback
});

// require url lib for handling querystring parameters
var url = require('url');

// remove duplicate values from an array
function deDuplicateArray(array) {
    var newArray = [];
    array.forEach(function(member){
       if (newArray.indexOf(member) === -1) {
           newArray.push(member);
       };
   });
   return newArray;
};

// performs a check to see if a target object is a duplicate of one already in the db
var performDatabaseDupeCheck = function(queryObject, model, successFunction, failureFunction) {
    model.find(queryObject).exec(function(err, matches) {
        if (matches.length === 0) {
            successFunction();
        }
        else {
            failureFunction();
        };
    });
};

// application schemas and models
var happeningSchema = mongoose.Schema({
    name: String,
    id: Number,
    tags: [String],
    dates: {
        beginDate: Date,
        endDate: Date
    },
    location: {
        geonameID: Number,
        loc: {}
    },
    websiteUrl: String
});

var Happening = mongoose.model('Happening', happeningSchema);

var citySchema = mongoose.Schema({
    name: String,
    loc: {},
    countryCode: String,
    geonameID: Number,
    admin1Code: String,
    timezone: String
},
// specify the irregular pluralization of 'city'
{
    collection: 'cities'
});

var City = mongoose.model('City', citySchema);

// get a set of happenings filtered by tag, by location, or by nothing at all
var getHappenings = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var tags = queryParameters.tags;
    var latitude = Number(queryParameters.latitude);
    var longitude = Number(queryParameters.longitude);
    var queryObject = {};
    var sortQueryObject = {};
    // canonical comparators are location and date; if requestor passes a valid location, we sort by location; if not, we sort by date
    if (!isNaN(latitude) && !isNaN(longitude)) {
        // sort by distance from chosen location if latitude and longitude are passed in
        var locationQuery = { $nearSphere: [longitude, latitude] };
            queryObject["location.loc"] = locationQuery;
    }
    else {
        sortQueryObject = {
            'dates.beginDate': 1
        };
    };
    // this endpoint should only return future happenings
    queryObject['dates.endDate'] = { $gte: new Date() };
    // filter for tags if tags is passed in
    if (tags !== undefined) {
        queryObject.tags = tags;
    };
    Happening.find(queryObject).limit(20).sort(sortQueryObject).exec(function(err, happenings) {
        // create an array of all returned geonameID values
        var cityIdArray = happenings.map(function(happening){ return happening.location.geonameID});
        // run a query to get the full objects of all the cities that match these geonameID values
        var projectionObject = {geonameID: 1, name: 1, countryCode: 1, loc: 1, admin1Code: 1, websiteUrl: 1, timezone:1};
        City.find({geonameID: {$in: cityIdArray}}, projectionObject).exec(function(err, cities){
            // create an object so that each full city object is accessible with its geonameID as its key
            var cityObjectArray = {};
            cities.forEach(function(city) {
                cityObjectArray[city.get('geonameID')] = city;
            });
            // populate the location field in each happening with the joined city data 
            var cityJoinedHappenings = happenings.map(function(happening){
                var matchedCity = cityObjectArray[happening.location.geonameID];
                var newLocation = {};
                newLocation.cityName = matchedCity.get('name');
                newLocation.cityId = matchedCity.get('geonameID');
                newLocation.latitude = matchedCity.get('loc').coordinates[1];
                newLocation.longitude = matchedCity.get('loc').coordinates[0];
                newLocation.countryCode = matchedCity.get('countryCode');
                newLocation.admin1Code = matchedCity.get('admin1Code');
                newLocation.timezone = matchedCity.get('timezone');
                happening.set({'location': true});
                var newHappening = {};
                newHappening.name = happening.get('name');
                newHappening.dates = happening.get('dates');
                newHappening.tags = happening.get('tags');
                newHappening.websiteUrl = happening.get('websiteUrl');
                newHappening._id = happening.get('_id');
                newHappening.location = newLocation;
                return newHappening;
            });
            // send the result
            res.send(cityJoinedHappenings);
        });
    });
};

// create a new happening
var postHappening = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var beginDate = new Date(queryParameters.begindate),
        endDate = new Date(queryParameters.enddate),
        name = queryParameters.name,
        geonameID = Number(queryParameters.cityid),
        websiteUrl = queryParameters.websiteurl,
        tags = queryParameters.tags.toLowerCase();
        // prevent users from adding a tag labelled as an empty string by beginning or ending a label name with a comma
        if (tags[0] === ',') {
            tags = tags.slice(1);
        };
        if (tags[tags.length - 1] === ',') {
            tags = tags.slice(0, tags.length - 1);
        };
        // turn the tags string into an array
        tags = queryParameters.tags.split(',');
        tags = deDuplicateArray(tags);
        // check if url is complete; if not, modify it
        if (websiteUrl.substring(0,7) !== 'http://') {
            websiteUrl = 'http://' + websiteUrl;
        };
        // a happening is a duplicate of another happening if all of the following are true:
        var queryObject = {
            // 1) it has the same name as an existing happening
            'name': name,
            // 2) it has the same location as an existing happening
            'location.geonameID': geonameID,
            // 3) there is any overlap whatsoever between the span of its begin and end dates and the span of the begin and end dates of an existing happening
            $or: [
                // check if each existing happening has a beginDate between the beginDate and the endDate of the new happening
                { 
                    $and: [
                        { 'dates.beginDate': { $gte: beginDate } },
                        { 'dates.beginDate': { $lte: endDate } }
                    ]
                },
               // check if each existing happening has an endDate between the beginDate and the endDate of the new happening
                { 
                    $and: [
                        { 'dates.endDate': { $gte: beginDate } },
                        { 'dates.endDate': { $lte: endDate } }
                    ]
                },
                // check if the last potential disqualifying condition is true: that the timespan of the new happening is entirely enclosed in the timespan of the existing one
                { 
                    $and: [
                        { 'dates.beginDate': { $lte: beginDate } },
                        { 'dates.endDate': { $gte: endDate } }
                    ]
                }
            ]
        };
        var successFunction = function() {
            City.find({geonameID: geonameID}, {loc: 1}).exec(function(err, cityResult) {
                var happening = new Happening({
                    name: name,
                    tags: tags,
                    dates: {
                        beginDate: beginDate,
                        endDate: endDate
                    },
                    location: {
                        geonameID: geonameID,
                        loc: {
                            type: 'Point',
                            coordinates: [
                                Number(cityResult[0].get('loc').coordinates[0]),
                                Number(cityResult[0].get('loc').coordinates[1])
                            ]
                        }
                    },
                    websiteUrl: websiteUrl
                });
                console.log(happening);
                happening.save();
                res.send(happening);
            });
        };
        var failureFunction = function() {
            var errorObject = {
                name: 'resource must be unique',
                message: 'a resource already exists with those attributes'
            };
            res.send(errorObject);
        };
        // ensure that events don't end before they begin
        if (endDate < beginDate) {
            var errorObject = {
                name: 'events can\'t end before they begin',
                message: 'beginDate must be less than or equal to endDate'
            };
            res.send(errorObject);
        }
        // can't create an event in the past
        else if (beginDate < new Date()) {
            var errorObject = {
                name: 'can\'t create past events',
                message: 'you can\'t (yet) create events in the past'
            };
            res.send(errorObject);
        }
        else {
            performDatabaseDupeCheck(queryObject, Happening, successFunction, failureFunction);
        };
};

// get a single happening at its resource URI
var getHappening = function(req, res){
    var happeningId = req.params.variable;
    var queryObject = { _id: happeningId };
    Happening.find(queryObject).exec(function(err, happenings) {
        res.send(happenings);
    });
};

// update a single happening at its resource URI
var putHappening = function(req, res){
    var happeningId = req.params.variable;
    Happening.findById(happeningId, function(err, happening) {
        var queryParameters = (url.parse(req.url, true).query);
        if (queryParameters.name !== undefined && queryParameters.name !== '') {
            happening.name = queryParameters.name;
        };
        if (queryParameters.tags !== undefined && queryParameters.tags !== '') {
            var tags = queryParameters.tags;
            tags = tags.toLowerCase();
            tags = tags.split(',');
            tags = deDuplicateArray(tags);
            happening.tags = tags;
        };
        // dates passed in from client application are in UTC, but we need to append ' UTC' so that the server stores them as the appropriate UTC date, rather than adding an additional offset for the server's local time
        // TODO: this is brittle
        if (queryParameters.begindate !== undefined && queryParameters.begindate !== '') {
            happening.dates.beginDate = new Date(queryParameters.begindate + ' UTC');
        };
        if (queryParameters.enddate !== undefined && queryParameters.enddate !== '') {
            happening.dates.endDate = new Date(queryParameters.enddate + ' UTC');
        };
        if (queryParameters.cityid !== undefined && queryParameters.cityid !== '') {
            happening.location = { geonameID: queryParameters.cityid };
        };
        if (queryParameters.websiteurl !== undefined && queryParameters.websiteurl !== '') {
            var newUrl = queryParameters.websiteurl;
            // check if url is complete; if not, modify it
            if (newUrl.substring(0,7) !== 'http://') {
                newUrl = 'http://' + newUrl;
            };
            happening.websiteUrl = newUrl;
        };
        // a happening is a duplicate of another happening if all of the following are true:
        var queryObject = {
            // 1) it has the same name as an existing happening
            'name': happening.name,
            // 2) it has the same location as an existing happening
            'location.geonameID': happening.location.geonameID,
            // 3) there is any overlap whatsoever between the span of its begin and end dates and the span of the begin and end dates of an existing happening
            $or: [
                // check if each existing happening has a beginDate between the beginDate and the endDate of the new happening
                { 
                    $and: [
                        { 'dates.beginDate': { $gte: happening.dates.beginDate } },
                        { 'dates.beginDate': { $lte: happening.dates.endDate } }
                    ]
                },
               // check if each existing happening has an endDate between the beginDate and the endDate of the new happening
                { 
                    $and: [
                        { 'dates.endDate': { $gte: happening.dates.beginDate } },
                        { 'dates.endDate': { $lte: happening.dates.endDate } }
                    ]
                },
                // check if the last potential disqualifying condition is true: that the timespan of the new happening is entirely enclosed in the timespan of the existing one
                { 
                    $and: [
                        { 'dates.beginDate': { $lte: happening.dates.beginDate } },
                        { 'dates.endDate': { $gte: happening.dates.endDate } }
                    ]
                }
            ],
            // since we're PUTTING to and existing resource and not POSTING a new one, we also have to make sure that the resource we're matching for dupes is not, in fact, the one being targeted
            _id: { $ne: happeningId }
        };
        var successFunction = function() {
            City.find({geonameID: happening.location.geonameID}, {loc: 1}).exec(function(err, cityResult) {
                happening.location.loc = {
                    type: 'Point',
                    coordinates: [
                        Number(cityResult[0].get('loc').coordinates[0]),
                        Number(cityResult[0].get('loc').coordinates[1])
                    ]
                };
                happening.save(function(err){
                    if (!err) {
                        res.send(happening);
                    }
                    else {
                        res.send(err);
                    };
                });
            });
        };
        var failureFunction = function() {
            var errorObject = {
                name: 'resource must be unique',
                message: 'a resource already exists with those attributes'
            };
            res.send(errorObject);
        };
        // ensure that events don't end before they begin
        if (happening.dates.endDate < happening.dates.beginDate) {
            var errorObject = {
                name: 'events can\'t end before they begin',
                message: 'beginDate must be less than or equal to endDate'
            };
            res.send(errorObject);
        }
        // can't create an event in the past
        else if (happening.dates.endDate < new Date()) {
            var errorObject = {
                name: 'can\'t create past events',
                message: 'you can\'t (yet) create events in the past'
            };
            res.send(errorObject);
        }
        else {
            performDatabaseDupeCheck(queryObject, Happening, successFunction, failureFunction);
        };
    });
};

// function to be executed when a user tries to search for tags
var getTags = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var searchString = queryParameters.searchstring.toLowerCase();
    Happening.find({}, {tags: 1, _id: 0}, function(err, happenings) {
        var tags = [];
        happenings.forEach(function(happening){
            happening.get('tags').forEach(function(tag){
                tags.push(tag);
            });
        });
        tags = deDuplicateArray(tags);
        tags = tags.filter(function(tag){
            if (tag.slice(0, searchString.length) === searchString) {
                return true;
            }
            else {
                return false;
            };
        });
        // now create the actual response
        res.send(tags);
    });
};

// define function to be executed when a user tries to search for cities
var getCities = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var searchString = queryParameters.searchstring;
    var projectionObject = {
        '_id': 0,
        'name': 1,
        'loc': 1,
        'countryCode': 1,
        'geonameID': 1,
        'admin1Code': 1,
        'timezone': 1
    };
    City.find({ 'nameLowerCase': { $regex: '\\A' + searchString.toLowerCase() }}, projectionObject).limit(8).sort({population: -1}).exec( function(err, cities) {
        res.send(cities);
    });
};

// sends back a preflight response (for OPTIONS/CORS)
var preflightResponse = function(req, res) {
    res.send('your preflight request is approved');
};

// set up tree for parsing request Urls
var urlPathTree = {
    happenings: {
        _endpoint: {
            GET: {
                method: getHappenings,
                parameterOptions: {
                    tags: {
                        type: 'string'
                    },
                    latitude: {
                        type: 'number'
                    },
                    longitude: {
                        type: 'number'
                    }
                }
            },
            POST: {
                method: postHappening,
                parameterOptions: {
                    name: {
                        type: 'string',
                        required: true
                    },
                    begindate: {
                        type: 'date',
                        required: true
                    },
                    enddate: {
                        type: 'date',
                        required: true
                    },
                    cityid: {
                        type: 'number',
                        required: true
                    },
                    tags: {
                        type: 'string',
                        required: true
                    },
                    websiteurl: {
                        type: 'url',
                        required: true
                    }
                }
            }
        },
        _variable: {
            _endpoint: {
                GET: {
                    method: getHappening
                },
                PUT: {
                    method: putHappening,
                    parameterOptions: {
                        name: {
                            type: 'string'
                        },
                        begindate: {
                            type: 'date'
                        },
                        enddate: {
                            type: 'date'
                        },
                        cityid: {
                            type: 'number'
                        },
                        tags: {
                            type: 'string'
                        },
                        websiteurl: {
                            type: 'url'
                        }
                    }
                },
                OPTIONS: {
                    method: preflightResponse
                }
            }
        }
    },
    tags: {
        search: {
            _endpoint: {
                GET: {
                    method: getTags,
                    parameterOptions: {
                        searchstring: {
                            type: 'string',
                            required: true,
                        }
                    }
                }
            }
        }
    },
    cities: {
        search: {
            _endpoint: {
                GET: {
                    method: getCities,
                    parameterOptions: {
                        searchstring: {
                            type: 'string',
                            required: true,
                        }
                    }
                }
            }
        }
    }
};

var treehouse = require('./treehouse');

// parse the urlPathTree with setupRouters
treehouse.setupRouters(app, urlPathTree, '/');

app.listen(3000);
