/*
 Text plugin
 */

var fs = require('fs');

exports.translate = function(load) {

    var translated = load.source
        .replace(/(["\\])/g, '\\$1')
        .replace(/[\f]/g, "\\f")
        .replace(/[\b]/g, "\\b")
        .replace(/[\n]/g, "\\n")
        .replace(/[\t]/g, "\\t")
        .replace(/[\r]/g, "\\r")
        .replace(/[\u2028]/g, "\\u2028")
        .replace(/[\u2029]/g, "\\u2029");


    fs.writeFile("/Users/mysim1/Documents/output", translated, function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });

    return 'module.exports = "' + translated + '"';
};