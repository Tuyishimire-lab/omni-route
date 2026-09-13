-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "url" TEXT,
    "firstScanned" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScanned" DATETIME NOT NULL,
    "latestGeoScore" INTEGER NOT NULL DEFAULT 0,
    "latestCitationRate" INTEGER NOT NULL DEFAULT 0,
    "latestZeroClickResilience" INTEGER NOT NULL DEFAULT 0,
    "latestInfoGainScore" INTEGER NOT NULL DEFAULT 0,
    "latestEntityScore" INTEGER NOT NULL DEFAULT 0,
    "latestVectorReadiness" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'General',
    "scanCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'MODERATE',
    "trendDelta" INTEGER NOT NULL DEFAULT 0,
    "trend" TEXT NOT NULL DEFAULT 'flat'
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geoScore" INTEGER NOT NULL,
    "zeroClickResilience" INTEGER NOT NULL DEFAULT 0,
    "citationRate" INTEGER NOT NULL DEFAULT 0,
    "infoGainScore" INTEGER NOT NULL DEFAULT 0,
    "entityScore" INTEGER NOT NULL DEFAULT 0,
    "vectorReadiness" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'MODERATE',
    "sessionId" TEXT,
    "isLiveScan" BOOLEAN NOT NULL DEFAULT false,
    "rawReport" TEXT,
    "domainId" TEXT,
    CONSTRAINT "ScanEvent_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchlist" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "TelemetryEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "geoScoreAtTime" INTEGER NOT NULL DEFAULT 80,
    "settlementValue" REAL
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "tier" TEXT NOT NULL DEFAULT 'free',
    "watchlist" TEXT NOT NULL DEFAULT '[]',
    "avatarUrl" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'email',
    "providerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lemonCustomerId" TEXT,
    "lemonSubscriptionId" TEXT,
    "lemonVariantId" TEXT,
    "subscriptionStatus" TEXT,
    "subscriptionRenewsAt" DATETIME,
    "subscriptionEndsAt" DATETIME,
    "lemonPortalUrl" TEXT
);

-- CreateTable
CREATE TABLE "RegisteredSite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegisteredSite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TagHeartbeat" (
    "domain" TEXT NOT NULL PRIMARY KEY,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RateLimitRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStart" DATETIME NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WatchlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "sessionId" TEXT,
    CONSTRAINT "WatchlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchlistEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Domain_domain_key" ON "Domain"("domain");

-- CreateIndex
CREATE INDEX "Domain_latestGeoScore_idx" ON "Domain"("latestGeoScore");

-- CreateIndex
CREATE INDEX "Domain_domain_idx" ON "Domain"("domain");

-- CreateIndex
CREATE INDEX "ScanEvent_domain_idx" ON "ScanEvent"("domain");

-- CreateIndex
CREATE INDEX "ScanEvent_scannedAt_idx" ON "ScanEvent"("scannedAt");

-- CreateIndex
CREATE INDEX "TelemetryEvent_timestamp_idx" ON "TelemetryEvent"("timestamp");

-- CreateIndex
CREATE INDEX "TelemetryEvent_domain_idx" ON "TelemetryEvent"("domain");

-- CreateIndex
CREATE INDEX "TelemetryEvent_type_idx" ON "TelemetryEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "ApiKey_tier_idx" ON "ApiKey"("tier");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_provider_providerId_idx" ON "User"("provider", "providerId");

-- CreateIndex
CREATE INDEX "User_lemonCustomerId_idx" ON "User"("lemonCustomerId");

-- CreateIndex
CREATE INDEX "User_lemonSubscriptionId_idx" ON "User"("lemonSubscriptionId");

-- CreateIndex
CREATE INDEX "RegisteredSite_userId_idx" ON "RegisteredSite"("userId");

-- CreateIndex
CREATE INDEX "RegisteredSite_domain_idx" ON "RegisteredSite"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredSite_userId_domain_key" ON "RegisteredSite"("userId", "domain");

-- CreateIndex
CREATE INDEX "TagHeartbeat_lastSeen_idx" ON "TagHeartbeat"("lastSeen");

-- CreateIndex
CREATE INDEX "RateLimitRecord_identifier_action_idx" ON "RateLimitRecord"("identifier", "action");

-- CreateIndex
CREATE INDEX "RateLimitRecord_windowStart_idx" ON "RateLimitRecord"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitRecord_identifier_action_key" ON "RateLimitRecord"("identifier", "action");

-- CreateIndex
CREATE INDEX "WatchlistEntry_userId_idx" ON "WatchlistEntry"("userId");

-- CreateIndex
CREATE INDEX "WatchlistEntry_sessionId_idx" ON "WatchlistEntry"("sessionId");

-- CreateIndex
CREATE INDEX "WatchlistEntry_domain_idx" ON "WatchlistEntry"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistEntry_userId_domain_key" ON "WatchlistEntry"("userId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistEntry_sessionId_domain_key" ON "WatchlistEntry"("sessionId", "domain");
