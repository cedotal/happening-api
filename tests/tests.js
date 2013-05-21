var server = require('../server.js');

var assert = require('assert');
describe('test requiring files', function() {
    it('make sure that the server.js namespace is accessible', function() {
        assert.equal(server.testExposure, 'xposed string');
    });
});
