const express = require('express');
const backendApp = require('../functions/index.js');

const app = express();
// Mount the backend app at /api so routes like /api/summary are mapped to /summary
app.use('/api', backendApp);

module.exports = app;
