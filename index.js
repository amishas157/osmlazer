var osmium = require('osmium');
var argv = require('minimist')(process.argv.slice(2));
var ff = require('feature-filter');
var fs = require('fs');

var file = new osmium.File(argv.file);
var reader = new osmium.Reader(file);
var location_handler = new osmium.LocationHandler();
var stream = new osmium.Stream(new osmium.Reader(file, location_handler));

if (argv.filter && fs.existsSync(argv.filter)) {
    argv.filter = JSON.parse(fs.readFileSync(argv.filter));
} else {
    argv.filter = false;
    process.exit();
}

var filter = ff(argv.filter);
var nonProperties = ['lat', 'lon', 'coordinates', 'location'];

stream.on('data', function (data) {
    var f;
    try {
        f = getFeature(data);
        Object.keys(data).map(function (key) {
            if (nonProperties.indexOf(key) === -1) {
                f.properties[key] = data[key];
            }
        });
        if ((f['geometry']['type'] === 'MultiPolygon' && f['properties']['from_way'] === false) ||
            (f['geometry']['type'] === 'LineString')) {
            if (f && filter(f)) {
                var fc = {
                    'type': 'FeatureCollection',
                    'features': [f]
                };
                console.log(JSON.stringify(fc));
            }
        }
    } catch (e) {
        return;
    }

});

stream.on('end', function() {
    process.stderr.write('done');
});

function getFeature(d) {
    var feature = {
        'type': 'Feature',
        'geometry': d.geojson(),
        'properties': d.tags()
    };

    return feature;

}