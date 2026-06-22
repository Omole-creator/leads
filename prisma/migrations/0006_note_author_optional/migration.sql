-- Notes survive closer deletion (author becomes null instead of blocking delete)
ALTER TABLE "Note" DROP CONSTRAINT IF EXISTS "Note_authorId_fkey";
ALTER TABLE "Note" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
