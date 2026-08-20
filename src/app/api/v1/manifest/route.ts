import { NextRequest, NextResponse } from 'next/server';
import { defaultSampleManifest } from '../../../../lib/agentProtocol';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  let manifest = { ...defaultSampleManifest };
  if (domain) {
    manifest.domain = domain;
    manifest.siteName = domain.split('.')[0].toUpperCase() + ' Agent Node';
  }

  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'X-OmniRoute-Protocol': 'agent-v1.2',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
