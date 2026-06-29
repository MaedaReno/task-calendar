-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "workspaceId" TEXT NOT NULL DEFAULT 'default',
ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Event_workspaceId_idx" ON "Event"("workspaceId");

-- CreateIndex
CREATE INDEX "Task_workspaceId_idx" ON "Task"("workspaceId");

-- CreateIndex
CREATE INDEX "TaskTemplate_workspaceId_idx" ON "TaskTemplate"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_workspaceId_key" ON "UserSettings"("workspaceId");
