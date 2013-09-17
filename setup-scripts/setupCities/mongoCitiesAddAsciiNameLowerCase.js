// set up Mongo connection
db = connect("localhost:27017/happening");

// add a "asciiNameLowerCase" field for each city
db.cities.find().forEach(
    function(city){
        db.cities.update(city, {$set:{ asciiNameLowerCase: city.asciiName.toLowerCase()}});
    }
);