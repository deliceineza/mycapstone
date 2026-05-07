import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const MaintenanceRequest = sequelize.define('MaintenanceRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  unitId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'units',
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM(
      'plumbing',
      'electrical',
      'hvac',
      'appliance',
      'structural',
      'pest',
      'other'
    ),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'emergency'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'scheduled', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  images: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  vendorInfo: {
    type: DataTypes.JSONB,
    defaultValue: null
  }
}, {
  tableName: 'maintenance_requests',
  timestamps: true
});

export default MaintenanceRequest;
