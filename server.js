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
    themes: [mongoose.Types.ObjectId],
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

var getHappenings = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var themeId = queryParameters.themeid;
    var queryObject = {};
    if (themeId !== undefined) {
        queryObject._id = themeId;
    };
    Happening.find(queryObject).limit(20).exec(function(err, happenings) {
        var queryParameters = (url.parse(req.url, true).query);
        var searchString = queryParameters.searchstring;
        res.send(JSON.stringify(happenings));
    });
};

var postHappening = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var searchString = queryParameters.searchstring;
    var beginDate = new Date(queryParameters.begindate),
        endDate = new Date(queryParameters.enddate),
        name = queryParameters.name,
        cityId = queryParameters.cityid,
        themeId = queryParameters.themeid;
        var happening = new Happening({
            name: name,
            themes: [themeId],
            dates: {
                beginDate: beginDate,
                endDate: endDate
            },
            location: {
                cityId: cityId
            }
        });
        happening.save();
        res.send(JSON.stringify(happening));
};

// define function to be executed when a user tries to search for themes
var getThemes = function(req, res) {
    var queryParameters = (url.parse(req.url, true).query);
    var searchString = queryParameters.searchstring;
    Theme.find({ 'nameLowerCase': { $regex: '\\A' + searchString.toLowerCase() }}, {'_id': 1, 'name': 1}, function(err, themes) {
        // now create the actual response
        res.send(JSON.stringify(themes));
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
            res.send(JSON.stringify(theme));
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
    City.find({ 'nameLowerCase': { $regex: '\\A' + searchString.toLowerCase() }}, {'_id': 0, 'name': 1, 'latitude': 1, 'longitude': 1, 'countryCode': 1, 'population': 1 }).limit(8).sort({population: -1}).exec( function(err, cities) {
        // now create the actual response
        res.send(JSON.stringify(cities));
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
                        type: 'mongoObjectId',
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
            GET: {
                method: getThemes,
                parameterOptions: {
                    searchstring: {
                        type: 'string',
                        required: true,
                    }
                }
            },
            POST: {
                method: postTheme,
                parameterOptions: {
                    name: {
                        type: 'string',
                        required: true
                    }
                }
            }
        }
    },
    cities: {
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
};

var treehouse = require('./treehouse');

// parse the urlPathTree with setupRouters
treehouse.setupRouters(app, urlPathTree, '/');

app.listen(3000);
