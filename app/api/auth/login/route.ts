import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createJWT } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { errors, handleApiError } from '@/lib/api-error-handler';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  const context = { method: 'POST', path: '/api/auth/login' };

  try {
    logger.apiRequest(context.method, context.path);

    const body = await request.json();

    // Validate input
    const { email, password } = loginSchema.parse(body);

    // Check credentials against environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      logger.error('ADMIN_EMAIL or ADMIN_PASSWORD environment variables not set');
      throw errors.internalError('Authentication system not configured');
    }

    // Simple string comparison (no bcrypt needed for env-based auth)
    if (email !== adminEmail || password !== adminPassword) {
      logger.warn('Login attempt with invalid credentials', { email });
      throw errors.unauthorized('Invalid email or password');
    }

    // Create JWT token with a fixed user ID
    const token = await createJWT(1);

    logger.info('Admin logged in successfully', { email });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: 1,
        email: adminEmail,
        name: 'Administrator',
      },
    });

    logger.apiResponse(context.method, context.path, 200);
    return response;
  } catch (error) {
    return handleApiError(error, context);
  }
}
