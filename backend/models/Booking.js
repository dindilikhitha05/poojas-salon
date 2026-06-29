const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long']
    },
    customerPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    serviceId: {
      type: String,
      required: [true, 'Service ID is required'],
      enum: ['haircut', 'coloring', 'threading', 'facial', 'spa']
    },
    serviceName: {
      type: String,
      required: [true, 'Service name is required']
    },
    date: {
      type: String, // format YYYY-MM-DD
      required: [true, 'Booking date is required'],
      validate: {
        validator: function(v) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: props => `${props.value} is not a valid date format (YYYY-MM-DD)`
      }
    },
    startMinutes: {
      type: Number,
      required: [true, 'Start time in minutes is required'],
      min: 0,
      max: 1439
    },
    endMinutes: {
      type: Number,
      required: [true, 'End time in minutes is required'],
      min: 0,
      max: 1439
    },
    duration: {
      type: Number,
      required: [true, 'Duration in minutes is required']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Add index on date and startMinutes for fast queries
BookingSchema.index({ date: 1, startMinutes: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
