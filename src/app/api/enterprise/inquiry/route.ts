import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendEnterpriseInquiryEmail, sendEnterpriseConfirmationEmail } from '../../../../lib/email';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'enterprise-inquiry', 3600_000, 5);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many inquiries submitted from this IP. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, email, company, website, product, price, industry, deliveryFormat, message } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Your name is required (min 2 characters)' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ error: 'A valid work email is required' }, { status: 400 });
    }

    if (!company || typeof company !== 'string' || company.trim().length < 2) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const selectedProduct = typeof product === 'string' && product.trim().length > 0
      ? product.trim()
      : 'Enterprise Data Feed';

    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanCompany = company.trim();
    const cleanWebsite = typeof website === 'string' && website.trim().length > 0 ? website.trim() : null;
    const cleanPrice = typeof price === 'string' && price.trim().length > 0 ? price.trim() : null;
    const cleanIndustry = typeof industry === 'string' && industry.trim().length > 0 ? industry.trim() : null;
    const cleanDelivery = typeof deliveryFormat === 'string' && deliveryFormat.trim().length > 0 ? deliveryFormat.trim() : null;
    const cleanMessage = typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;

    // 1. Persist to SQLite / PostgreSQL database
    let savedInquiry;
    try {
      savedInquiry = await prisma.enterpriseInquiry.create({
        data: {
          name: cleanName,
          email: normalizedEmail,
          company: cleanCompany,
          website: cleanWebsite,
          product: selectedProduct,
          price: cleanPrice,
          industry: cleanIndustry,
          deliveryFormat: cleanDelivery,
          message: cleanMessage,
          status: 'pending',
        },
      });
    } catch (dbErr) {
      console.error('[enterprise/inquiry] Failed to persist inquiry to database:', dbErr);
      // Even if DB has an issue, continue attempting email notifications
    }

    // 2. Dispatch internal alert to contact@citeroute.com
    const emailResult = await sendEnterpriseInquiryEmail({
      name: cleanName,
      email: normalizedEmail,
      company: cleanCompany,
      website: cleanWebsite || undefined,
      product: selectedProduct,
      price: cleanPrice || undefined,
      industry: cleanIndustry || undefined,
      deliveryFormat: cleanDelivery || undefined,
      message: cleanMessage || undefined,
    });

    // 3. Dispatch confirmation receipt to prospect
    sendEnterpriseConfirmationEmail({
      name: cleanName,
      email: normalizedEmail,
      company: cleanCompany,
      website: cleanWebsite || undefined,
      product: selectedProduct,
      price: cleanPrice || undefined,
      industry: cleanIndustry || undefined,
      deliveryFormat: cleanDelivery || undefined,
      message: cleanMessage || undefined,
    }).catch((confirmErr) => {
      console.warn('[enterprise/inquiry] Confirmation email error (non-fatal):', confirmErr);
    });

    if (!emailResult.success && !savedInquiry) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to submit inquiry. Please email contact@citeroute.com directly.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      inquiryId: savedInquiry?.id,
      message: 'Thank you! Your inquiry has been received. An enterprise data specialist will reach out within 24 hours.',
    });
  } catch (err: unknown) {
    console.error('[enterprise/inquiry] Exception:', err);
    return NextResponse.json({ error: 'Failed to process inquiry' }, { status: 500 });
  }
}

