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


// application schemas and models
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
        geonameID: Number
    },
    websiteUrl: String
});

var Happening = mongoose.model('Happening', happeningSchema);

var citySchema = mongoose.Schema({
    name: String,
    latitude: Number,
    longitude: Number
},
// specify the irregular pluralization of 'city'
{
    collection: 'cities'
});

var City = mongoose.model('City', themeSchema);


// get a set of happenings filtered by theme, by location, or by nothing at all
var getHappenings = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var themeId = queryParameters.themeid;
    var queryObject = {};
    // filter for themes if themeId is passed in
    if (themeId !== undefined) {
        var themeIdObject = new mongoose.Types.ObjectId.fromString(themeId);
        queryObject.themes = themeIdObject;
    };
    // TODO: conditionally add $near operator to query object if lat and long are passed in
    Happening.find(queryObject).limit(20).exec(function(err, happenings) {
        // create an array of all returned geonameID values
        var cityIdArray = happenings.map(function(happening){ return happening.location.geonameID});
        // run a query to get the full objects of all the cities that match these geonameID values
        City.find({geonameID: {$in: cityIdArray}}, {geonameID: 1, name: 1, countryCode: 1, latitude: 1, longitude: 1, admin1Code: 1, websiteUrl: 1, _id: 1}).exec(function(err, cities){
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
                newLocation.latitude = matchedCity.get('latitude');
                newLocation.longitude = matchedCity.get('longitude');
                newLocation.countryCode = matchedCity.get('countryCode');
                newLocation.admin1Code = matchedCity.get('admin1Code');
                happening.set({'location': true});
                var newHappening = {};
                newHappening.name = happening.get('name');
                newHappening.dates = happening.get('dates');
                newHappening.themes = happening.get('themes');
                newHappening.websiteUrl = happening.get('websiteUrl');
                newHappening._id = happening.get('_id');
                newHappening.location = newLocation;
                return newHappening;
            });
            // create an array of all returned theme values
            var themeIdArray = cityJoinedHappenings.map(function(happening){ return happening.themes[0]});
            // run a query to get the full objects of all the themes that match these theme id values
            Theme.find({_id: {$in: themeIdArray}}, {name: 1, _id: 1}).exec(function(err, themes){
                // create an object so that each full city object is accessible with its geonameID as its key
                var themeObjectArray = {};
                themes.forEach(function(theme) {
                    themeObjectArray[theme.get('_id')] = theme;
                });
                // populate the location field in each happening with the joined city data 
                var cityAndThemeJoinedHappenings = cityJoinedHappenings.map(function(happening){
                    var matchedTheme = themeObjectArray[happening.themes[0]];
                    var newTheme = {};
                    newTheme.name = matchedTheme.get('name');
                    newTheme._id = matchedTheme.get('_id');
                    var newHappening = {};
                    newHappening.name = happening.name;
                    newHappening.dates = happening.dates;
                    newHappening.themes = happening.themes;
                    newHappening.websiteUrl = happening.websiteUrl;
                    newHappening._id = happening._id;
                    newHappening.location = happening.location;
                    newHappening.themes = [newTheme];
                    return newHappening;
                });
                // send the result
                res.send(cityAndThemeJoinedHappenings);
            });
        });
    });
};

// create a new happening
var postHappening = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var beginDate = new Date(queryParameters.begindate),
        endDate = new Date(queryParameters.enddate),
        name = queryParameters.name,
        geonameID = queryParameters.cityid,
        themeId = queryParameters.themeid;
        websiteUrl = queryParameters.websiteurl;
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
        console.log(happening);
        happening.save();
        res.send(happening);
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
            happening.dates.name = queryParameters.name;
        };
        if (queryParameters.themeid !== undefined && queryParameters.themeid !== '') {
            happening.themes = [queryParameters.themeid];
        };
        if (queryParameters.begindate !== undefined && queryParameters.begindate !== '') {
            happening.dates.beginDate = queryParameters.begindate;
        };
        if (queryParameters.enddate !== undefined && queryParameters.enddate !== '') {
            happening.dates.endDate = queryParameters.enddate;
        };
        if (queryParameters.cityid !== undefined && queryParameters.cityid !== '') {
            happening.location = { geonameID: queryParameters.cityid };
        };
        if (queryParameters.websiteurl !== undefined && queryParameters.websiteurl !== '') {
            happening.websiteUrl = queryParameters.websiteurl;
        };
        console.log(happening);
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
                    },
                    cityid: {
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
                    themeid: {
                        type: 'mongoObjectId',
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
                        themeid: {
                            type: 'mongoObjectId'
                        },
                        websiteurl: {
                            type: 'url'
                        }
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
