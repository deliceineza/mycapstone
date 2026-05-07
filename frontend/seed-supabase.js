import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedUsers() {
  try {
    console.log('Creating test users...');

    // Note: This will send confirmation emails. For testing, you may need to:
    // 1. Disable email confirmation in Supabase dashboard
    // 2. Or manually confirm the users in the dashboard

    // Create landlord account
    const { data: landlordData, error: landlordError } = await supabase.auth.signUp({
      email: 'landlord@example.com',
      password: 'Password123!',
      options: {
        data: {
          name: 'John Smith',
          role: 'admin'
        }
      }
    });

    if (landlordError) {
      console.log('Error creating landlord:', landlordError.message);
    } else {
      console.log('Created landlord:', landlordData.user?.email);
    }

    // Create tenant account
    const { data: tenantData, error: tenantError } = await supabase.auth.signUp({
      email: 'tenant@example.com',
      password: 'Password123!',
      options: {
        data: {
          name: 'Jane Doe',
          role: 'tenant'
        }
      }
    });

    if (tenantError) {
      console.log('Error creating tenant:', tenantError.message);
    } else {
      console.log('Created tenant:', tenantData.user?.email);
    }

    console.log('Seeding completed! Check your email for confirmation links, or disable email confirmation in Supabase dashboard for testing.');
  } catch (error) {
    console.error('Error seeding users:', error);
  }
}

seedUsers();