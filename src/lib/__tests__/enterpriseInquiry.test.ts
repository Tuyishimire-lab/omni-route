import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/enterprise/inquiry/route';
import { GET as adminGetInquiries, PATCH as adminPatchInquiries } from '../../app/api/admin/inquiries/route';
import * as emailModule from '../email';
import * as rateLimiter from '../rateLimiter';
import * as authModule from '../auth';
import { prisma } from '../prisma';

describe('POST /api/enterprise/inquiry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects inquiry with missing name', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 4, resetMs: 50000 });

    const req = new NextRequest('https://www.citeroute.com/api/enterprise/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'prospect@acme.com',
        company: 'Acme Corp',
        product: 'Competitor Benchmarking',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Your name is required');
  });

  it('rejects inquiry with invalid email', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 4, resetMs: 50000 });

    const req = new NextRequest('https://www.citeroute.com/api/enterprise/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'not-an-email',
        company: 'Acme Corp',
        product: 'Competitor Benchmarking',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('A valid work email is required');
  });

  it('rejects inquiry with missing company name', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 4, resetMs: 50000 });

    const req = new NextRequest('https://www.citeroute.com/api/enterprise/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Doe',
        email: 'jane@acme.com',
        company: '',
        product: 'Competitor Benchmarking',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Company name is required');
  });

  it('successfully persists inquiry to database and dispatches notifications', async () => {
    vi.spyOn(rateLimiter, 'checkRateLimit').mockResolvedValue({ allowed: true, remaining: 4, resetMs: 50000 });
    const emailSpy = vi.spyOn(emailModule, 'sendEnterpriseInquiryEmail').mockResolvedValue({
      success: true,
      id: 'lead-msg-123',
    });
    const confirmSpy = vi.spyOn(emailModule, 'sendEnterpriseConfirmationEmail').mockResolvedValue({
      success: true,
      id: 'confirm-msg-123',
    });

    const prismaCreateSpy = vi.spyOn(prisma.enterpriseInquiry, 'create').mockResolvedValue({
      id: 'inq_test123',
      name: 'Sarah Connor',
      email: 'sarah@cyberdyne.com',
      company: 'Cyberdyne Systems',
      website: 'cyberdyne.com',
      product: 'Full Index Access',
      price: '$5,000/month',
      industry: 'AI & Frontier Tech',
      deliveryFormat: 'Private REST API Key',
      message: 'Looking for full index access for our internal AI model benchmark team.',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest('https://www.citeroute.com/api/enterprise/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: 'sarah@cyberdyne.com',
        company: 'Cyberdyne Systems',
        website: 'cyberdyne.com',
        product: 'Full Index Access',
        price: '$5,000/month',
        industry: 'AI & Frontier Tech',
        deliveryFormat: 'Private REST API Key',
        message: 'Looking for full index access for our internal AI model benchmark team.',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.inquiryId).toBe('inq_test123');
    expect(data.message).toContain('Your inquiry has been received');

    expect(prismaCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Sarah Connor',
          email: 'sarah@cyberdyne.com',
          company: 'Cyberdyne Systems',
          product: 'Full Index Access',
          status: 'pending',
        }),
      })
    );

    expect(emailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sarah Connor',
        email: 'sarah@cyberdyne.com',
        company: 'Cyberdyne Systems',
      })
    );

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sarah Connor',
        email: 'sarah@cyberdyne.com',
      })
    );
  });
});

describe('Admin Inquiries API /api/admin/inquiries', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthorized access when not admin', async () => {
    vi.spyOn(authModule, 'getSession').mockResolvedValue(null);

    const req = new NextRequest('https://www.citeroute.com/api/admin/inquiries');
    const res = await adminGetInquiries(req);
    expect(res.status).toBe(401);
  });

  it('lists inquiries and stats for authorized admin', async () => {
    vi.spyOn(authModule, 'getSession').mockResolvedValue({
      userId: 'admin_1',
      email: 'admin@citeroute.com',
      role: 'admin',
      tier: 'enterprise',
    } as any);

    vi.spyOn(prisma.enterpriseInquiry, 'findMany').mockResolvedValue([
      {
        id: 'inq_1',
        name: 'Alex Rivera',
        email: 'alex@fintech.io',
        company: 'Fintech IO',
        website: 'fintech.io',
        product: 'Vertical Leaderboard',
        price: '$500/month',
        industry: 'Fintech & Banking',
        deliveryFormat: 'Automated Weekly CSV Export',
        message: 'Need weekly updates',
        status: 'pending',
        createdAt: new Date('2026-09-14T10:00:00Z'),
        updatedAt: new Date('2026-09-14T10:00:00Z'),
      },
    ]);

    vi.spyOn(prisma.enterpriseInquiry, 'count')
      .mockResolvedValueOnce(1) // total
      .mockResolvedValueOnce(1) // pending
      .mockResolvedValueOnce(0) // contacted
      .mockResolvedValueOnce(0) // qualified
      .mockResolvedValueOnce(0); // closed

    const req = new NextRequest('https://www.citeroute.com/api/admin/inquiries?status=pending');
    const res = await adminGetInquiries(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.inquiries).toHaveLength(1);
    expect(data.inquiries[0].company).toBe('Fintech IO');
    expect(data.stats.total).toBe(1);
    expect(data.stats.pending).toBe(1);
  });

  it('updates inquiry status successfully', async () => {
    vi.spyOn(authModule, 'getSession').mockResolvedValue({
      userId: 'admin_1',
      email: 'admin@citeroute.com',
      role: 'admin',
      tier: 'enterprise',
    } as any);

    const updateSpy = vi.spyOn(prisma.enterpriseInquiry, 'update').mockResolvedValue({
      id: 'inq_1',
      name: 'Alex Rivera',
      email: 'alex@fintech.io',
      company: 'Fintech IO',
      website: 'fintech.io',
      product: 'Vertical Leaderboard',
      price: '$500/month',
      industry: 'Fintech & Banking',
      deliveryFormat: 'Automated Weekly CSV Export',
      message: 'Need weekly updates',
      status: 'contacted',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest('https://www.citeroute.com/api/admin/inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'inq_1', status: 'contacted' }),
    });

    const res = await adminPatchInquiries(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.inquiry.status).toBe('contacted');
    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'inq_1' },
      data: { status: 'contacted' },
    });
  });
});
