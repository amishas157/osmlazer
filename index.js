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

if (argv.filterExclude && fs.existsSync(argv.filterExclude)) {
    argv.filterExclude = JSON.parse(fs.readFileSync(argv.filterExclude));
} else {
    argv.filterExclude = false;
    process.exit();
}

var filter = ff(argv.filter);
var filterExclude = ff(argv.filterExclude);
var nonProperties = ['lat', 'lon', 'coordinates', 'location'];

fs.openSync('output.json', 'w');
fs.openSync('relations.json', 'w');

var relationIndex = {};

stream.on('data', function (data) {
    var f;

    if (data.type === 'way') {
        try {
            f = getFeature(data);
            Object.keys(data).map(function (key) {
                if (nonProperties.indexOf(key) === -1) {
                    f.properties[key] = data[key];
                }
            });
            if (f && filter(f) && filterExclude(f)) {
                var fc = {
                    'type': 'FeatureCollection',
                    'features': [f]
                };
                fs.appendFileSync('output.json', JSON.stringify(fc) + '\n', 'utf8');
            }
        } catch (e) {
            return;
        }
    } else if (data.type === 'relation') {
        data.members().forEach(function (member) {
            if (member.type === 'w') {
                if (!relationIndex.hasOwnProperty(member.ref)) {
                    relationIndex[member.ref] = [];
                }
                relationIndex[member.ref].push(data.id);
            }
        });
    }
});

stream.on('end', function() {
    fs.appendFileSync('relations.json', JSON.stringify(relationIndex, null, 2), 'utf8');
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

function addRelationMembers(feature, data) {
    console.log(data.type);
}