alter table if exists critiques
  add column if not exists share_token uuid default null;

create unique index if not exists critiques_share_token_unique
  on critiques (share_token)
  where share_token is not null;
