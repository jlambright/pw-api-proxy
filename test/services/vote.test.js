const assert = require('assert');
const app = require('../../src/app');

describe('\'Vote\' service', () => {
  it('registered the service', () => {
    const service = app.service('vote');

    assert.ok(service, 'Registered the service');
  });
});
