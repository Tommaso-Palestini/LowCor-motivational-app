-- Regole di sicurezza che valgono per ogni tabella e funzione, anche quelle che arriveranno dopo:
-- se una migrazione futura se ne dimentica, questo test fallisce.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not (c.relrowsecurity and c.relforcerowsecurity)),
  0,
  'Row Level Security attiva e forzata su ogni tabella'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'PUBLIC')),
  0,
  'chi non ha fatto login non ha permessi sulle tabelle'
);

select is(
  (select count(*)::int from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'authenticated' and privilege_type <> 'SELECT'),
  0,
  'gli utenti non scrivono direttamente sulle tabelle'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('public', p.oid, 'execute'))),
  0,
  'chi non ha fatto login non esegue funzioni'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not coalesce('search_path=""' = any (p.proconfig), false)),
  0,
  'ogni funzione SECURITY DEFINER ha search_path vuoto'
);

select is(
  (select count(*)::int from pg_constraint c join pg_namespace n on n.oid = c.connamespace
   where n.nspname = 'public' and c.contype = 'f' and c.confrelid = 'auth.users'::regclass and c.confdeltype <> 'c'),
  0,
  'cancellando un utente si cancella tutto quello che lo riguarda'
);

-- La pulizia notturna è programmata e toglie davvero inviti, tentativi e impegni scaduti
select ok(
  exists (select 1 from cron.job where jobname = 'lowcor-purge-expired' and schedule = '17 3 * * *'),
  'pulizia dei dati scaduti programmata ogni notte'
);

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000aa', 'pulizia@example.com',
        '{"display_name": "Pulizia", "legal_version": "2026-10-30", "health_consent": "true"}');
insert into public.invites (owner, token_hash, created_at, expires_at)
values ('00000000-0000-0000-0000-0000000000aa', '\x01', now() - interval '9 days', now() - interval '2 days'),
       ('00000000-0000-0000-0000-0000000000aa', '\x02', now(), now() + interval '7 days');
insert into public.invite_failures (user_id, at)
values ('00000000-0000-0000-0000-0000000000aa', now() - interval '2 days');
insert into public.schedule_items (owner, day, start_min, end_min, kind)
values ('00000000-0000-0000-0000-0000000000aa', current_date - 3, 0, 30, 'block'),
       ('00000000-0000-0000-0000-0000000000aa', current_date + 1, 0, 30, 'block');
select public.purge_expired();
select is(
  (select count(*)::int from public.invites where owner = '00000000-0000-0000-0000-0000000000aa')
    + (select count(*)::int from public.invite_failures where user_id = '00000000-0000-0000-0000-0000000000aa')
    + (select count(*)::int from public.schedule_items where owner = '00000000-0000-0000-0000-0000000000aa'),
  2,
  'restano solo l''invito valido e l''impegno futuro'
);

select * from finish();
rollback;
