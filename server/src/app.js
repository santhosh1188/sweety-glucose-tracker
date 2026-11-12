const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/ErrorHandler');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/readings', require('./routes/readings'));
app.use('/api/reports', require('./routes/reports'));
app.use(errorHandler);

module.exports = app;