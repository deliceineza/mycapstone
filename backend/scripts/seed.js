/**
 * Realistic demo seed data for the property management app.
 *
 * Safe to re-run: records are matched by natural demo keys and created only
 * when missing. Existing passwords are not overwritten.
 *
 * Usage:
 * npm run db:seed
 */

import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

import {
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
} from '../api/models/index.js';

const DEMO_PASSWORD = 'Password123!';

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const monthsAgo = (months) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

const monthsFrom = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const dateOnly = (date) => date.toISOString().split('T')[0];

const money = (value) => Number(value).toFixed(2);

const findOrCreateWithUpdate = async (model, where, defaults, updateFields = []) => {
  const [record, created] = await model.findOrCreate({ where, defaults });

  if (!created && updateFields.length > 0) {
    const updates = {};
    for (const field of updateFields) {
      if (defaults[field] !== undefined) {
        updates[field] = defaults[field];
      }
    }
    if (Object.keys(updates).length > 0) {
      await record.update(updates);
    }
  }

  return [record, created];
};

const ensureMessage = async ({ conversationId, senderId, content, createdAt, isRead = true }) => {
  const existing = await Message.findOne({ where: { conversationId, senderId, content } });
  if (existing) return existing;

  return Message.create({
    conversationId,
    senderId,
    content,
    messageType: 'text',
    isRead,
    readAt: isRead ? createdAt : null,
    createdAt,
    updatedAt: createdAt
  });
};

const ensureNotification = async ({ userId, type, title, body, data = {}, isRead = false, createdAt }) => {
  const [notification] = await Notification.findOrCreate({
    where: { userId, title, body },
    defaults: {
      type,
      data,
      isRead,
      readAt: isRead ? createdAt : null,
      sentVia: { push: true, email: true, sms: false },
      sentAt: createdAt,
      createdAt,
      updatedAt: createdAt
    }
  });
  return notification;
};

const seed = async () => {
  try {
    console.log('Starting realistic database seeding...');
    console.log('Database:', `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    await sequelize.authenticate();
    console.log('Database connection established.');

    const [landlord] = await findOrCreateWithUpdate(
      User,
      { email: 'landlord@example.com' },
      {
        password: DEMO_PASSWORD,
        firstName: 'John',
        lastName: 'Mwangi',
        phone: '+250788123456',
        role: 'landlord',
        isActive: true,
        mustChangePassword: false,
        notificationPreferences: { email: true, push: true, sms: true }
      },
      ['firstName', 'lastName', 'phone', 'role', 'isActive', 'mustChangePassword', 'notificationPreferences']
    );

    const tenantSeeds = [
      {
        email: 'tenant1@example.com',
        firstName: 'Aline',
        lastName: 'Uwase',
        phone: '+250788234567'
      },
      {
        email: 'tenant2@example.com',
        firstName: 'Eric',
        lastName: 'Niyonzima',
        phone: '+250788345678'
      },
      {
        email: 'tenant3@example.com',
        firstName: 'Claudine',
        lastName: 'Mukamana',
        phone: '+250788456789'
      }
    ];

    const tenants = {};
    for (const tenantSeed of tenantSeeds) {
      const [tenant] = await findOrCreateWithUpdate(
        User,
        { email: tenantSeed.email },
        {
          ...tenantSeed,
          password: DEMO_PASSWORD,
          role: 'tenant',
          isActive: true,
          mustChangePassword: false,
          notificationPreferences: { email: true, push: true, sms: false }
        },
        ['firstName', 'lastName', 'phone', 'role', 'isActive', 'mustChangePassword', 'notificationPreferences']
      );
      tenants[tenantSeed.email] = tenant;
    }

    const propertySeeds = [
      {
        key: 'heights',
        name: 'Kigali Heights Apartments',
        address: 'KG 7 Avenue, Kimihurura',
        city: 'Kigali',
        state: 'Gasabo',
        zipCode: '00000',
        country: 'Rwanda',
        propertyType: 'apartment',
        description: 'Modern apartments near Kigali Convention Centre with quick access to cafes, offices, and public transport.',
        amenities: ['High-speed WiFi', 'Secure parking', '24/7 security', 'Water 24/7', 'Backup generator', 'Cleaning services'],
        unitCount: 4
      },
      {
        key: 'downtown',
        name: 'Downtown View Residences',
        address: 'KN 3 Road, Nyarugenge',
        city: 'Kigali',
        state: 'Nyarugenge',
        zipCode: '00000',
        country: 'Rwanda',
        propertyType: 'apartment',
        description: 'Quiet city-view residences close to banks, markets, bus routes, and the Kigali business district.',
        amenities: ['WiFi', 'Parking', 'Security', 'Water 24/7', 'City view balconies'],
        unitCount: 3
      },
      {
        key: 'rebero',
        name: 'Rebero Garden Homes',
        address: 'KK 31 Avenue, Rebero',
        city: 'Kigali',
        state: 'Kicukiro',
        zipCode: '00000',
        country: 'Rwanda',
        propertyType: 'townhouse',
        description: 'Family-friendly homes with garden space, hillside air, and easy access to Kicukiro and Gikondo.',
        amenities: ['Private parking', 'Garden', 'Security', 'Water 24/7', 'Solar water heating'],
        unitCount: 2
      }
    ];

    const properties = {};
    for (const propertySeed of propertySeeds) {
      const { key, ...propertyDefaults } = propertySeed;
      const [property] = await findOrCreateWithUpdate(
        Property,
        { landlordId: landlord.id, name: propertySeed.name },
        {
          landlordId: landlord.id,
          ...propertyDefaults,
          isActive: true
        },
        ['address', 'city', 'state', 'zipCode', 'country', 'propertyType', 'description', 'amenities', 'unitCount', 'isActive']
      );
      properties[key] = property;
    }

    const unitSeeds = [
      { key: 'heights-a1', property: 'heights', unitNumber: 'A1', floor: 1, bedrooms: 1, bathrooms: 1, squareFeet: 560, rentAmount: 320, status: 'occupied', features: ['Balcony', 'Furnished kitchen', 'Fast WiFi'] },
      { key: 'heights-a2', property: 'heights', unitNumber: 'A2', floor: 1, bedrooms: 2, bathrooms: 1.5, squareFeet: 780, rentAmount: 520, status: 'occupied', features: ['Balcony', 'Convention centre view', 'In-unit laundry'] },
      { key: 'heights-b1', property: 'heights', unitNumber: 'B1', floor: 2, bedrooms: 2, bathrooms: 2, squareFeet: 850, rentAmount: 650, status: 'vacant', features: ['Corner unit', 'Covered parking', 'Large windows'] },
      { key: 'heights-b2', property: 'heights', unitNumber: 'B2', floor: 2, bedrooms: 3, bathrooms: 2, squareFeet: 1060, rentAmount: 780, status: 'maintenance', features: ['Family layout', 'Storage room', 'Backup power'] },
      { key: 'downtown-a1', property: 'downtown', unitNumber: 'A1', floor: 1, bedrooms: 1, bathrooms: 1, squareFeet: 500, rentAmount: 260, status: 'occupied', features: ['City view', 'Built-in wardrobe'] },
      { key: 'downtown-a2', property: 'downtown', unitNumber: 'A2', floor: 1, bedrooms: 2, bathrooms: 1, squareFeet: 700, rentAmount: 420, status: 'vacant', features: ['Quiet side', 'Updated bathroom'] },
      { key: 'downtown-b1', property: 'downtown', unitNumber: 'B1', floor: 2, bedrooms: 2, bathrooms: 1.5, squareFeet: 760, rentAmount: 480, status: 'vacant', features: ['Balcony', 'Open kitchen'] },
      { key: 'rebero-h1', property: 'rebero', unitNumber: 'H1', floor: 1, bedrooms: 3, bathrooms: 2, squareFeet: 1180, rentAmount: 700, status: 'occupied', features: ['Private garden', 'Two parking spots', 'Solar water heater'] },
      { key: 'rebero-h2', property: 'rebero', unitNumber: 'H2', floor: 1, bedrooms: 2, bathrooms: 2, squareFeet: 920, rentAmount: 560, status: 'vacant', features: ['Garden view', 'Covered veranda'] }
    ];

    const units = {};
    for (const unitSeed of unitSeeds) {
      const property = properties[unitSeed.property];
      const [unit] = await findOrCreateWithUpdate(
        Unit,
        { propertyId: property.id, unitNumber: unitSeed.unitNumber },
        {
          propertyId: property.id,
          floor: unitSeed.floor,
          bedrooms: unitSeed.bedrooms,
          bathrooms: unitSeed.bathrooms,
          squareFeet: unitSeed.squareFeet,
          rentAmount: money(unitSeed.rentAmount),
          depositAmount: money(unitSeed.rentAmount),
          status: unitSeed.status,
          features: unitSeed.features
        },
        ['floor', 'bedrooms', 'bathrooms', 'squareFeet', 'rentAmount', 'depositAmount', 'status', 'features']
      );
      units[unitSeed.key] = unit;
    }

    const activeStartAline = monthsAgo(3);
    const activeStartEric = monthsAgo(2);
    const pendingStartClaudine = daysFromNow(18);

    const leaseSeeds = [
      {
        key: 'aline-active',
        unit: 'heights-a1',
        tenant: 'tenant1@example.com',
        startDate: activeStartAline,
        endDate: monthsFrom(activeStartAline, 12),
        monthlyRent: 320,
        securityDeposit: 320,
        paymentDueDay: 1,
        lateFeeAmount: 20,
        lateFeeGracePeriod: 5,
        status: 'active',
        terms: 'Rent is due on the 1st of each month. Tenant has access to parking bay P-12 and shared laundry facilities.'
      },
      {
        key: 'eric-active',
        unit: 'downtown-a1',
        tenant: 'tenant2@example.com',
        startDate: activeStartEric,
        endDate: monthsFrom(activeStartEric, 12),
        monthlyRent: 260,
        securityDeposit: 260,
        paymentDueDay: 5,
        lateFeeAmount: 15,
        lateFeeGracePeriod: 4,
        status: 'active',
        terms: 'Rent is due on the 5th of each month. Tenant may use one parking space in the courtyard.'
      },
      {
        key: 'claudine-pending',
        unit: 'rebero-h1',
        tenant: 'tenant3@example.com',
        startDate: pendingStartClaudine,
        endDate: monthsFrom(pendingStartClaudine, 12),
        monthlyRent: 700,
        securityDeposit: 700,
        paymentDueDay: 1,
        lateFeeAmount: 30,
        lateFeeGracePeriod: 5,
        status: 'pending',
        terms: 'Lease has been approved and is pending move-in inspection and key handover.'
      }
    ];

    const leases = {};
    for (const leaseSeed of leaseSeeds) {
      const [lease] = await findOrCreateWithUpdate(
        Lease,
        {
          unitId: units[leaseSeed.unit].id,
          tenantId: tenants[leaseSeed.tenant].id,
          landlordId: landlord.id
        },
        {
          unitId: units[leaseSeed.unit].id,
          tenantId: tenants[leaseSeed.tenant].id,
          landlordId: landlord.id,
          startDate: dateOnly(leaseSeed.startDate),
          endDate: dateOnly(leaseSeed.endDate),
          monthlyRent: money(leaseSeed.monthlyRent),
          securityDeposit: money(leaseSeed.securityDeposit),
          paymentDueDay: leaseSeed.paymentDueDay,
          lateFeeAmount: money(leaseSeed.lateFeeAmount),
          lateFeeGracePeriod: leaseSeed.lateFeeGracePeriod,
          status: leaseSeed.status,
          terms: leaseSeed.terms,
          autoRenew: false
        },
        ['startDate', 'endDate', 'monthlyRent', 'securityDeposit', 'paymentDueDay', 'lateFeeAmount', 'lateFeeGracePeriod', 'status', 'terms', 'autoRenew']
      );
      leases[leaseSeed.key] = lease;
    }

    const paymentSeeds = [
      { lease: 'aline-active', dueDate: monthsAgo(2), amount: 320, lateFee: 0, status: 'completed', paymentMethod: 'bank_transfer', paidAt: monthsAgo(2), notes: 'March rent paid by bank transfer.' },
      { lease: 'aline-active', dueDate: monthsAgo(1), amount: 320, lateFee: 0, status: 'completed', paymentMethod: 'card', paidAt: daysAgo(27), notes: 'April rent paid through card.' },
      { lease: 'aline-active', dueDate: daysAgo(6), amount: 320, lateFee: 20, status: 'pending', paymentMethod: null, paidAt: null, notes: 'Current rent is overdue after grace period.' },
      { lease: 'eric-active', dueDate: monthsAgo(1), amount: 260, lateFee: 0, status: 'completed', paymentMethod: 'cash', paidAt: daysAgo(31), notes: 'Cash payment recorded at office.' },
      { lease: 'eric-active', dueDate: daysFromNow(5), amount: 260, lateFee: 0, status: 'pending', paymentMethod: null, paidAt: null, notes: 'Upcoming monthly rent.' },
      { lease: 'claudine-pending', dueDate: pendingStartClaudine, amount: 700, lateFee: 0, status: 'pending', paymentMethod: null, paidAt: null, notes: 'First month rent due before move-in.' }
    ];

    const payments = [];
    for (const paymentSeed of paymentSeeds) {
      const lease = leases[paymentSeed.lease];
      const [payment] = await findOrCreateWithUpdate(
        Payment,
        {
          leaseId: lease.id,
          dueDate: dateOnly(paymentSeed.dueDate),
          paymentType: 'rent'
        },
        {
          leaseId: lease.id,
          tenantId: lease.tenantId,
          landlordId: landlord.id,
          amount: money(paymentSeed.amount),
          lateFee: money(paymentSeed.lateFee),
          totalAmount: money(paymentSeed.amount + paymentSeed.lateFee),
          paymentType: 'rent',
          paymentMethod: paymentSeed.paymentMethod,
          status: paymentSeed.status,
          dueDate: dateOnly(paymentSeed.dueDate),
          paidAt: paymentSeed.paidAt,
          notes: paymentSeed.notes,
          metadata: { source: 'demo-seed' }
        },
        ['amount', 'lateFee', 'paymentMethod', 'status', 'paidAt', 'notes', 'metadata']
      );
      payments.push(payment);
    }

    const conversationSeeds = [
      {
        key: 'aline-welcome',
        tenant: 'tenant1@example.com',
        property: 'heights',
        subject: 'Welcome to Kigali Heights Apartments',
        messages: [
          { sender: 'landlord', content: 'Hello Aline, welcome to your new apartment. I hope the move into Unit A1 went smoothly.', at: daysAgo(82), read: true },
          { sender: 'tenant', content: 'Thank you John. Everything is good so far, and the security team was very helpful.', at: daysAgo(82), read: true },
          { sender: 'landlord', content: 'Please remember rent is due on the 1st. You can pay by card or bank transfer in the app.', at: daysAgo(51), read: true },
          { sender: 'tenant', content: 'Hi, the kitchen sink has an issue. Water is dripping under the cabinet.', at: daysAgo(8), read: false }
        ]
      },
      {
        key: 'eric-receipt',
        tenant: 'tenant2@example.com',
        property: 'downtown',
        subject: 'Payment receipt and unit follow-up',
        messages: [
          { sender: 'tenant', content: 'Good morning, can I get receipt for payment made in cash last month?', at: daysAgo(24), read: true },
          { sender: 'landlord', content: 'Good morning Eric. I have recorded it and your receipt is now reflected in the payments section.', at: daysAgo(24), read: true },
          { sender: 'landlord', content: 'We will also check the bathroom light during the maintenance visit tomorrow.', at: daysAgo(3), read: false }
        ]
      },
      {
        key: 'claudine-movein',
        tenant: 'tenant3@example.com',
        property: 'rebero',
        subject: 'Move-in preparation for Rebero Garden Homes',
        messages: [
          { sender: 'landlord', content: 'Hello Claudine, your lease has been approved. We can schedule the move-in inspection next week.', at: daysAgo(2), read: false },
          { sender: 'tenant', content: 'Thank you. Friday afternoon works well for me if the keys will be ready.', at: daysAgo(1), read: false }
        ]
      }
    ];

    const conversations = {};
    for (const conversationSeed of conversationSeeds) {
      const tenant = tenants[conversationSeed.tenant];
      const lastMessage = conversationSeed.messages[conversationSeed.messages.length - 1];
      const [conversation] = await findOrCreateWithUpdate(
        Conversation,
        {
          landlordId: landlord.id,
          tenantId: tenant.id,
          propertyId: properties[conversationSeed.property].id
        },
        {
          landlordId: landlord.id,
          tenantId: tenant.id,
          propertyId: properties[conversationSeed.property].id,
          subject: conversationSeed.subject,
          lastMessageAt: lastMessage.at,
          lastMessagePreview: lastMessage.content.slice(0, 100),
          isArchived: false,
          metadata: { source: 'demo-seed' }
        },
        ['subject', 'lastMessageAt', 'lastMessagePreview', 'isArchived', 'metadata']
      );

      for (const messageSeed of conversationSeed.messages) {
        await ensureMessage({
          conversationId: conversation.id,
          senderId: messageSeed.sender === 'landlord' ? landlord.id : tenant.id,
          content: messageSeed.content,
          createdAt: messageSeed.at,
          isRead: messageSeed.read
        });
      }
      conversations[conversationSeed.key] = conversation;
    }

    const maintenanceSeeds = [
      {
        unit: 'heights-a1',
        tenant: 'tenant1@example.com',
        title: 'Leaking kitchen faucet',
        description: 'Water is dripping below the kitchen sink and the cabinet floor is getting wet after washing dishes.',
        category: 'plumbing',
        priority: 'high',
        status: 'pending',
        notes: 'Tenant reported issue through chat. Plumber should inspect pipe seal and faucet connection.',
        createdAt: daysAgo(7)
      },
      {
        unit: 'downtown-a1',
        tenant: 'tenant2@example.com',
        title: 'Broken light in bathroom',
        description: 'Bathroom ceiling light turns on and off randomly. Tenant has tried replacing the bulb.',
        category: 'electrical',
        priority: 'medium',
        status: 'in_progress',
        scheduledDate: daysFromNow(1),
        notes: 'Electrician scheduled to inspect switch and fixture wiring.',
        createdAt: daysAgo(4)
      },
      {
        unit: 'heights-a2',
        tenant: 'tenant1@example.com',
        title: 'WiFi not working properly',
        description: 'Internet speed drops every evening in the living room, especially during video calls.',
        category: 'other',
        priority: 'low',
        status: 'completed',
        completedAt: daysAgo(10),
        cost: money(25),
        notes: 'Router was repositioned and access point restarted. Tenant confirmed stable connection.',
        createdAt: daysAgo(14)
      }
    ];

    for (const maintenanceSeed of maintenanceSeeds) {
      await findOrCreateWithUpdate(
        MaintenanceRequest,
        {
          unitId: units[maintenanceSeed.unit].id,
          tenantId: tenants[maintenanceSeed.tenant].id,
          title: maintenanceSeed.title
        },
        {
          unitId: units[maintenanceSeed.unit].id,
          tenantId: tenants[maintenanceSeed.tenant].id,
          landlordId: landlord.id,
          title: maintenanceSeed.title,
          description: maintenanceSeed.description,
          category: maintenanceSeed.category,
          priority: maintenanceSeed.priority,
          status: maintenanceSeed.status,
          scheduledDate: maintenanceSeed.scheduledDate || null,
          completedAt: maintenanceSeed.completedAt || null,
          notes: maintenanceSeed.notes,
          cost: maintenanceSeed.cost || null,
          vendorInfo: maintenanceSeed.status === 'in_progress'
            ? { name: 'Kigali Home Repairs', phone: '+250788909090' }
            : null,
          createdAt: maintenanceSeed.createdAt,
          updatedAt: maintenanceSeed.completedAt || maintenanceSeed.createdAt
        },
        ['description', 'category', 'priority', 'status', 'scheduledDate', 'completedAt', 'notes', 'cost', 'vendorInfo']
      );
    }

    await ensureNotification({
      userId: tenants['tenant1@example.com'].id,
      type: 'payment_overdue',
      title: 'Rent payment reminder',
      body: 'Your rent for Unit A1 is overdue. A late fee has been added after the grace period.',
      data: { leaseId: leases['aline-active'].id },
      createdAt: daysAgo(1)
    });
    await ensureNotification({
      userId: landlord.id,
      type: 'payment_received',
      title: 'Rent payment received successfully',
      body: 'Aline Uwase paid April rent for Kigali Heights Apartments - Unit A1.',
      data: { paymentId: payments[1].id },
      isRead: true,
      createdAt: daysAgo(26)
    });
    await ensureNotification({
      userId: tenants['tenant3@example.com'].id,
      type: 'lease_expiring',
      title: 'Your lease has been approved',
      body: 'Your lease for Rebero Garden Homes - Unit H1 has been approved and is pending move-in.',
      data: { leaseId: leases['claudine-pending'].id },
      createdAt: daysAgo(2)
    });
    await ensureNotification({
      userId: tenants['tenant2@example.com'].id,
      type: 'maintenance_update',
      title: 'Maintenance request updated',
      body: 'Your bathroom light repair is scheduled for tomorrow afternoon.',
      data: { unitId: units['downtown-a1'].id },
      createdAt: daysAgo(1)
    });
    await ensureNotification({
      userId: landlord.id,
      type: 'new_message',
      title: 'New tenant message',
      body: 'Aline Uwase reported an issue with the kitchen sink in Unit A1.',
      data: { conversationId: conversations['aline-welcome'].id },
      createdAt: daysAgo(8)
    });

    console.log('\n--- Realistic seeding completed successfully! ---');
    console.log('\nDemo accounts:');
    console.log(`Landlord: landlord@example.com / ${DEMO_PASSWORD}`);
    console.log(`Tenant 1: tenant1@example.com / ${DEMO_PASSWORD}`);
    console.log(`Tenant 2: tenant2@example.com / ${DEMO_PASSWORD}`);
    console.log(`Tenant 3: tenant3@example.com / ${DEMO_PASSWORD}`);
    console.log('\nCreated/ensured:');
    console.log('- 1 landlord and 3 tenants');
    console.log('- 3 Kigali properties and 9 units');
    console.log('- 2 active leases and 1 pending lease');
    console.log('- realistic rent payment history');
    console.log('- conversations, messages, maintenance requests, and notifications');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
