-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "storeName" TEXT NOT NULL,
    "legalName" TEXT,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "supportEmail" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "openingHours" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "announcements" TEXT[],
    "highlights" TEXT[],
    "storyStats" JSONB NOT NULL DEFAULT '[]',
    "shippingStandardPrice" INTEGER NOT NULL,
    "shippingStandardEta" TEXT NOT NULL,
    "shippingExpressPrice" INTEGER NOT NULL,
    "shippingExpressEta" TEXT NOT NULL,
    "expressEnabled" BOOLEAN NOT NULL DEFAULT true,
    "freeShippingThreshold" INTEGER,
    "taxRate" INTEGER NOT NULL DEFAULT 0,
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
    "returnDays" INTEGER NOT NULL DEFAULT 30,
    "themeInk" TEXT NOT NULL DEFAULT '#0e0e0e',
    "themeBone" TEXT NOT NULL DEFAULT '#f5f2ed',
    "themeAccent" TEXT NOT NULL DEFAULT '#b08d57',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPage" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("slug")
);
