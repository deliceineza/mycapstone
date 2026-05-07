import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tenant Payment & Communication API',
      description: 'REST API for property management, lease handling, payment processing, and tenant communication',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}`,
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter access token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: 'e1e8f297-057f-4d13-9471-ce0576dc1aed'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            phone: {
              type: 'string',
              example: '+1234567890'
            },
            role: {
              type: 'string',
              enum: ['landlord', 'tenant'],
              example: 'landlord'
            },
            profileImage: {
              type: 'string',
              nullable: true
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            notificationPreferences: {
              type: 'object',
              properties: {
                sms: { type: 'boolean' },
                push: { type: 'boolean' },
                email: { type: 'boolean' }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Property: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            landlordId: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              example: 'Sunset Apartments'
            },
            address: {
              type: 'string',
              example: '123 Main Street'
            },
            city: {
              type: 'string',
              example: 'Los Angeles'
            },
            state: {
              type: 'string',
              example: 'CA'
            },
            zipCode: {
              type: 'string',
              example: '90001'
            },
            country: {
              type: 'string',
              example: 'USA'
            },
            propertyType: {
              type: 'string',
              enum: ['apartment', 'house', 'condo', 'townhouse', 'commercial']
            },
            unitCount: {
              type: 'integer',
              example: 2
            },
            description: {
              type: 'string'
            },
            amenities: {
              type: 'array',
              items: { type: 'string' }
            },
            images: {
              type: 'array',
              items: { type: 'string' }
            },
            isActive: {
              type: 'boolean'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Unit: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            propertyId: {
              type: 'string',
              format: 'uuid'
            },
            unitNumber: {
              type: 'string',
              example: '101'
            },
            floor: {
              type: 'integer',
              example: 1
            },
            bedrooms: {
              type: 'integer',
              example: 2
            },
            bathrooms: {
              type: 'integer',
              example: 1
            },
            squareFeet: {
              type: 'integer',
              example: 850
            },
            rentAmount: {
              type: 'number',
              example: 1500.00
            },
            depositAmount: {
              type: 'number',
              example: 1500.00
            },
            status: {
              type: 'string',
              enum: ['occupied', 'vacant', 'maintenance']
            },
            features: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        Lease: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            unitId: {
              type: 'string',
              format: 'uuid'
            },
            tenantId: {
              type: 'string',
              format: 'uuid'
            },
            landlordId: {
              type: 'string',
              format: 'uuid'
            },
            startDate: {
              type: 'string',
              format: 'date',
              example: '2024-01-01'
            },
            endDate: {
              type: 'string',
              format: 'date',
              example: '2025-01-01'
            },
            monthlyRent: {
              type: 'number',
              example: 1500.00
            },
            securityDeposit: {
              type: 'number',
              example: 1500.00
            },
            paymentDueDay: {
              type: 'integer',
              example: 1
            },
            lateFeeAmount: {
              type: 'number',
              example: 50.00
            },
            status: {
              type: 'string',
              enum: ['active', 'terminated', 'pending']
            }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            leaseId: {
              type: 'string',
              format: 'uuid'
            },
            tenantId: {
              type: 'string',
              format: 'uuid'
            },
            landlordId: {
              type: 'string',
              format: 'uuid'
            },
            amount: {
              type: 'number',
              example: 1500.00
            },
            lateFee: {
              type: 'number',
              example: 0
            },
            totalAmount: {
              type: 'number',
              example: 1500.00
            },
            dueDate: {
              type: 'string',
              format: 'date'
            },
            paymentDate: {
              type: 'string',
              format: 'date',
              nullable: true
            },
            paymentType: {
              type: 'string',
              enum: ['rent', 'deposit', 'utilities']
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed', 'overdue']
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
              }
            }
          }
        }
      }
    }
  },
  apis: []
};

// Add paths manually for better example control
options.definition.paths = {
  '/api/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check endpoint',
      description: 'Check if the API server is running',
      responses: {
        '200': {
          description: 'Server is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  environment: { type: 'string' }
                }
              },
              example: {
                success: true,
                message: 'Server is running',
                timestamp: '2026-04-14T20:29:46.466Z',
                environment: 'development'
              }
            }
          }
        }
      }
    }
  },
  '/api/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register new user',
      description: 'Create a new user account (landlord or tenant)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password', 'firstName', 'lastName', 'role'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                phone: { type: 'string' },
                role: { type: 'string', enum: ['landlord', 'tenant'] }
              }
            },
            example: {
              email: 'newuser@example.com',
              password: 'Password123!',
              firstName: 'Jane',
              lastName: 'Smith',
              phone: '+1234567890',
              role: 'tenant'
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'User registered successfully',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Registration successful',
                data: {
                  user: {
                    id: 'e1e8f297-057f-4d13-9471-ce0576dc1aed',
                    email: 'newuser@example.com',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    phone: '+1234567890',
                    role: 'tenant',
                    isActive: true,
                    createdAt: '2026-04-14T20:29:46.466Z'
                  },
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
              }
            }
          }
        },
        '409': {
          description: 'Email already registered',
          content: {
            'application/json': {
              example: {
                success: false,
                message: 'Email already registered',
                code: 'EMAIL_EXISTS'
              }
            }
          }
        }
      }
    }
  },
  '/api/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Login user',
      description: 'Authenticate user and receive JWT token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string' }
              }
            },
            example: {
              email: 'landlord@example.com',
              password: 'Password123!'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Login successful',
                data: {
                  user: {
                    id: 'e1e8f297-057f-4d13-9471-ce0576dc1aed',
                    email: 'landlord@example.com',
                    firstName: 'John',
                    lastName: 'Smith',
                    phone: '+1234567890',
                    role: 'landlord',
                    isActive: true,
                    lastLoginAt: '2026-04-14T20:29:46.466Z',
                    createdAt: '2026-04-14T20:29:46.466Z'
                  },
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlMWU4ZjI5Ny0wNTdmLTRkMTMtOTQ3MS1jZTA1NzZkYzFhZWQiLCJpYXQiOjE3NzYxOTg1ODYsImV4cCI6MTc3NjgwMzM4Nn0.CqeH2c65t3RvCoRW_3K_afb7zsB3Aw5LS1sgGkpEhgk',
                  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlMWU4ZjI5Ny0wNTdmLTRkMTMtOTQ3MS1jZTA1NzZkYzFhZWQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjE5ODU4NiwiZXhwIjoxNzc4NzkwNTg2fQ.N6XKe2hkF-JDloTRLoRBOjI6SpPMwAFfGsocudXqmHY'
                }
              }
            }
          }
        },
        '401': {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              example: {
                success: false,
                message: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
              }
            }
          }
        }
      }
    }
  },
  '/api/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: 'Get current user',
      description: 'Retrieve authenticated user information',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Current user data',
          content: {
            'application/json': {
              example: {
                success: true,
                data: {
                  user: {
                    id: 'e1e8f297-057f-4d13-9471-ce0576dc1aed',
                    email: 'landlord@example.com',
                    firstName: 'John',
                    lastName: 'Smith',
                    phone: '+1234567890',
                    role: 'landlord',
                    isActive: true,
                    createdAt: '2026-04-14T20:29:46.466Z'
                  }
                }
              }
            }
          }
        },
        '401': {
          description: 'Unauthorized - no token provided',
          content: {
            'application/json': {
              example: {
                success: false,
                message: 'No authorization token provided',
                code: 'UNAUTHORIZED'
              }
            }
          }
        }
      }
    }
  },
  '/api/properties': {
    get: {
      tags: ['Properties'],
      summary: 'List landlord properties',
      description: 'Get all properties owned by the authenticated landlord (landlord only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        '200': {
          description: 'List of properties',
          content: {
            'application/json': {
              example: {
                success: true,
                data: [
                  {
                    id: 'prop-123',
                    landlordId: 'landlord-456',
                    name: 'Sunset Apartments',
                    address: '123 Main Street',
                    city: 'Los Angeles',
                    state: 'CA',
                    zipCode: '90001',
                    propertyType: 'apartment',
                    unitCount: 2,
                    amenities: ['parking', 'laundry', 'gym'],
                    isActive: true,
                    createdAt: '2026-04-14T20:29:46.466Z'
                  }
                ],
                pagination: { page: 1, limit: 10, total: 1 }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Properties'],
      summary: 'Create property',
      description: 'Create a new property (landlord only)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            example: {
              name: 'Downtown Lofts',
              address: '456 Oak Avenue',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94102',
              country: 'USA',
              propertyType: 'apartment',
              unitCount: 3,
              description: 'Modern loft apartments in downtown',
              amenities: ['parking', 'gym', 'concierge'],
              images: ['https://example.com/image1.jpg']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Property created successfully',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Property created successfully',
                data: {
                  id: 'prop-789',
                  landlordId: 'landlord-456',
                  name: 'Downtown Lofts',
                  address: '456 Oak Avenue',
                  city: 'San Francisco',
                  state: 'CA',
                  zipCode: '94102',
                  propertyType: 'apartment',
                  unitCount: 3,
                  createdAt: '2026-04-14T20:29:46.466Z'
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/leases': {
    get: {
      tags: ['Leases'],
      summary: 'List leases',
      description: 'Get all leases (landlord sees their leases, tenant sees their lease)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        '200': {
          description: 'List of leases',
          content: {
            'application/json': {
              example: {
                success: true,
                data: [
                  {
                    id: 'lease-123',
                    unitId: 'unit-456',
                    tenantId: 'tenant-789',
                    landlordId: 'landlord-456',
                    startDate: '2024-01-01',
                    endDate: '2025-01-01',
                    monthlyRent: 1500.00,
                    securityDeposit: 1500.00,
                    paymentDueDay: 1,
                    lateFeeAmount: 50.00,
                    status: 'active',
                    createdAt: '2026-04-14T20:29:46.466Z'
                  }
                ],
                pagination: { page: 1, limit: 10, total: 1 }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Leases'],
      summary: 'Create lease',
      description: 'Create a new lease (landlord only)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            example: {
              unitId: 'unit-456',
              tenantId: 'tenant-789',
              startDate: '2024-02-01',
              endDate: '2025-02-01',
              monthlyRent: 1500.00,
              securityDeposit: 1500.00,
              paymentDueDay: 1,
              lateFeeAmount: 50.00,
              lateFeeGracePeriod: 5
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Lease created successfully',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Lease created successfully',
                data: {
                  id: 'lease-new-123',
                  unitId: 'unit-456',
                  tenantId: 'tenant-789',
                  landlordId: 'landlord-456',
                  startDate: '2024-02-01',
                  endDate: '2025-02-01',
                  monthlyRent: 1500.00,
                  status: 'active',
                  createdAt: '2026-04-14T20:29:46.466Z'
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/payments': {
    get: {
      tags: ['Payments'],
      summary: 'List payments',
      description: 'Get all payments (landlord sees received payments, tenant sees their bills)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'overdue'] } }
      ],
      responses: {
        '200': {
          description: 'List of payments',
          content: {
            'application/json': {
              example: {
                success: true,
                data: [
                  {
                    id: 'payment-123',
                    leaseId: 'lease-123',
                    tenantId: 'tenant-789',
                    landlordId: 'landlord-456',
                    amount: 1500.00,
                    lateFee: 0,
                    totalAmount: 1500.00,
                    dueDate: '2024-02-01',
                    paymentDate: null,
                    paymentType: 'rent',
                    status: 'pending',
                    createdAt: '2026-04-14T20:29:46.466Z'
                  }
                ],
                pagination: { page: 1, limit: 10, total: 5 }
              }
            }
          }
        }
      }
    }
  },
  '/api/maintenance': {
    get: {
      tags: ['Maintenance'],
      summary: 'List maintenance requests',
      description: 'Get all maintenance requests',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'status', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        '200': {
          description: 'List of maintenance requests',
          content: {
            'application/json': {
              example: {
                success: true,
                data: [
                  {
                    id: 'maintenance-123',
                    unitId: 'unit-456',
                    tenantId: 'tenant-789',
                    landlordId: 'landlord-456',
                    description: 'Broken AC unit needs repair',
                    priority: 'high',
                    category: 'HVAC',
                    status: 'pending',
                    createdAt: '2026-04-14T20:29:46.466Z'
                  }
                ],
                pagination: { page: 1, limit: 10, total: 3 }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Maintenance'],
      summary: 'Create maintenance request',
      description: 'Submit a new maintenance request (tenant only)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            example: {
              unitId: 'unit-456',
              description: 'Kitchen sink is leaking',
              priority: 'high',
              category: 'PLUMBING',
              attachments: ['https://example.com/photo1.jpg']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Maintenance request created',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Maintenance request created successfully',
                data: {
                  id: 'maintenance-new-456',
                  unitId: 'unit-456',
                  tenantId: 'tenant-789',
                  landlordId: 'landlord-456',
                  description: 'Kitchen sink is leaking',
                  priority: 'high',
                  category: 'PLUMBING',
                  status: 'pending',
                  createdAt: '2026-04-14T20:29:46.466Z'
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/messages/conversations': {
    get: {
      tags: ['Messages'],
      summary: 'List conversations',
      description: 'Get all conversations for the current user',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'List of conversations',
          content: {
            'application/json': {
              example: {
                success: true,
                data: [
                  {
                    id: 'conv-123',
                    landlordId: 'landlord-456',
                    tenantId: 'tenant-789',
                    propertyId: 'prop-123',
                    lastMessage: 'When can you fix the AC?',
                    lastMessageAt: '2026-04-14T20:29:46.466Z',
                    unreadCount: 2,
                    isArchived: false,
                    createdAt: '2026-04-14T20:29:46.466Z'
                  }
                ]
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Messages'],
      summary: 'Create conversation',
      description: 'Start a new conversation between landlord and tenant',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            example: {
              participantId: 'tenant-789',
              propertyId: 'prop-123',
              initialMessage: 'Hi, I have a question about the lease'
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Conversation created',
          content: {
            'application/json': {
              example: {
                success: true,
                message: 'Conversation created successfully',
                data: {
                  id: 'conv-new-456',
                  landlordId: 'landlord-456',
                  tenantId: 'tenant-789',
                  propertyId: 'prop-123',
                  createdAt: '2026-04-14T20:29:46.466Z'
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'List notifications',
      description: 'Get all notifications for the current user',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
      ],
      responses: {
        '200': {
          description: 'List of notifications',
          content: {
            'application/json': {
              example: {
                success: true,
                data: [
                  {
                    id: 'notif-123',
                    userId: 'tenant-789',
                    title: 'Payment Reminder',
                    message: 'Your rent is due on February 1st',
                    type: 'payment',
                    relatedId: 'payment-123',
                    isRead: false,
                    createdAt: '2026-04-14T20:29:46.466Z'
                  }
                ],
                pagination: { page: 1, limit: 20, total: 5 }
              }
            }
          }
        }
      }
    }
  }
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
