// set up Mongo connection
var db = connect("localhost:27017/happening");

db.cities.find().forEach(function(city) {
    var timezoneMatchRaw = db.timezones.find({TimeZoneId: city.timezone})[0];
    if (timezoneMatchRaw.CountryCode === undefined) {
        print('undefined timezoneMatchRaw.CountryCode!');
        print(city.timezone);
    };
    var timezoneMatchObject = {};
    timezoneMatchObject.CountryCode = timezoneMatchRaw.CountryCode;
    timezoneMatchObject.TimeZone = timezoneMatchRaw.CountryCode;
    db.cities.update({_id: city['_id']}, {$unset: {timezoneTest: timezoneMatchObject}});
    // db.cities.update({_id: city['_id']}, {$unset: {timezone: ''}});
    // db.cities.update({_id: city['_id']}, {$set: {timezone: timezoneMatchObject}});
});
