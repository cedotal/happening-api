// require url for handling querystring parameters
var url = require('url');

// require http for validating urls
var http = require('http');

// merge two objects, but only keep the attributes and values in object A if object B also has that attribute
var unionMergeObjects = function(objectA, objectB) {
    var objectC = {};
    for (var attr in objectA) {
        if (objectB.hasOwnProperty(attr)){
            objectC[attr] = objectA[attr];
        };
    };
    return objectC;
};

// validity checks for the various types of parameters
var parameterValidityChecks = {
    // TODO: add and apply checks for type 'geocoordinate'
    number: function(parameter) {
        if (isNaN(Number(parameter))) {
            return false;
        }
        else {
            return true;
        };
    },
    string: function(parameter) {
        return true;
    },
    date: function(parameter) {
        if (isNaN(Date.parse(parameter))) {
            return false;
        }
        else {
            return true;
        };
    },
    mongoObjectId: function(parameter) {
        var objectIdRegExp = new RegExp("^[0-9a-fA-F]{24}$");
        // check for presence of a comma; if there is one, we're dealing with multiple _ids
        if (parameter.indexOf(',') === -1) { 
            var validity = objectIdRegExp.test(parameter);
        }
        else {
            var parameterArray = parameter.split(',');
            parameterArray = parameterArray.map(function(singleParameter) {
                return objectIdRegExp.test(singleParameter)
            });
            if (parameterArray.indexOf(false) === -1) {
                var validity = true;
            }
            else {
                var validity = false;
            };
        };
        return validity;
    },
    url: function(parameter) {
        var urlValidity = false;
        if (parameter.indexOf('.') !== -1) {
            urlValidity = true;
        };
        return urlValidity;
    }
};

// function that accepts an object mapping possible HTTP methods to an endpoint and sets up the appropriate router for each using express.js 
var setupMethodEndpoint = function(app, prefix, method, methodObject) {
    // a function that wraps the success function for an endpoint in a series of checks that return an error if the request was improperly formed
    var validityCheckWrappingFunction = function(req, res) {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, DELETE');
        res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
        res.set('Access-Control-Max-Age', '0');
        var parameterOptions = methodObject[method].parameterOptions || {};
        // set up a container for the encoding of any errors encountered in the checking
        var errorArray = [];
        // get query parameters for validity checks
        var queryParameters = (url.parse(req.url, true).query);
        // delete any query parameters that were passed in that are NOT in parameterOptions
        queryParameters = unionMergeObjects(queryParameters, parameterOptions);
        for (var queryParameter in queryParameters) {
            var parameterType = parameterOptions[queryParameter].type;
            // check if there's actually a validiy check available for the parameter type specified for this parameter
            if (parameterValidityChecks[parameterType] === undefined) {
                throw {
                    name: "no validity check for specified parameter type",
                    message: "there is no validity check function available for the parameter type specified for this parameter"
                };
            }
            // check to make sure the parameter passed passed the validity check for that type
            else if (parameterValidityChecks[parameterType](queryParameters[queryParameter]) === false) {
                errorArray.push({
                    name: queryParameter + " is not of type " + parameterType,
                    message: queryParameter + " has to be of type: " + parameterType
                });
            };
        };
        // check that all required parameters were passed
        for (var parameter in parameterOptions) {
            if (parameterOptions[parameter].required === true && queryParameters[parameter] === undefined) {
                errorArray.push({
                    name: parameter + " is required",
                    message: parameter + " has to be sent as part of a request to this endpoint"
                });
            };
        };
        // perform minimum checks
        for (var parameter in parameterOptions) {
            if (parameterOptions[parameter].min !== undefined && queryParameters[parameter] !== undefined) {
                if (queryParameters[parameter] < parameterOptions[parameter].min) {
                    errorArray.push({
                        name: parameter + " is too low",
                        message: parameter + " cannot be below " + parameterOptions[parameter].min
                });
                };
            };
        };
        // perform maximum checks
        for (var parameter in parameterOptions) {
            if (parameterOptions[parameter].max !== undefined && queryParameters[parameter] !== undefined) {
                if (queryParameters[parameter] > parameterOptions[parameter].max) {
                    errorArray.push({
                        name: parameter + " is too high",
                        message: parameter + " cannot be above " + parameterOptions[parameter].max
                    });
                };
            };
        };
        // if any errors were added to errorObject, return a function that returns the errors
        if (errorArray.length !== 0) {
            res.send({ requestErrors: errorArray });
        }
        // else execute the intended function
        else {
            methodObject[method].method(req, res);
        };
    };
    console.log('setting up endpoint at ' + method + ': ' + prefix);
    app[method.toLowerCase()](prefix, validityCheckWrappingFunction);
};

// function to iterate down a urlPathTree and set up handlers for endpoints; an endpoint is defined as an object with a '_endpoint' attribute, which maps 
var setupRouters = function(app, urlPathTree, prefix) {
    // if the _endpoint attribute is present at this level of the tree, it means we're dealing with an API endpoint
    if (urlPathTree._endpoint) {
        var validHttpMethods = ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'];
        for (method in urlPathTree._endpoint) {
            if (validHttpMethods.indexOf(method) !== -1) {
                setupMethodEndpoint(app, prefix, method, urlPathTree._endpoint);
            }
            else {
                throw {
                    'name': 'invalid method',
                    'message': 'You have defined an HTTP method that is not supported.'
                }
            };
        };
        // then get rid of the _endpoint property so it's not used to build out any new routes as we parse the tree
        delete urlPathTree._endpoint;
    };
    // then, for every branch of the tree at this level, continue parsing
    for (var segment in urlPathTree) {
        var localToSegmentPrefix = prefix;
        // express requires a '/' as the base for paths, so we only need to add on a trailing slash if we're not at the domain root  
        if (localToSegmentPrefix !== '/') { localToSegmentPrefix += '/' };
        // handle variable segments
        if (segment === '_variable') {
            localToSegmentPrefix += ':variable'
        }
        else {
            localToSegmentPrefix += segment;
        };
        // setup this branch of the tree
        setupRouters(app, urlPathTree[segment], localToSegmentPrefix);
    };
};

exports.setupRouters = setupRouters;
