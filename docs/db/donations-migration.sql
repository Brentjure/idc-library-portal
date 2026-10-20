-- Donations + book_copies clean-up
-- Run inside one transaction. Review the "drop duplicated columns" step against your data first.

BEGIN;

-- 1. Donations: one row per donor visit ------------------------------------
CREATE TABLE public.donations (
    id            bigserial    PRIMARY KEY,
    member_id     int8         NULL REFERENCES public.members(id),   -- empty for visitors / anonymous
    donor_name    varchar(255) NULL,                                 -- empty only when anonymous
    donor_phone   varchar(30)  NULL,                                 -- optional
    is_anonymous  boolean      NOT NULL DEFAULT false,
    received_by   int8         NULL REFERENCES public.users(id),     -- librarian who recorded it
    received_at   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT donations_donor_chk CHECK (is_anonymous OR member_id IS NOT NULL OR donor_name IS NOT NULL)
);
CREATE INDEX donations_member_idx   ON public.donations (member_id);
CREATE INDEX donations_received_idx ON public.donations (received_at);

-- 2. Link each copy to how it arrived ---------------------------------------
ALTER TABLE public.book_copies
    ADD COLUMN donation_id int8 NULL REFERENCES public.donations(id);   -- NULL = bought / existing stock

-- 3. Allowed values for status and condition --------------------------------
ALTER TABLE public.book_copies
    ADD CONSTRAINT book_copies_status_chk
        CHECK (status IN ('AVAILABLE','ON_LOAN','RESERVED','LOST','DAMAGED','WITHDRAWN')),
    ADD CONSTRAINT book_copies_condition_chk
        CHECK ("condition" IN ('NEW','GOOD','WORN','DAMAGED'));

-- 4. Postgres does not index foreign keys on its own ------------------------
CREATE INDEX book_copies_title_idx    ON public.book_copies (book_title_id);
CREATE INDEX book_copies_status_idx   ON public.book_copies (book_title_id, status);
CREATE INDEX book_copies_donation_idx ON public.book_copies (donation_id);

-- 5. Drop details duplicated from book_titles --------------------------------
-- A copy gets its title, author, ISBN, etc. through book_title_id.
-- Check first that nothing reads these columns, then run:
ALTER TABLE public.book_copies
    DROP COLUMN title,
    DROP COLUMN author,
    DROP COLUMN isbn,
    DROP COLUMN publisher,
    DROP COLUMN publication_year,
    DROP COLUMN description,
    DROP COLUMN cover_image;

-- 6. book_titles: stop duplicate titles at the source -----------------------
ALTER TABLE public.book_titles
    ADD CONSTRAINT book_titles_category_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);
CREATE UNIQUE INDEX book_titles_isbn_uniq   ON public.book_titles (isbn) WHERE isbn IS NOT NULL;
CREATE UNIQUE INDEX book_titles_title_author_uniq ON public.book_titles (lower(title), lower(author));

-- 7. Keep updated_at honest --------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := CURRENT_TIMESTAMP; RETURN NEW; END $$ LANGUAGE plpgsql;

CREATE TRIGGER book_copies_touch BEFORE UPDATE ON public.book_copies
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER book_titles_touch BEFORE UPDATE ON public.book_titles
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 8. Readable copy codes for spine labels (BK-000123) ------------------------
CREATE SEQUENCE IF NOT EXISTS public.book_code_seq START 10001;
ALTER TABLE public.book_copies
    ALTER COLUMN book_code SET DEFAULT 'BK-' || lpad(nextval('public.book_code_seq')::text, 6, '0');

COMMIT;

-- ---------------------------------------------------------------------------
-- What "Save" in the Donate a book drawer does (one transaction):
--
--   INSERT INTO donations (member_id, donor_name, donor_phone, is_anonymous, received_by)
--   VALUES (...) RETURNING id;                                   -- :donation_id
--
--   For each book in the list:
--     -- reuse the title if it exists, otherwise create it
--     INSERT INTO book_titles (category_id, title, author, isbn, publisher, publication_year, description)
--     VALUES (...)
--     ON CONFLICT ((lower(title)), (lower(author))) DO UPDATE SET updated_at = now()
--     RETURNING id;                                               -- :title_id
--
--     -- one row per physical copy ("Copies: 3" = 3 rows, 3 spine labels)
--     INSERT INTO book_copies (book_title_id, "condition", donation_id)
--     SELECT :title_id, :condition, :donation_id FROM generate_series(1, :copies);
-- ---------------------------------------------------------------------------
