-- Cap new hobby post titles at 40 characters.
-- NOT VALID leaves existing longer rows in place. Inserts and updates must satisfy the check.
-- Not applied to the live database by the change that added the limit.

alter table public.hobby_posts
  add constraint hobby_posts_title_length
  check (char_length(title) <= 40) not valid;
