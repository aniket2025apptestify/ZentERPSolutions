const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Zent ERP Backend is running' });
});

// API routes
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/inquiries', require('./routes/inquiryRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/quotations', require('./routes/quotationRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;

