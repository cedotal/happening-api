// set up Mongo connection
var db = connect("localhost:27017/happening");

// create GET /happenings index on themes
db.happenings.ensureIndex({
    themes: 1,
    "location.loc": "2dsphere"
});

// create GET /happening index on themes
// TODO

// create GET /themes/search index
db.themes.ensureIndex({
    nameLowerCase: 1,
    name: 1,
    _id: 1
});

