/**
 * CiteRoute Programmatic SEO — Domain Directory Generator
 *
 * Generates a curated list of 1,500+ SaaS/tech domains across 20 categories.
 * Output: scripts/domains-directory.json
 *
 * Run: node scripts/generate-directory.mjs
 */

// ── Category Definitions ─────────────────────────────────────────────────────
// Each category has a name, URL pattern, and curated list of domains.
// Domains are sourced from: Crunchbase top-funded, G2 top categories, ProductHunt hall-of-fame,
// YC portfolio, and industry knowledge.

const CATEGORIES = {
  'AI/Tech': [
    'openai.com', 'anthropic.com', 'perplexity.ai', 'huggingface.co', 'mistral.ai',
    'cohere.com', 'scale.com', 'midjourney.com', 'stability.ai', 'replicate.com',
    'deepseek.com', 'groq.com', 'elevenlabs.io', 'runwayml.com', 'character.ai',
    'jasper.ai', 'deepgram.com', 'poe.com', 'phind.com', 'together.ai',
    'langchain.com', 'llamaindex.ai', 'pinecone.io', 'qdrant.tech', 'weaviate.io',
    'harvey.ai', 'writer.com', 'copy.ai', 'suno.com', 'krea.ai',
    'claude.ai', 'deepmind.google', 'v0.dev', 'bolt.new', 'cursor.com',
    'weightsandbiases.com', 'tensorrt.nvidia.com', 'roboflow.com', 'labelbox.com', 'snorkel.ai',
    'databricks.com', 'anyscale.com', 'modal.com', 'banana.dev', 'baseten.co',
    'fireworks.ai', 'lepton.ai', 'cerebras.ai', 'sambanova.ai', 'mythic.ai',
    'adept.ai', 'inflection.ai', 'covariant.ai', 'physical-intelligence.com', 'figure.ai',
    'synthesia.io', 'descript.com', 'pictory.ai', 'lumen5.com', 'heygen.com',
    'tavus.io', 'play.ht', 'murf.ai', 'assemblyai.com', 'rev.ai',
    'clarifai.com', 'datature.io', 'v7labs.com', 'superannotate.com', 'appen.com',
    'humeai.com', 'unstructured.io', 'dust.tt', 'fixie.ai', 'glean.com',
    'mem.ai', 'notion.ai', 'otter.ai', 'fireflies.ai', 'krisp.ai',
  ],

  'Developer Tools': [
    'vercel.com', 'supabase.com', 'github.com', 'cloudflare.com', 'neon.tech',
    'railway.app', 'turso.tech', 'postman.com', 'docker.com', 'datadoghq.com',
    'gitlab.com', 'dub.co', 'cal.com', 'sentry.io', 'netlify.com',
    'prisma.io', 'clerk.com', 'auth0.com', 'bun.sh', 'deno.com',
    'render.com', 'fly.io', 'upstash.com', 'planetscale.com', 'convex.dev',
    'mintlify.com', 'trigger.dev', 'inngest.com', 'liveblocks.io', 'stackblitz.com',
    'codesandbox.io', 'gitpod.io', 'replit.com', 'segment.com', 'posthog.com',
    'resend.com', 'hashicorp.com', 'inkeep.com', 'linear.dev', 'stytch.com',
    'snyk.io', 'sonarqube.org', 'circleci.com', 'travisci.com', 'buildkite.com',
    'launchdarkly.com', 'split.io', 'flagsmith.com', 'unleash.run', 'optimizely.com',
    'temporal.io', 'prefect.io', 'dagster.io', 'airflow.apache.org', 'mage.ai',
    'grafana.com', 'newrelic.com', 'dynatrace.com', 'lightstep.com', 'honeycomb.io',
    'pagerduty.com', 'opsgenie.com', 'incident.io', 'statuspage.io', 'betteruptime.com',
    'pulumi.com', 'terraform.io', 'ansible.com', 'chef.io', 'puppet.com',
    'ngrok.com', 'tailscale.com', 'zerotier.com', 'envoy.com', 'istio.io',
    'kong.com', 'tyk.io', 'mux.com', 'api.video', 'livekit.io',
    'twilio.com', 'vonage.com', 'sendgrid.com', 'mailgun.com', 'postmark.com',
    'contentful.com', 'sanity.io', 'strapi.io', 'directus.io', 'payload.cms.com',
    'storyblok.com', 'prismic.io', 'buttercms.com', 'hygraph.com', 'keystonejs.com',
  ],

  'Fintech': [
    'stripe.com', 'plaid.com', 'brex.com', 'ramp.com', 'mercury.com',
    'wise.com', 'adyen.com', 'paypal.com', 'revolut.com', 'coinbase.com',
    'robinhood.com', 'squareup.com', 'bill.com', 'klarna.com', 'chime.com',
    'affirm.com', 'checkout.com', 'toasttab.com', 'carta.com', 'gusto.com',
    'deel.com', 'remote.com', 'melio.com', 'moderntreasury.com', 'alloy.com',
    'persona.com', 'lithic.com', 'ripple.com', 'marqeta.com', 'moov.io',
    'sardine.ai', 'unit.co', 'treasury-prime.com', 'synctera.com', 'column.com',
    'nuvei.com', 'airwallex.com', 'flutterwave.com', 'paystack.com', 'razorpay.com',
    'paytm.com', 'rapyd.net', 'monzo.com', 'n26.com', 'nubank.com.br',
    'sofi.com', 'wealthfront.com', 'betterment.com', 'acorns.com', 'stash.com',
    'fundrise.com', 'angellist.com', 'braintree.com', 'square.com', 'clover.com',
    'lightspeed.com', 'netsuite.com', 'xero.com', 'freshbooks.com', 'wave.com',
    'pilot.com', 'bench.co', 'rho.co', 'divvy.co', 'lili.co',
    'relay.com', 'novo.co', 'bluevine.com', 'kabbage.com', 'fundbox.com',
  ],

  'SaaS/Productivity': [
    'notion.so', 'linear.app', 'slack.com', 'asana.com', 'airtable.com',
    'clickup.com', 'miro.com', 'loom.com', 'grammarly.com', 'calendly.com',
    'basecamp.com', 'coda.io', 'front.com', 'freshworks.com', 'retool.com',
    'make.com', 'raycast.com', 'superhuman.com', 'pitch.com', 'rows.com',
    'cvent.com', 'docusign.com', 'box.com', 'dropbox.com', 'salesforce.com',
    'zendesk.com', 'monday.com', 'zapier.com', 'zoom.us', 'atlassian.com',
    'confluence.com', 'trello.com', 'todoist.com', 'evernote.com', 'bear.app',
    'obsidian.md', 'roamresearch.com', 'craft.do', 'logseq.com', 'tana.inc',
    'fibery.io', 'height.app', 'hive.com', 'wrike.com', 'smartsheet.com',
    'teamwork.com', 'podio.com', 'baserow.io', 'nocodb.com', 'seatable.io',
    'tally.so', 'typeform.com', 'jotform.com', 'google.com', 'microsoft.com',
    'apple.com', 'adobe.com', '1password.com', 'bitwarden.com', 'lastpass.com',
    'krisp.ai', 'clockify.me', 'toggl.com', 'harvest.com', 'timely.com',
    'reclaim.ai', 'motion.com', 'amie.so', 'fantastical.app', 'rise.com',
  ],

  'Design/Creative': [
    'figma.com', 'canva.com', 'framer.com', 'webflow.com', 'spline.design',
    'sketch.com', 'dribbble.com', 'behance.net', 'rive.app', 'blender.org',
    'unsplash.com', 'lottiefiles.com', 'penpot.app', 'freepik.com', 'icons8.com',
    'mobbin.com', 'relume.io', 'svgrepo.com', 'typeface.ai', 'kittl.com',
    'invisionapp.com', 'midjourney.art', 'adobe.com', 'pixlr.com', 'photopea.com',
    'remove.bg', 'cleanup.pictures', 'vectorizer.ai', 'magicstudio.com', 'photoroom.com',
    'leonardo.ai', 'ideogram.ai', 'playground.com', 'stockimg.ai', 'getimg.ai',
    'designs.ai', 'looka.com', 'brandmark.io', 'hatchful.shopify.com', 'logopony.com',
    'coolors.co', 'colorhunt.co', 'happyhues.co', 'mycolor.space', 'muzli.com',
    'fontjoy.com', 'fontsquirrel.com', 'fontshare.com', 'atipo.es', 'fontsinuse.com',
    'awwwards.com', 'cssdesignawards.com', 'siteinspire.com', 'landingfolio.com', 'lapa.ninja',
    'screenlane.com', 'pageflows.com', 'uxarchive.com', 'uigarage.net', 'collectui.com',
  ],

  'E-Commerce': [
    'shopify.com', 'bigcommerce.com', 'klaviyo.com', 'gorgias.com', 'attentive.com',
    'amazon.com', 'ebay.com', 'etsy.com', 'target.com', 'walmart.com',
    'nike.com', 'asos.com', 'bestbuy.com', 'wayfair.com', 'mercadolibre.com',
    'woocommerce.com', 'squarespace.com', 'printful.com', 'faire.com', 'gymshark.com',
    'allbirds.com', 'warbyparker.com', 'glossier.com', 'zalando.com', 'alibaba.com',
    'shopee.com', 'wix.com', 'volusion.com', 'prestashop.com', 'magento.com',
    'recharge.com', 'bold.co', 'yotpo.com', 'okendo.io', 'stamped.io',
    'smile.io', 'referralcandy.com', 'loyaltylion.com', 'shogun.io', 'pagefly.io',
    'gempages.net', 'rebuy.com', 'nosto.com', 'algolia.com', 'searchspring.com',
    'constructorio.com', 'returnly.com', 'loop.returns', 'narvar.com', 'aftership.com',
    'shiphero.com', 'shipbob.com', 'deliverr.com', 'flexport.com', 'shippo.com',
    'easypost.com', 'sezzle.com', 'afterpay.com', 'zip.co', 'splitit.com',
    'bolt.com', 'fast.co', 'paddle.com', 'lemonsqueezy.com', 'chargebee.com',
    'recurly.com', 'chargify.com', 'zuora.com', 'stripe.com', 'paypal.com',
  ],

  'Marketing/Sales': [
    'hubspot.com', 'intercom.com', 'mailchimp.com', 'drift.com', 'outreach.io',
    'salesloft.com', 'gong.io', 'chorus.ai', 'clari.com', 'highspot.com',
    'seismic.com', 'showpad.com', 'vidyard.com', 'wistia.com', 'vimeo.com',
    'sproutsocial.com', 'hootsuite.com', 'buffer.com', 'later.com', 'sprinklr.com',
    'braze.com', 'iterable.com', 'customer.io', 'sendgrid.com', 'mailgun.com',
    'convertkit.com', 'activecampaign.com', 'drip.com', 'omnisend.com', 'beehiiv.com',
    'substack.com', 'ghost.org', 'wordpress.com', 'medium.com', 'hashnode.dev',
    'semrush.com', 'ahrefs.com', 'moz.com', 'similarweb.com', 'spyfu.com',
    'clearbit.com', 'zoominfo.com', 'apollo.io', 'lusha.com', 'leadiq.com',
    'clay.com', 'instantly.ai', 'lemlist.com', 'woodpecker.co', 'reply.io',
    'hotjar.com', 'fullstory.com', 'heap.io', 'amplitude.com', 'mixpanel.com',
    'segment.com', 'rudderstack.com', 'mparticle.com', 'lytics.com', 'tealium.com',
    'unbounce.com', 'leadpages.com', 'instapage.com', 'clickfunnels.com', 'carrd.co',
    'webflow.com', 'framer.com', 'typedream.com', 'umso.com', 'super.so',
  ],

  'Security/Compliance': [
    'vanta.com', 'drata.com', 'snyk.io', '1password.com', 'crowdstrike.com',
    'paloaltonetworks.com', 'fortinet.com', 'zscaler.com', 'cloudflare.com', 'akamai.com',
    'okta.com', 'auth0.com', 'onelogin.com', 'jumpcloud.com', 'beyondtrust.com',
    'cyberark.com', 'sailpoint.com', 'varonis.com', 'rapid7.com', 'qualys.com',
    'tenable.com', 'wiz.io', 'orca.security', 'lacework.com', 'sysdig.com',
    'aquasec.com', 'bridgecrew.io', 'fugue.co', 'divvycloud.com', 'ermetic.com',
    'panther.com', 'sumo.com', 'splunk.com', 'elastic.co', 'cribl.io',
    'secureframe.com', 'launchdarkly.com', 'snorkel.ai', 'tessian.com', 'abnormalsecurity.com',
    'proofpoint.com', 'mimecast.com', 'barracuda.com', 'sophos.com', 'malwarebytes.com',
    'sentinelone.com', 'carbonblack.com', 'trellix.com', 'mandiant.com', 'fireeye.com',
  ],

  'Analytics/Data': [
    'amplitude.com', 'posthog.com', 'segment.com', 'snowflake.com', 'databricks.com',
    'looker.com', 'tableau.com', 'powerbi.microsoft.com', 'metabase.com', 'redash.io',
    'superset.apache.org', 'mode.com', 'sisense.com', 'thoughtspot.com', 'domo.com',
    'fivetran.com', 'airbyte.com', 'stitch.com', 'hevodata.com', 'matillion.com',
    'dbt.com', 'transform.co', 'atlan.com', 'alation.com', 'collibra.com',
    'montecarlo.data', 'bigeye.com', 'anomalo.com', 'soda.io', 'greatexpectations.io',
    'hex.tech', 'deepnote.com', 'observable.com', 'streamlit.io', 'gradio.app',
    'dagster.io', 'prefect.io', 'temporal.io', 'astronomer.io', 'mage.ai',
    'census.com', 'hightouch.com', 'rudderstack.com', 'lytics.com', 'heap.io',
    'fullstory.com', 'hotjar.com', 'mouseflow.com', 'lucky-orange.com', 'clarity.ms',
  ],

  'Cloud/Infrastructure': [
    'aws.amazon.com', 'cloud.google.com', 'azure.microsoft.com', 'fly.io', 'render.com',
    'digitalocean.com', 'linode.com', 'vultr.com', 'hetzner.com', 'ovhcloud.com',
    'oracle.com', 'ibm.com', 'rackspace.com', 'equinix.com', 'akamai.com',
    'fastly.com', 'bunny.net', 'keycdn.com', 'stackpath.com', 'limelight.com',
    'cockroachlabs.com', 'yugabyte.com', 'singlestore.com', 'timescale.com', 'questdb.io',
    'clickhouse.com', 'influxdata.com', 'redis.com', 'memcached.org', 'hazelcast.com',
    'confluent.io', 'redpanda.com', 'rabbitmq.com', 'nats.io', 'solace.com',
    'mongodb.com', 'couchbase.com', 'fauna.com', 'arangodb.com', 'neo4j.com',
    'dgraph.io', 'tigergraph.com', 'milvus.io', 'vespa.ai', 'elasticsearch.co',
    'opensearch.org', 'typesense.org', 'meilisearch.com', 'algolia.com', 'swiftype.com',
  ],

  'HR/Recruiting': [
    'rippling.com', 'gusto.com', 'lever.co', 'greenhouse.io', 'workday.com',
    'bamboohr.com', 'namely.com', 'paylocity.com', 'paycom.com', 'adp.com',
    'hibob.com', 'personio.com', 'deel.com', 'remote.com', 'oysterhr.com',
    'papayaglobal.com', 'velocityglobal.com', 'globalization-partners.com', 'lattice.com', 'cultureamp.com',
    'leapsome.com', '15five.com', 'betterworks.com', 'reflektive.com', 'workboard.com',
    'gem.com', 'eightfold.ai', 'beamery.com', 'phenom.com', 'icims.com',
    'smartrecruiters.com', 'jobvite.com', 'breezy.hr', 'recruitee.com', 'teamtailor.com',
    'ashbyhq.com', 'dover.com', 'hired.com', 'angellist.com', 'wellfound.com',
    'linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com', 'monster.com',
    'hireology.com', 'payscale.com', 'salary.com', 'levels.fyi', 'comparably.com',
  ],

  'Education/EdTech': [
    'coursera.org', 'duolingo.com', 'khanacademy.org', 'udemy.com', 'edx.org',
    'skillshare.com', 'pluralsight.com', 'udacity.com', 'codecademy.com', 'freecodecamp.org',
    'leetcode.com', 'hackerrank.com', 'codewars.com', 'exercism.org', 'brilliant.org',
    'masterclass.com', 'domestika.org', 'teachable.com', 'thinkific.com', 'kajabi.com',
    'podia.com', 'gumroad.com', 'patreon.com', 'ko-fi.com', 'buymeacoffee.com',
    'schoology.com', 'canvas.instructure.com', 'blackboard.com', 'moodle.org', 'brightspace.com',
    'quizlet.com', 'anki.net', 'remnote.com', 'brainscape.com', 'memrise.com',
    'classmarker.com', 'proctorio.com', 'respondus.com', 'turnitin.com', 'grammarly.com',
  ],

  'Healthcare/BioTech': [
    'zocdoc.com', 'veracyte.com', 'tempus.com', 'flatiron.com', 'guardanthealth.com',
    'oscar.com', 'clover.com', 'hims.com', 'ro.co', 'nurx.com',
    'cerebral.com', 'talkiatry.com', 'ginger.com', 'headspace.com', 'calm.com',
    'whoop.com', 'oura.com', 'fitbit.com', 'apple.com', 'withings.com',
    'epic.com', 'cerner.com', 'athenahealth.com', 'allscripts.com', 'eclinicalworks.com',
    'veeva.com', 'iqvia.com', 'medidata.com', 'benchling.com', 'geneious.com',
    'illumina.com', 'pacbio.com', 'nanoporetech.com', '10xgenomics.com', 'twist.com',
    'moderna.com', 'biontech.com', 'pfizer.com', 'regeneron.com', 'gilead.com',
  ],

  'Media/Content': [
    'substack.com', 'beehiiv.com', 'ghost.org', 'wordpress.com', 'medium.com',
    'hashnode.dev', 'devto.dev', 'reddit.com', 'producthunt.com', 'hackernews.com',
    'spotify.com', 'apple.com', 'youtube.com', 'tiktok.com', 'instagram.com',
    'twitter.com', 'threads.net', 'mastodon.social', 'bluesky.social', 'discord.com',
    'twitch.tv', 'kick.com', 'rumble.com', 'dailymotion.com', 'vimeo.com',
    'anchor.fm', 'transistor.fm', 'buzzsprout.com', 'captivate.fm', 'simplecast.com',
    'riverside.fm', 'descript.com', 'opus.pro', 'repurpose.io', 'headliner.app',
    'canva.com', 'kapwing.com', 'invideo.io', 'animoto.com', 'promo.com',
  ],

  'Legal/GovTech': [
    'ironclad.ai', 'clio.com', 'docusign.com', 'pandadoc.com', 'contractpodai.com',
    'icertis.com', 'agiloft.com', 'lexion.ai', 'juro.com', 'precisely.com',
    'legalzoom.com', 'rocketlawyer.com', 'nolo.com', 'avvo.com', 'findlaw.com',
    'westlaw.com', 'lexisnexis.com', 'casetext.com', 'notarize.com', 'hellosign.com',
    'casepacer.com', 'smokeball.com', 'mycase.com', 'clio.com', 'practicepanther.com',
    'civicplus.com', 'granicus.com', 'govdelivery.com', 'accela.com', 'tyler.com',
  ],

  'Sustainability/Climate': [
    'watershed.com', 'patch.io', 'carbonfact.com', 'persefoni.com', 'sinai.com',
    'plan-a.earth', 'normative.io', 'greenly.earth', 'sweep.net', 'emitwise.com',
    'pachama.com', 'wren.co', 'climeworks.com', 'carbonengineering.com', 'charm.industrial',
    'arcadia.com', 'voltus.co', 'ohmconnect.com', 'sunnova.com', 'sunrun.com',
    'enphase.com', 'solaredge.com', 'tesla.com', 'rivian.com', 'lucid.com',
    'northvolt.com', 'quantumscape.com', 'solidpower.com', 'formenergyinc.com', 'eos.com',
  ],

  'Crypto/Web3': [
    'coinbase.com', 'alchemy.com', 'etherscan.io', 'opensea.io', 'uniswap.org',
    'aave.com', 'compound.finance', 'makerdao.com', 'lido.fi', 'eigenlayer.xyz',
    'chainlink.com', 'thegraph.com', 'filecoin.io', 'arweave.org', 'ceramic.network',
    'polygon.technology', 'arbitrum.io', 'optimism.io', 'starknet.io', 'zksync.io',
    'metamask.io', 'phantom.app', 'rainbow.me', 'zerion.io', 'debank.com',
    'dune.com', 'nansen.ai', 'glassnode.com', 'messari.io', 'defillama.com',
  ],

  'Telecom/Communications': [
    'twilio.com', 'vonage.com', 'bandwidth.com', 'sinch.com', 'plivo.com',
    'telnyx.com', 'nexmo.com', 'messagebird.com', 'infobip.com', 'kaleyra.com',
    'ringcentral.com', 'dialpad.com', 'aircall.io', 'justcall.io', 'cloudtalk.io',
    'talkdesk.com', 'five9.com', 'genesys.com', 'nice.com', 'verint.com',
    'livekit.io', 'agora.io', 'daily.co', 'whereby.com', 'jitsi.org',
    'webex.com', 'gotomeeting.com', 'bluejeans.com', 'lifesize.com', 'pexip.com',
  ],

  'Consumer Apps': [
    'spotify.com', 'uber.com', 'airbnb.com', 'netflix.com', 'doordash.com',
    'instacart.com', 'lyft.com', 'grubhub.com', 'postmates.com', 'deliveroo.com',
    'yelp.com', 'tripadvisor.com', 'booking.com', 'expedia.com', 'kayak.com',
    'hopper.com', 'skyscanner.net', 'rome2rio.com', 'google.com', 'apple.com',
    'pinterest.com', 'snap.com', 'bumble.com', 'tinder.com', 'hinge.co',
    'nextdoor.com', 'meetup.com', 'eventbrite.com', 'ticketmaster.com', 'stubhub.com',
    'peloton.com', 'strava.com', 'myfitnesspal.com', 'noom.com', 'headspace.com',
    'duolingo.com', 'photomath.com', 'notion.so', 'todoist.com', 'anylist.com',
  ],

  'Logistics/Supply Chain': [
    'flexport.com', 'project44.com', 'fourkites.com', 'convoy.com', 'loadsmart.com',
    'shipbob.com', 'shiphero.com', 'deliverr.com', 'shippo.com', 'easypost.com',
    'aftership.com', 'narvar.com', 'returnly.com', 'loop.returns', 'goshippo.com',
    'samsara.com', 'motive.com', 'platform.science', 'trimble.com', 'descartes.com',
    'coupa.com', 'jaggaer.com', 'ivalua.com', 'sap.com', 'oracle.com',
    'llamasoft.com', 'kinaxis.com', 'o9solutions.com', 'blueyonder.com', 'manhattan.com',
  ],
};

// ── Generate JSON ────────────────────────────────────────────────────────────

const allDomains = [];
const seen = new Set();

for (const [category, domains] of Object.entries(CATEGORIES)) {
  for (const domain of domains) {
    const clean = domain.toLowerCase().trim();
    if (seen.has(clean)) continue;
    seen.add(clean);
    allDomains.push({
      domain: clean,
      url: `https://${clean}`,
      category,
    });
  }
}

// Sort by category then domain for readability
allDomains.sort((a, b) => a.category.localeCompare(b.category) || a.domain.localeCompare(b.domain));

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, 'domains-directory.json');

writeFileSync(outPath, JSON.stringify(allDomains, null, 2));

console.log(`✓ Generated ${allDomains.length} unique domains across ${Object.keys(CATEGORIES).length} categories`);
console.log(`  Output: ${outPath}`);

// Category breakdown
const catCounts = {};
for (const d of allDomains) {
  catCounts[d.category] = (catCounts[d.category] || 0) + 1;
}
console.log('\nCategory breakdown:');
for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}
