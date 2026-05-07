import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  leaseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'leases',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  landlordId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  lateFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentType: {
    type: DataTypes.ENUM('rent', 'deposit', 'late_fee', 'maintenance', 'other'),
    defaultValue: 'rent'
  },
  paymentMethod: {
    type: DataTypes.ENUM('card', 'bank_transfer', 'cash', 'check', 'other'),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  stripePaymentIntentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stripeChargeId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  receiptUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'payments',
  timestamps: true,
  hooks: {
    beforeCreate: (payment) => {
      payment.totalAmount = parseFloat(payment.amount) + parseFloat(payment.lateFee || 0);
    },
    beforeUpdate: (payment) => {
      if (payment.changed('amount') || payment.changed('lateFee')) {
        payment.totalAmount = parseFloat(payment.amount) + parseFloat(payment.lateFee || 0);
      }
    }
  }
});

export default Payment;
