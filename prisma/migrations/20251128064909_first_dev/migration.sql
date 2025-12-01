-- CreateTable
CREATE TABLE "devices" (
    "sn" TEXT NOT NULL,
    "name" TEXT,
    "ipAddress" TEXT,
    "lastActivity" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',

    CONSTRAINT "devices_pkey" PRIMARY KEY ("sn")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" BIGSERIAL NOT NULL,
    "deviceSn" TEXT NOT NULL,
    "userPin" TEXT NOT NULL,
    "checkTime" TIMESTAMP(3) NOT NULL,
    "status" INTEGER NOT NULL,
    "verifyMode" INTEGER NOT NULL,
    "rawData" TEXT,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_deviceSn_userPin_checkTime_key" ON "attendance_logs"("deviceSn", "userPin", "checkTime");

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_deviceSn_fkey" FOREIGN KEY ("deviceSn") REFERENCES "devices"("sn") ON DELETE CASCADE ON UPDATE CASCADE;
