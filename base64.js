/*
 Base64 plugin
 */


exports.translate = function(load) {

    var base64 = new Buffer(load.source).toString('base64');
    return 'module.exports = "' + base64 + '";';
}

