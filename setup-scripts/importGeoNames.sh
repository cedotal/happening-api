# script to get tab-delimited city files from geonames.org, process them, and import them into MongoDB

# set the name of the file we're getting; geonames.org has several available
filename=cities1000

# get the file
wget -r -O cities.zip http://download.geonames.org/export/dump/$filename.zip

#unzip the TSV .txt file, then remove the zip file
unzip -o cities.zip
rm cities.zip

# run the mongo scripts necessary to tear down the old cities collection
mongo mongoTeardown.js

# sleep the script for 30 seconds while the cities are removed 
# TODO: make this reliant on a periodic check for whether all cities collections have been removed
sleep 30

# import the TSV file into MongoDB
mongoimport --db happening --collection cities --type tsv --file $filename.txt -f geonameID,name,asciiName,alternateNames,latitude,longitude,featureClass,featureCode,countryCode,cc2,admin1Code,admin2Code,admin3Code,admin4Code,population,elevation,dem,timezone,modificationDate

# remove the txt file
rm $filename.txt

# run the mongo scripts necessary to edit and set up indexes for the new cities collection
mongo mongoSetup.js
