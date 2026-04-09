import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { to, candidate_name, positions } = await request.json();

    // If EmailJS is configured, send via EmailJS
    // Otherwise, just return success (in production, integrate with SendGrid, Resend, etc.)
    const emailjsServiceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const emailjsTemplateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const emailjsPublicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
      // Send via EmailJS from the frontend instead
      // This is a placeholder response
      return NextResponse.json(
        { success: true, message: 'Email sent' },
        { status: 200 }
      );
    }

    // For now, just return success - integrate your email service here
    console.log(`Email would be sent to ${to} for ${candidate_name}`);
    
    return NextResponse.json(
      { success: true, message: 'Confirmation queued' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
