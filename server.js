// require express and create express object
var express = require('express');
var app = express();

// require, create, and init mongoose objects
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/happeningTest');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    // yay
});

// require url for handling querystring parameters
var url = require('url');

var themeSchema = mongoose.Schema({
    name: String,
    nameLowerCase: String,
    id: Number
});

var Theme = mongoose.model('Theme', themeSchema);

var happeningSchema = mongoose.Schema({
    name: String,
    id: Number,
    themes: [mongoose.Schema.ObjectId],
    dates: {
        beginDate: Date,
        endDate: Date
    },
    location: {
        geonameID: Number,
    },
    websiteUrl: String
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

var getHappenings = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var themeId = queryParameters.themeid;
    var queryObject = {};
    if (themeId !== undefined) {
        var themeIdObject = new mongoose.Types.ObjectId.fromString(themeId);
        console.log(themeIdObject);
        queryObject.themes = themeIdObject;
    };
    console.log(queryObject);
    // TODO: conditionally add $near operator to query object if lat and long are passed in
    Happening.find(queryObject).limit(20).exec(function(err, happenings) {
        var cityIdArray = happenings.map(function(happening){ return happening.location.geonameID});
        City.find({geonameID: {$in: cityIdArray}}, {geonameID: 1, name: 1, countryCode: 1, latitude: 1, longitude: 1, admin1Code: 1}).exec(function(err, cities){
            var cityObjectArray = {};
            cities.forEach(function(city) {
                cityObjectArray[city.get('geonameID')] = city;
            });
            var joinedHappenings = happenings.map(function(happening){
                var matchedCity = cityObjectArray[happening.location.geonameID];
                var newLocation = {};
                newLocation.cityName = matchedCity.get('name');
                newLocation.cityId = matchedCity.get('geonameID');
                newLocation.latitude = matchedCity.get('latitude');
                newLocation.longitude = matchedCity.get('longitude');
                newLocation.countryCode = matchedCity.get('countryCode');
                newLocation.admin1Code = matchedCity.get('admin1Code');
                happening.set({'location': true});
                var newHappening = {};
                newHappening.name = happening.get('name');
                newHappening.dates = happening.get('dates');
                newHappening.themes = happening.get('themes');
                newLocation.websiteUrl = happening.get('websiteUrl');
                newHappening.location = newLocation;
                return newHappening;
            });
            res.send(joinedHappenings);
        });
    });
};

var postHappening = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var searchString = queryParameters.searchstring;
    var beginDate = new Date(queryParameters.begindate),
        endDate = new Date(queryParameters.enddate),
        name = queryParameters.name,
        geonameID = queryParameters.cityid,
        themeId = queryParameters.themeid;
        websiteUrl = queryParameters.websiteurl;
        console.log(queryParameters);
        // check if url is complete; if not, modify it
        if (websiteUrl.substring(0,7) !== 'http://') {
            websiteUrl = 'http://' + websiteUrl;
        };
        var happening = new Happening({
            name: name,
            themes: [themeId],
            dates: {
                beginDate: beginDate,
                endDate: endDate
            },
            location: {
                geonameID: geonameID
            },
            websiteUrl: websiteUrl
        });
        happening.save();
        res.send(happening);
};

// define function to be executed when a user tries to search for themes
var getThemes = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var searchString = queryParameters.searchstring;
    Theme.find({ 'nameLowerCase': { $regex: '\\A' + searchString.toLowerCase() }}, {'_id': 1, 'name': 1}, function(err, themes) {
        // now create the actual response
        res.send(themes);
    });
};

// define function to be executed when a user tries to post a new theme
var postTheme = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var name = queryParameters.name;
    Theme.find({nameLowerCase: name.toLowerCase()}).exec(function(err, nameMatches) {
        if (nameMatches.length === 0) {
            var theme = new Theme({'name': name, 'nameLowerCase': name.toLowerCase()});
            theme.save();
            res.send(theme);
        }
        else {
            var errorObject = {
                name: 'resource must be unique',
                message: 'a resource already exists with that name'
            };
            res.send(errorObject);
        };
    });
};

// define function to be executed when a user tries to search for cities
var getCities = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var searchString = queryParameters.searchstring;
    City.find({ 'nameLowerCase': { $regex: '\\A' + searchString.toLowerCase() }}, {'_id': 0, 'name': 1, 'latitude': 1, 'longitude': 1, 'countryCode': 1, 'geonameID': 1 }).limit(8).sort({population: -1}).exec( function(err, cities) {
        res.send(cities);
    });
};

// set up tree for parsing request Urls
var urlPathTree = {
    happenings: {
        _endpoint: {
            GET: {
                method: getHappenings,
                parameterOptions: {
                    themeid: {
                        type: 'mongoObjectId'
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
                    themeid: {
                        type: 'mongoObjectId',
                        required: true
                    }
                }
            }
        }
    },
    themes: {
        _endpoint: {
            POST: {
                method: postTheme,
                parameterOptions: {
                    name: {
                        type: 'string',
                        required: true
                    }
                }
            }
        },
        search: {
            _endpoint: {
                GET: {
                    method: getThemes,
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

var testExposure = 'exposed string';
exports.testExposure = testExposure;

app.listen(3000);
