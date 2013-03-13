var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");

var handle = {};

handle["themes"] = requestHandlers.themes;
handle["happenings"] = requestHandlers.happenings;
handle["cities"] = requestHandlers.cities;


server.start(router.route, handle);
