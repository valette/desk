// converts a json action file to the new format, without the "attributes" field
// usage : node convert.js flileToConvert.json

var fs = require('fs'),
    prettyPrint = require('pretty-data').pd;

var file = process.argv[2];
var obj = JSON.parse(fs.readFileSync(file));

var actions = obj.actions;
if (!actions) {
    console.log("no actions in this file");
    return;
}
console.log(actions);
Object.keys(actions).forEach(function (key) {
    var action = actions[key];
    if (action.attributes) {
        Object.keys(action.attributes).forEach(function (key) {
            action[key] = action.attributes[key];
        });
        delete action.attributes;
    }
});

fs.writeFileSync(file + ".converted", prettyPrint.json(obj));
