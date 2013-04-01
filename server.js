var http = require("http");
var url = require("url");
var querystring = require("querystring");

function start(route, handle) {
    function onRequest(request, response) {
        var parsedUrl = url.parse(request.url);
        var pathname = parsedUrl.pathname;
        var query = querystring.parse(parsedUrl.query);
        console.log("Request for " + pathname + " received with query %j", query);
        
        request.setEncoding("utf8");
        
        request.addListener("end", function() {
            console.log("end event detected; routing accordingly");
            route(handle, pathname, query, request, response);
        });
    }
    
    http.createServer(onRequest).listen(8888);
    console.log("Server has started");
}

exports.start = start;
