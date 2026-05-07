/**
 * Database Seed Script
 * 
 * Run this script to populate the database with sample data:
 * node scripts/seed.js
 * 
 * Environment variables required:
 * - DATABASE_URL: PostgreSQL connection string
 */

import dotenv from 'dotenv';
dotenv.config({ path: new URL('../api/.env', import.meta.url).pathname });
import { 
  sequelize, 
  User, 
  Property, 
  Unit, 
  Lease, 
  Payment 
} from '../api/models/index.js';

const seed = async () => {
  try {
    console.log('Starting database seeding...');

    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Create sample landlord
    const landlord = await User.create({
      email: 'landlord@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1234567890',
      role: 'landlord'
    });
    console.log('Created landlord:', landlord.email);

    // Create sample tenant
    const tenant = await User.create({
      email: 'tenant@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+0987654321',
      role: 'tenant'
    });
    console.log('Created tenant:', tenant.email);

    // Create sample property
    const property = await Property.create({
      landlordId: landlord.id,
      name: 'Sunset Apartments',
      address: '123 Main Street',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      propertyType: 'apartment',
      unitCount: 2,
      description: 'Beautiful apartment complex with modern amenities',
      amenities: ['parking', 'laundry', 'gym', 'pool']
    });
    console.log('Created property:', property.name);

    // Create sample units
    const unit1 = await Unit.create({
      propertyId: property.id,
      unitNumber: '101',
      floor: 1,
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 850,
      rentAmount: 1500.00,
      depositAmount: 1500.00,
      status: 'occupied',
      features: ['balcony', 'dishwasher']
    });

    const unit2 = await Unit.create({
      propertyId: property.id,
      unitNumber: '102',
      floor: 1,
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 650,
      rentAmount: 1200.00,
      depositAmount: 1200.00,
      status: 'vacant',
      features: ['updated kitchen']
    });
    console.log('Created units:', unit1.unitNumber, unit2.unitNumber);

    // Create sample lease
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const lease = await Lease.create({
      unitId: unit1.id,
      tenantId: tenant.id,
      landlordId: landlord.id,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      monthlyRent: 1500.00,
      securityDeposit: 1500.00,
      paymentDueDay: 1,
      lateFeeAmount: 50.00,
      lateFeeGracePeriod: 5,
      status: 'active'
    });
    console.log('Created lease for unit:', unit1.unitNumber);

    // Create sample payment
    const dueDate = new Date();
    dueDate.setDate(1);

    const payment = await Payment.create({
      leaseId: lease.id,
      tenantId: tenant.id,
      landlordId: landlord.id,
      amount: 1500.00,
      lateFee: 0,
      totalAmount: 1500.00,
      dueDate: dueDate.toISOString().split('T')[0],
      paymentType: 'rent',
      status: 'pending'
    });
    console.log('Created payment:', payment.id);

    console.log('\n--- Seeding completed successfully! ---');
    console.log('\nTest accounts:');
    console.log('Landlord: landlord@example.com / Password123!');
    console.log('Tenant: tenant@example.com / Password123!');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
