// set up Mongo connection
var db = connect("localhost:27017/happening");

// drop the indexes on the happenings collection
db.happenings.dropIndex('*');

// drop the indexes on the themes collection
db.cities.dropIndex('*');

// create GET /happenings index
db.happenings.ensureIndex({
    themes: 1,
    "location.loc": "2dsphere"
});

// create GET /happenings index for top-level query

// create GET /happenings index for manual subquery to join cities

// create GET /happening/[_id] index for top-level query



// create GET /tags/search index
db.happenings.ensureIndex({
    tags: 1
});

// create GET /cities/search index
db.cities.ensureIndex({
    _id: 0,
    name: 1,
    loc: 1,
    countryCode: 1,
    geonameID: 1,
    admin1Code: 1,
    timezone: 1,
    nameLowerCase: 1,
    population: 1
});
