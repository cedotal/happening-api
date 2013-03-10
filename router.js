function route(handle, pathname, query, response) {
    console.log("About to route a request for " + pathname);
    // pathname is broken down into pathname segments
    var pathnameSegments = pathname.split("/");
    if (typeof handle[pathnameSegments[1]] === 'function') {
        handle[pathnameSegments[1]](pathname, query, response);
    } else {
        console.log("No request handler found for " + pathname);
        response.writeHead(404, {"Content-Type": "text/plain"});
        response.write("404 Not found");
        response.end();
    }
}

exports.route = route;
