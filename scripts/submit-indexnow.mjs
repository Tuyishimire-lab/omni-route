/**
 * CiteRoute - IndexNow Trigger Script
 * Submits all public URLs to search engines via the IndexNow protocol.
 * Run with: npm run indexnow
 */
async function main() {
  const endpoint = process.env.INDEXNOW_SUBMIT_URL || 'https://www.citeroute.com/api/indexnow';
  console.log(`Submitting URLs to CiteRoute IndexNow API (${endpoint})...`);
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    const data = await res.json();
    if (res.ok && data.success) {
      console.log(`\x1b[32m✔ Success (${data.statusCode}): ${data.message}\x1b[0m`);
      console.log(`Indexed URLs:`);
      data.submittedUrls.forEach((u) => console.log(`  - ${u}`));
    } else {
      console.error(`\x1b[31m✖ Failed (${res.status}):\x1b[0m`, data);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\x1b[31m✖ Error calling IndexNow API:\x1b[0m`, err);
    process.exit(1);
  }
}

main();
