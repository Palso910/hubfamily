-- Hub Courses — schéma complet. À exécuter UNE fois (Supabase > SQL Editor > Run) sur un projet neuf.
create extension if not exists pgcrypto;
create type role_t as enum ('super_admin','admin','membre');

-- ───────── Tables ─────────
create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete set null, -- lien vers le compte Supabase Auth (admins)
  name text not null unique, emoji text not null default '🙂', role role_t not null default 'membre', created_at timestamptz default now());
create table site_settings (
  id int primary key default 1 check (id = 1),
  palette text not null default 'sunset-or-noir', custom jsonb not null default '{}', logo_url text,
  site_name text not null default 'Hub Courses', hero text not null default 'Les envies de Paul & Étienne ✨',
  onboarding text not null default 'Bienvenue Maman 👋 — voici les articles et demandes de Paul & Étienne',
  pin_title text not null default 'Entre le code famille', pin_msg text not null default 'Bienvenue dans notre petite boutique 💛');
create table badges (id uuid primary key default gen_random_uuid(), label text not null, emoji text not null default '⭐', color text not null default '#F5C518', rank int not null default 0);
create table articles (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles(id),
  name text not null, url text not null, image_path text, image_url text,
  price numeric(10,2) not null check (price >= 0), old_price numeric(10,2),
  category text not null default 'chaussures' check (category in ('chaussures','vetements','accessoires')),
  badge_id uuid references badges(id) on delete set null, size text, color text, note text,
  pinned boolean not null default false, gifted boolean not null default false,
  status text not null default 'in_stock' check (status in ('in_stock','sale','out','removed')), created_at timestamptz default now());
create table price_history (id bigint generated always as identity primary key, article_id uuid references articles(id) on delete cascade, old_price numeric(10,2), new_price numeric(10,2), changed_at timestamptz default now());
create table requests (
  id uuid primary key default gen_random_uuid(), requester_id uuid not null references profiles(id),
  title text not null, description text, event_date date, place text, amount numeric(10,2),
  badge_id uuid references badges(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','refused')),
  decided_by uuid references profiles(id), decided_at timestamptz, decision_note text,
  notified boolean not null default false, created_at timestamptz default now());
create table comments (
  id uuid primary key default gen_random_uuid(), article_id uuid references articles(id) on delete cascade,
  request_id uuid references requests(id) on delete cascade, parent_id uuid references comments(id) on delete cascade,
  author_id uuid not null references profiles(id), body text not null check (length(body) <= 1000), created_at timestamptz default now());
create table reactions (id bigint generated always as identity primary key, article_id uuid not null references articles(id) on delete cascade, emoji text not null, sid text not null, unique (article_id, emoji, sid));
create table carts (id uuid primary key default gen_random_uuid(), sid text not null, name text not null, budget numeric(10,2) not null default 0, created_at timestamptz default now());
create table cart_items (id bigint generated always as identity primary key, cart_id uuid not null references carts(id) on delete cascade, article_id uuid not null references articles(id) on delete cascade, unique (cart_id, article_id));
create table link_reports (id bigint generated always as identity primary key, article_id uuid references articles(id) on delete cascade, resolved boolean not null default false, created_at timestamptz default now());

-- ───────── Fonctions d'identité (security definer : lisent profiles sans boucle RLS) ─────────
create function me() returns uuid language sql stable security definer set search_path = public as $$ select id from profiles where auth_id = auth.uid() $$;
create function is_super() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from profiles where auth_id = auth.uid() and role = 'super_admin') $$;
create function is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from profiles where auth_id = auth.uid() and role in ('super_admin','admin')) $$;

-- ───────── Triggers ─────────
-- Historique de prix automatique
create function log_price() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then insert into price_history(article_id, old_price, new_price) values (new.id, null, new.price);
  elsif new.price is distinct from old.price then insert into price_history(article_id, old_price, new_price) values (new.id, old.price, new.price);
  end if;
  return new;
end $$;
create trigger trg_price after insert or update of price on articles for each row execute function log_price();

-- Une requête ne peut pas être validée/refusée par son auteur ; décision horodatée ; auteur figé
create function guard_request() returns trigger language plpgsql as $$
begin
  new.requester_id := old.requester_id;
  if new.status is distinct from old.status then
    if new.decided_by is null or new.decided_by = old.requester_id then raise exception 'Un auteur ne peut pas décider de sa propre requête'; end if;
    new.decided_at := now();
  end if;
  return new;
end $$;
create trigger trg_guard_request before update on requests for each row execute function guard_request();

-- ───────── RLS : lecture pour tous (derrière le PIN), écritures cloisonnées ─────────
do $$ declare t text; begin
  foreach t in array array['profiles','site_settings','badges','articles','price_history','requests','comments','reactions','carts','cart_items','link_reports'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "lecture" on %I for select using (true)', t);
  end loop;
end $$;

create policy "super gère profils"   on profiles      for all using (is_super()) with check (is_super());
create policy "super gère réglages"  on site_settings for all using (is_super()) with check (is_super());
create policy "super gère pastilles" on badges        for all using (is_super()) with check (is_super());

create policy "admin crée ses articles"   on articles for insert with check (is_admin() and owner_id = me());
create policy "admin modifie ses articles" on articles for update using (owner_id = me()) with check (owner_id = me());
create policy "admin supprime ses articles" on articles for delete using (owner_id = me());

create policy "tous envoient des requêtes" on requests for insert with check (true);
create policy "tous décident (trigger : pas l'auteur)" on requests for update using (true) with check (true);
create policy "tous commentent"   on comments  for insert with check (true);
create policy "auteur supprime son commentaire" on comments for delete using (author_id = me());
create policy "tous réagissent"   on reactions for insert with check (true);
create policy "tous retirent une réaction" on reactions for delete using (true);
create policy "paniers ouverts"   on carts      for all using (true) with check (true);
create policy "lignes ouvertes"   on cart_items for all using (true) with check (true);
create policy "tous signalent"    on link_reports for insert with check (true);
create policy "admin résout"      on link_reports for update using (is_admin());

-- ───────── Realtime ─────────
alter publication supabase_realtime add table articles, requests, comments, reactions, carts, cart_items, site_settings, link_reports, profiles, badges;

-- ───────── Storage : bucket public « articles » (upload réservé aux admins) ─────────
insert into storage.buckets (id, name, public) values ('articles', 'articles', true) on conflict do nothing;
create policy "lecture publique images" on storage.objects for select using (bucket_id = 'articles');
create policy "upload admins"  on storage.objects for insert with check (bucket_id = 'articles' and is_admin());
create policy "modif admins"   on storage.objects for update using (bucket_id = 'articles' and is_admin());
create policy "suppr. admins"  on storage.objects for delete using (bucket_id = 'articles' and is_admin());

-- ───────── Seed ─────────
insert into profiles (name, emoji, role) values ('Paul','🅿️','super_admin'), ('Maman','👩','membre'), ('Étienne','🎧','admin');
insert into site_settings (id) values (1);  -- palette « Sunset Or Noir » par défaut (les 23 palettes sont dans lib/palettes.ts)
insert into badges (label, emoji, color, rank) values ('Indispensable','🎯','#EF4444',1), ('Grande envie','💎','#38BDF8',2), ('Coup de cœur','⭐','#F5C518',3);
