-- Rollback: 0001_gray_maelstrom (categories.id integer -> text)
ALTER TABLE "categories" ALTER COLUMN "id" SET DATA TYPE integer USING "id"::integer;
