-- LowCor: account, salvataggio dei dati e condivisione degli impegni.
--
-- Regole che valgono per tutto il file:
-- * ogni tabella ha la Row Level Security attiva e forzata;
-- * i client (ruolo authenticated) leggono direttamente solo le proprie righe di profiles e user_state;
-- * ogni scrittura passa da una funzione SECURITY DEFINER che ricava l'utente da auth.uid() (mai da un
--   parametro), valida l'input, limita quantità e frequenza e ha search_path vuoto (nomi sempre qualificati);
-- * il ruolo anon (chi non ha fatto login) non ha alcun permesso;
-- * cancellando l'utente da auth.users si cancella a cascata tutto ciò che lo riguarda.

-- Le funzioni create da qui in poi non sono eseguibili da nessuno finché non lo concediamo noi
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Profili: solo il nome da mostrare alle persone collegate. Niente email, niente foto.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 1 and 60 and display_name !~ '[[:cntrl:]]'),
  created_at timestamptz not null default now()
);

create function public.clean_display_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(left(btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g')), 60), ''),
    'LowCor'
  )
$$;

-- Consensi: la prova di cosa ha accettato l'utente e quando (art. 7.1 GDPR).
-- Il consenso al trattamento di dati che possono riguardare la salute (art. 9.2.a) è obbligatorio per
-- avere un account: chi lo ritira cancella l'account e con lui i dati sul server.
create table public.consents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  legal_version text not null check (legal_version ~ '^\d{4}-\d{2}-\d{2}$'),
  health_data boolean not null check (health_data),
  accepted_at timestamptz not null default now()
);

-- Alla registrazione: senza consensi non si crea l'account (il controllo è qui, non solo nell'app)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version text := new.raw_user_meta_data ->> 'legal_version';
begin
  if coalesce(new.raw_user_meta_data ->> 'health_consent', '') <> 'true'
    or v_version is null
    or v_version !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'consent_required' using errcode = '42501';
  end if;
  insert into public.profiles (id, display_name)
  values (new.id, public.clean_display_name(new.raw_user_meta_data ->> 'display_name'));
  insert into public.consents (user_id, legal_version, health_data)
  values (new.id, v_version, true);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------------------------------
-- Stato dell'app: lo stesso JSON che l'app tiene sul dispositivo, una riga per utente.
-- revision serve per non sovrascrivere le modifiche fatte nel frattempo da un altro dispositivo.

create table public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------------
-- Persone collegate. Un collegamento è reciproco ed è fatto di due righe: ognuno decide cosa mostra
-- all'altro (none = niente, busy = solo occupato/libero, details = anche i titoli).

create table public.shares (
  owner uuid not null references auth.users (id) on delete cascade,
  viewer uuid not null references auth.users (id) on delete cascade,
  level text not null default 'busy' check (level in ('none', 'busy', 'details')),
  created_at timestamptz not null default now(),
  primary key (owner, viewer),
  check (owner <> viewer)
);

create index shares_viewer_idx on public.shares (viewer);

-- Inviti: il codice si vede una volta sola, nel database c'è solo il suo hash.
-- Scade in 7 giorni e vale per una persona.
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz
);

create index invites_owner_idx on public.invites (owner, created_at);

-- Tentativi falliti di usare un codice, per fermare chi prova a indovinarli
create table public.invite_failures (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);

create index invite_failures_user_idx on public.invite_failures (user_id, at);

-- Impegni pubblicati per le persone collegate: solo le prossime settimane, solo giorno, ora e titolo.
create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  day date not null,
  start_min smallint not null check (start_min between 0 and 1439),
  end_min smallint not null check (end_min between 1 and 1440),
  title text not null default '' check (char_length(title) <= 120),
  kind text not null check (kind in ('block', 'job')),
  check (end_min > start_min)
);

create index schedule_items_owner_day_idx on public.schedule_items (owner, day);

-- ---------------------------------------------------------------------------------------------------
-- Row Level Security: attiva e forzata ovunque. Le uniche letture dirette sono le proprie righe.

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.consents enable row level security;
alter table public.consents force row level security;
alter table public.user_state enable row level security;
alter table public.user_state force row level security;
alter table public.shares enable row level security;
alter table public.shares force row level security;
alter table public.invites enable row level security;
alter table public.invites force row level security;
alter table public.invite_failures enable row level security;
alter table public.invite_failures force row level security;
alter table public.schedule_items enable row level security;
alter table public.schedule_items force row level security;

create policy "Il proprio profilo" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "I propri consensi" on public.consents
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Il proprio stato" on public.user_state
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.consents, public.user_state to authenticated;
-- service_role è solo per il server e gli strumenti di amministrazione: la chiave non va mai nell'app
grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------------------------------
-- Funzioni chiamate dall'app

create function public.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- Salva lo stato solo se nessun altro dispositivo l'ha cambiato da quando l'abbiamo letto.
-- In caso di conflitto restituisce la versione sul server, e l'app chiede quale tenere.
create function public.save_state(p_data jsonb, p_base_revision bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_row public.user_state;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid_state' using errcode = '22023';
  end if;
  if octet_length(p_data::text) > 2000000 then
    raise exception 'state_too_large' using errcode = '54000';
  end if;

  if coalesce(p_base_revision, 0) = 0 then
    insert into public.user_state (user_id, data)
    values (v_uid, p_data)
    on conflict (user_id) do nothing
    returning * into v_row;
  else
    update public.user_state
    set data = p_data, revision = revision + 1, updated_at = now()
    where user_id = v_uid and revision = p_base_revision
    returning * into v_row;
  end if;

  if v_row.user_id is null then
    select * into v_row from public.user_state where user_id = v_uid;
    return jsonb_build_object(
      'ok', false,
      'revision', coalesce(v_row.revision, 0),
      'updated_at', v_row.updated_at,
      'data', v_row.data
    );
  end if;
  return jsonb_build_object('ok', true, 'revision', v_row.revision, 'updated_at', v_row.updated_at);
end;
$$;

create function public.update_profile(p_display_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_name text := public.clean_display_name(p_display_name);
begin
  update public.profiles set display_name = v_name where id = v_uid;
  return v_name;
end;
$$;

-- Accetta una nuova versione di privacy e termini
create function public.accept_legal(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
begin
  if p_version is null or p_version !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'invalid_version' using errcode = '22023';
  end if;
  update public.consents set legal_version = p_version, accepted_at = now() where user_id = v_uid;
end;
$$;

create function public.create_invite()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_token text;
  v_expires timestamptz;
begin
  -- Pulizia: gli inviti usati o scaduti non servono più dopo un giorno
  delete from public.invites
  where owner = v_uid and (used_at is not null or expires_at < now()) and created_at < now() - interval '1 day';

  if (select count(*) from public.invites where owner = v_uid and used_at is null and expires_at > now()) >= 5 then
    raise exception 'too_many_open_invites' using errcode = 'P0001';
  end if;
  if (select count(*) from public.invites where owner = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'invite_rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.shares where owner = v_uid) >= 200 then
    raise exception 'too_many_connections' using errcode = 'P0001';
  end if;

  -- 144 bit casuali: impossibili da indovinare anche senza il limite ai tentativi
  v_token := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
  insert into public.invites (owner, token_hash)
  values (v_uid, sha256(convert_to(v_token, 'UTF8')))
  returning expires_at into v_expires;
  return jsonb_build_object('token', v_token, 'expires_at', v_expires);
end;
$$;

-- Non solleva errori per i codici sbagliati: il tentativo fallito deve restare registrato
create function public.accept_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_invite public.invites;
  v_name text;
begin
  if (select count(*) from public.invite_failures where user_id = v_uid and at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  if p_token is not null and char_length(p_token) between 10 and 100 then
    select * into v_invite
    from public.invites
    where token_hash = sha256(convert_to(btrim(p_token), 'UTF8')) and used_at is null and expires_at > now()
    for update;
  end if;

  if v_invite.id is null or v_invite.owner = v_uid then
    delete from public.invite_failures where user_id = v_uid and at < now() - interval '1 day';
    insert into public.invite_failures (user_id) values (v_uid);
    return jsonb_build_object('ok', false, 'reason', case when v_invite.owner = v_uid then 'own_invite' else 'invalid' end);
  end if;

  if (select count(*) from public.shares where owner = v_uid) >= 200
    or (select count(*) from public.shares where owner = v_invite.owner) >= 200 then
    return jsonb_build_object('ok', false, 'reason', 'too_many_connections');
  end if;

  update public.invites set used_at = now() where id = v_invite.id;
  insert into public.shares (owner, viewer)
  values (v_invite.owner, v_uid), (v_uid, v_invite.owner)
  on conflict do nothing;

  select display_name into v_name from public.profiles where id = v_invite.owner;
  return jsonb_build_object('ok', true, 'id', v_invite.owner, 'display_name', v_name);
end;
$$;

create function public.my_connections()
returns table (id uuid, display_name text, i_share text, they_share text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select mine.viewer, profile.display_name, mine.level, coalesce(theirs.level, 'none'), mine.created_at
  from public.shares mine
  join public.profiles profile on profile.id = mine.viewer
  left join public.shares theirs on theirs.owner = mine.viewer and theirs.viewer = mine.owner
  where mine.owner = public.require_user()
  order by profile.display_name
$$;

create function public.set_share_level(p_viewer uuid, p_level text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
begin
  if p_level is null or p_level not in ('none', 'busy', 'details') then
    raise exception 'invalid_level' using errcode = '22023';
  end if;
  update public.shares set level = p_level where owner = v_uid and viewer = p_viewer;
  if not found then
    raise exception 'not_connected' using errcode = 'P0002';
  end if;
  -- Chi non mostra più niente a nessuno non deve lasciare impegni pubblicati sul server
  if not exists (select 1 from public.shares where owner = v_uid and level <> 'none') then
    delete from public.schedule_items where owner = v_uid;
  end if;
end;
$$;

-- Toglie il collegamento in entrambe le direzioni
create function public.remove_connection(p_other uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
begin
  delete from public.shares
  where (owner = v_uid and viewer = p_other) or (owner = p_other and viewer = v_uid);
  if not exists (select 1 from public.shares where owner = v_uid and level <> 'none') then
    delete from public.schedule_items where owner = v_uid;
  end if;
end;
$$;

-- Sostituisce gli impegni pubblicati nell'intervallo dato. Se nessuno può vederli, non salva niente.
create function public.publish_schedule(p_from date, p_to date, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
  v_count integer;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 62
    or p_from < current_date - 7 or p_to > current_date + 120 then
    raise exception 'invalid_range' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 500 then
    raise exception 'invalid_items' using errcode = '22023';
  end if;

  -- Oltre all'intervallo si tolgono gli impegni passati: non servono più a nessuno
  delete from public.schedule_items
  where owner = v_uid and (day between p_from and p_to or day < current_date - 1);

  if not exists (select 1 from public.shares where owner = v_uid and level <> 'none') then
    delete from public.schedule_items where owner = v_uid;
    return 0;
  end if;

  insert into public.schedule_items (owner, day, start_min, end_min, title, kind)
  select v_uid, item.day, item.start_min, item.end_min, left(btrim(coalesce(item.title, '')), 120), item.kind
  from jsonb_to_recordset(p_items) as item (day date, start_min integer, end_min integer, title text, kind text)
  where item.day between p_from and p_to;
  get diagnostics v_count = row_count;

  if (select count(*) from public.schedule_items where owner = v_uid) > 1500 then
    raise exception 'too_many_items' using errcode = '54000';
  end if;
  return v_count;
end;
$$;

-- Gli impegni delle persone collegate, secondo quello che ognuna ha scelto di mostrare
create function public.shared_schedule(p_from date, p_to date)
returns table (
  owner uuid,
  display_name text,
  day date,
  start_min smallint,
  end_min smallint,
  title text,
  kind text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    item.owner,
    profile.display_name,
    item.day,
    item.start_min,
    item.end_min,
    case when share.level = 'details' then item.title else '' end,
    case when share.level = 'details' then item.kind else 'busy' end
  from public.shares share
  join public.schedule_items item on item.owner = share.owner and item.day between p_from and p_to
  join public.profiles profile on profile.id = share.owner
  where share.viewer = public.require_user()
    and share.level in ('busy', 'details')
    and p_to >= p_from
    and p_to - p_from <= 62
  order by item.day, item.start_min, profile.display_name
$$;

-- Portabilità (art. 20 GDPR): tutto quello che il server sa dell'utente, in un JSON
create function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at)
                from auth.users u where u.id = public.require_user()),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'consents', (select to_jsonb(c) from public.consents c where c.user_id = auth.uid()),
    'state', (select to_jsonb(s) from public.user_state s where s.user_id = auth.uid()),
    'connections', coalesce((select jsonb_agg(to_jsonb(c)) from public.my_connections() c), '[]'::jsonb),
    'open_invites', coalesce((select jsonb_agg(jsonb_build_object('created_at', i.created_at, 'expires_at', i.expires_at, 'used_at', i.used_at))
                              from public.invites i where i.owner = auth.uid()), '[]'::jsonb),
    'published_schedule', coalesce((select jsonb_agg(jsonb_build_object('day', s.day, 'start_min', s.start_min, 'end_min', s.end_min, 'title', s.title, 'kind', s.kind) order by s.day, s.start_min)
                                    from public.schedule_items s where s.owner = auth.uid()), '[]'::jsonb)
  )
$$;

-- Diritto alla cancellazione (art. 17 GDPR): l'utente sparisce con tutti i suoi dati, a cascata
create function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_user();
begin
  delete from auth.users where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Conservazione: ogni notte si cancella quello che non serve più (i tempi sono quelli dell'informativa)

create function public.purge_expired()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.invites where (used_at is not null or expires_at < now()) and created_at < now() - interval '1 day';
  delete from public.invite_failures where at < now() - interval '1 day';
  delete from public.schedule_items where day < current_date - 1;
$$;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('lowcor-purge-expired', '17 3 * * *', 'select public.purge_expired()');

-- ---------------------------------------------------------------------------------------------------
-- Permessi sulle funzioni: solo chi ha fatto login, e solo quelle pensate per l'app

revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.require_user(),
  public.save_state(jsonb, bigint),
  public.update_profile(text),
  public.accept_legal(text),
  public.create_invite(),
  public.accept_invite(text),
  public.my_connections(),
  public.set_share_level(uuid, text),
  public.remove_connection(uuid),
  public.publish_schedule(date, date, jsonb),
  public.shared_schedule(date, date),
  public.export_my_data(),
  public.delete_account()
to authenticated;
