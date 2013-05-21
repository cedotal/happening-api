// set up Mongo connection
db = connect("localhost:27017/happening");

// convert the latitude and longitude attributes into a GeoJSON object of type "point" -- NOTE: longitude comes before latitude in GeoJSON
db.cities.find().forEach(
    function(city){
        db.cities.update(city, {$set:{ loc: { type: 'Point', coordinates: [city.longitude, city.latitude] }}});
    }
);

// remove the old latitude and longitude values from all collections
db.cities.update({}, {$unset:{latitude:1, longitude:1} }, {multi: true});

// add a "nameLowerCase" field for each city
db.cities.find().forEach(
    function(city){
        db.cities.update(city, {$set:{ nameLowerCase: city.name.toLowerCase()}});
    }
);

// drop all indices before creating new ones
db.cities.dropIndex("*");

// create 2dsphere index on cities
db.cities.ensureIndex({loc: "2dsphere"});
