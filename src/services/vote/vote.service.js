// Initializes the `Vote` service on path `/vote`
const {Vote} = require('./vote.class');
const hooks = require('./vote.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/vote', new Vote(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('vote');

  service.hooks(hooks);
};
