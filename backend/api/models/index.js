import sequelize from '../config/database.js';
import User from './User.js';
import Property from './Property.js';
import Unit from './Unit.js';
import Lease from './Lease.js';
import Payment from './Payment.js';
import Conversation from './Conversation.js';
import Message from './Message.js';
import Notification from './Notification.js';
import MaintenanceRequest from './MaintenanceRequest.js';

// User associations
User.hasMany(Property, { foreignKey: 'landlordId', as: 'properties' });
User.hasMany(Lease, { foreignKey: 'tenantId', as: 'tenantLeases' });
User.hasMany(Lease, { foreignKey: 'landlordId', as: 'landlordLeases' });
User.hasMany(Payment, { foreignKey: 'tenantId', as: 'tenantPayments' });
User.hasMany(Payment, { foreignKey: 'landlordId', as: 'landlordPayments' });
User.hasMany(Conversation, { foreignKey: 'landlordId', as: 'landlordConversations' });
User.hasMany(Conversation, { foreignKey: 'tenantId', as: 'tenantConversations' });
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
User.hasMany(MaintenanceRequest, { foreignKey: 'tenantId', as: 'tenantMaintenanceRequests' });
User.hasMany(MaintenanceRequest, { foreignKey: 'landlordId', as: 'landlordMaintenanceRequests' });

// Property associations
Property.belongsTo(User, { foreignKey: 'landlordId', as: 'landlord' });
Property.hasMany(Unit, { foreignKey: 'propertyId', as: 'units' });
Property.hasMany(Conversation, { foreignKey: 'propertyId', as: 'conversations' });

// Unit associations
Unit.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Unit.hasMany(Lease, { foreignKey: 'unitId', as: 'leases' });
Unit.hasMany(MaintenanceRequest, { foreignKey: 'unitId', as: 'maintenanceRequests' });

// Lease associations
Lease.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });
Lease.belongsTo(User, { foreignKey: 'tenantId', as: 'tenant' });
Lease.belongsTo(User, { foreignKey: 'landlordId', as: 'landlord' });
Lease.hasMany(Payment, { foreignKey: 'leaseId', as: 'payments' });

// Payment associations
Payment.belongsTo(Lease, { foreignKey: 'leaseId', as: 'lease' });
Payment.belongsTo(User, { foreignKey: 'tenantId', as: 'tenant' });
Payment.belongsTo(User, { foreignKey: 'landlordId', as: 'landlord' });

// Conversation associations
Conversation.belongsTo(User, { foreignKey: 'landlordId', as: 'landlord' });
Conversation.belongsTo(User, { foreignKey: 'tenantId', as: 'tenant' });
Conversation.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });

// Message associations
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// MaintenanceRequest associations
MaintenanceRequest.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });
MaintenanceRequest.belongsTo(User, { foreignKey: 'tenantId', as: 'tenant' });
MaintenanceRequest.belongsTo(User, { foreignKey: 'landlordId', as: 'landlord' });

export {
  sequelize,
  User,
  Property,
  Unit,
  Lease,
  Payment,
  Conversation,
  Message,
  Notification,
  MaintenanceRequest
};
