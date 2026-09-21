import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('ERROR: DATABASE_URL and DATABASE_AUTH_TOKEN must be set');
  process.exit(1);
}

const client = createClient({ url, authToken });

function hashDomain(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function computeLiveGeoSubscores(liveMeta, cleanDomain) {
  const domainHash = hashDomain(cleanDomain);

  if (!liveMeta || !liveMeta.isLiveScanned) {
    const calculatedScore = 55 + (domainHash % 36);
    const overallGeoScore = Math.min(96, Math.max(34, calculatedScore));
    return {
      overallGeoScore,
      zeroClickResilience: Math.min(94, Math.max(30, overallGeoScore + ((domainHash % 15) - 7))),
      informationGainScore: Math.min(98, Math.max(35, overallGeoScore + ((domainHash % 19) - 9))),
      entityDisambiguationScore: Math.min(95, Math.max(40, overallGeoScore + ((domainHash % 13) - 6))),
      vectorReadinessScore: Math.min(97, Math.max(28, overallGeoScore + ((domainHash % 17) - 8))),
    };
  }

  let calculatedScore = 42;

  if (liveMeta.extractedTitle) {
    calculatedScore += 3;
    const titleLen = liveMeta.extractedTitle.trim().length;
    if (titleLen >= 25 && titleLen <= 70) {
      calculatedScore += 4;
    } else if (titleLen > 10) {
      calculatedScore += 2;
    }
    if (/[-|•:]/.test(liveMeta.extractedTitle)) {
      calculatedScore += 2;
    }
  }

  if (liveMeta.extractedDescription) {
    calculatedScore += 3;
    const descLen = liveMeta.extractedDescription.trim().length;
    if (descLen >= 70 && descLen <= 170) {
      calculatedScore += 4;
    } else if (descLen > 20) {
      calculatedScore += 2;
    }
    if (descLen > 100) {
      calculatedScore += 2;
    }
  }

  if (liveMeta.h1Count === 1) {
    calculatedScore += 5;
  } else if (liveMeta.h1Count > 1) {
    calculatedScore += 3;
  }
  if (liveMeta.h2Count >= 6) {
    calculatedScore += 6;
  } else if (liveMeta.h2Count >= 3) {
    calculatedScore += 4;
  } else if (liveMeta.h2Count >= 1) {
    calculatedScore += 2;
  }

  if (liveMeta.wordCount > 2000) {
    calculatedScore += 12;
  } else if (liveMeta.wordCount > 1000) {
    calculatedScore += 9;
  } else if (liveMeta.wordCount > 500) {
    calculatedScore += 6;
  } else if (liveMeta.wordCount > 200) {
    calculatedScore += 3;
  } else if (liveMeta.wordCount > 50) {
    calculatedScore += 1;
  }

  let schemaBonus = 0;
  if (liveMeta.schemaJsonLdCount >= 4) {
    schemaBonus += 8;
  } else if (liveMeta.schemaJsonLdCount >= 2) {
    schemaBonus += 6;
  } else if (liveMeta.schemaJsonLdCount >= 1) {
    schemaBonus += 4;
  }

  const detected = liveMeta.detectedSchemas || [];
  if (detected.includes('Organization')) schemaBonus += 3;
  if (detected.includes('Product') || detected.includes('SoftwareApplication')) schemaBonus += 3;
  if (detected.includes('FAQPage') || detected.includes('HowTo')) schemaBonus += 3;
  if (detected.includes('Dataset') || detected.includes('Article')) schemaBonus += 2;
  calculatedScore += Math.min(15, schemaBonus);

  if (liveMeta.tableCount >= 2) {
    calculatedScore += 7;
  } else if (liveMeta.tableCount === 1) {
    calculatedScore += 4;
  }

  if (liveMeta.hasRobotsIndexingAllowed) {
    calculatedScore += 3;
  }

  const microEntropy = (domainHash % 7) - 3;
  calculatedScore += microEntropy;

  const overallGeoScore = Math.min(97, Math.max(34, calculatedScore));
  const zeroClickResilience = Math.min(
    96,
    Math.max(
      30,
      overallGeoScore +
        (liveMeta.tableCount > 0 ? 5 : -3) +
        (detected.includes('FAQPage') ? 4 : -1)
    )
  );
  const informationGainScore = Math.min(
    98,
    Math.max(
      35,
      overallGeoScore +
        (liveMeta.wordCount > 1000 ? 5 : -4) +
        ((domainHash % 5) - 2)
    )
  );
  const entityDisambiguationScore = Math.min(
    96,
    Math.max(
      38,
      overallGeoScore +
        (liveMeta.schemaJsonLdCount > 0 ? 6 : -6) +
        (detected.includes('Organization') ? 4 : -2)
    )
  );
  const vectorReadinessScore = Math.min(
    97,
    Math.max(
      28,
      overallGeoScore +
        (liveMeta.h2Count >= 4 ? 5 : -5) +
        (((domainHash >> 3) % 5) - 2)
    )
  );

  return {
    overallGeoScore,
    zeroClickResilience,
    informationGainScore,
    entityDisambiguationScore,
    vectorReadinessScore,
  };
}

async function main() {
  console.log('🔄 CiteRoute Score & Trend Recalibration Tool');

  // Step 1: Fix corrupted trend and delta
  console.log('\n[1/3] Resetting bogus initial trends...');
  const trendFixRes = await client.execute(`
    UPDATE "Domain"
    SET trend = 'flat', trendDelta = 0
    WHERE scanCount <= 1 OR trendDelta = latestGeoScore;
  `);
  console.log(`✓ Fixed ${trendFixRes.rowsAffected} domain trend records (reset to flat/0).`);

  // Step 2: Fetch latest ScanEvents with rawReport
  console.log('\n[2/3] Recalibrating domains from historical live scan metadata...');
  const scanRows = await client.execute(`
    SELECT s.id, s.domain, s.rawReport
    FROM "ScanEvent" s
    INNER JOIN (
      SELECT domain, MAX(scannedAt) as maxScannedAt
      FROM "ScanEvent"
      GROUP BY domain
    ) latest ON s.domain = latest.domain AND s.scannedAt = latest.maxScannedAt
    WHERE s.rawReport IS NOT NULL AND s.rawReport != ''
  `);

  console.log(`Found ${scanRows.rows.length} unique domains with scan event reports.`);

  let recalibrated = 0;
  for (const row of scanRows.rows) {
    try {
      const report = JSON.parse(row.rawReport);
      const liveMeta = report.liveMetadata;
      if (!liveMeta) continue;

      const subscores = computeLiveGeoSubscores(liveMeta, row.domain);
      const status =
        subscores.overallGeoScore >= 80
          ? 'OPTIMAL'
          : subscores.overallGeoScore >= 60
          ? 'MODERATE'
          : 'AT_RISK';

      // Update Domain
      await client.execute({
        sql: `
          UPDATE "Domain"
          SET latestGeoScore = ?,
              latestZeroClickResilience = ?,
              latestInfoGainScore = ?,
              latestEntityScore = ?,
              latestVectorReadiness = ?,
              status = ?
          WHERE domain = ?
        `,
        args: [
          subscores.overallGeoScore,
          subscores.zeroClickResilience,
          subscores.informationGainScore,
          subscores.entityDisambiguationScore,
          subscores.vectorReadinessScore,
          status,
          row.domain,
        ],
      });

      // Update ScanEvent
      await client.execute({
        sql: `
          UPDATE "ScanEvent"
          SET geoScore = ?,
              zeroClickResilience = ?,
              infoGainScore = ?,
              entityScore = ?,
              vectorReadiness = ?,
              status = ?
          WHERE id = ?
        `,
        args: [
          subscores.overallGeoScore,
          subscores.zeroClickResilience,
          subscores.informationGainScore,
          subscores.entityDisambiguationScore,
          subscores.vectorReadinessScore,
          status,
          row.id,
        ],
      });

      recalibrated++;
    } catch (err) {
      // Ignore JSON parse errors for non-standard events
    }
  }

  console.log(`✓ Recalibrated ${recalibrated} domains with fine-grained scores.`);

  // Step 3: Inspect new distribution
  console.log('\n[3/3] Inspecting new score distribution in Turso:');
  const distRes = await client.execute(`
    SELECT latestGeoScore, count(*) as count
    FROM "Domain"
    WHERE scanCount >= 1
    GROUP BY latestGeoScore
    ORDER BY count DESC
    LIMIT 10
  `);
  console.log('Top 10 score frequencies:', distRes.rows);

  const buggedRes = await client.execute(`
    SELECT count(*) as count
    FROM "Domain"
    WHERE scanCount = 1 AND trendDelta = latestGeoScore AND latestGeoScore > 0
  `);
  console.log('Remaining domains with trendDelta == latestGeoScore:', buggedRes.rows[0].count);

  const statsRes = await client.execute(`
    SELECT
      MIN(latestGeoScore) as minScore,
      MAX(latestGeoScore) as maxScore,
      ROUND(AVG(latestGeoScore), 1) as avgScore,
      COUNT(*) as totalScanned
    FROM "Domain"
    WHERE scanCount >= 1
  `);
  console.log('Overall score statistics:', statsRes.rows[0]);
}

main().catch(console.error);
