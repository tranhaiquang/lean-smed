-- =====================================================================
--  SMED  ⇄  Supabase
--  Schema cho adapter dạng "document store" (jsonb).
--  Chạy toàn bộ file này: Supabase Dashboard → SQL Editor → Run.
--  An toàn khi chạy lại nhiều lần (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bảng duy nhất: mỗi dòng = 1 document
--    coll = 'smed' (config) | 'changeovers' | 'models' | 'sops' | 'kaizen' | 'auditlog'
--    id   = ID của document ('config' với coll='smed', '202611' với auditlog theo tháng)
-- ---------------------------------------------------------------------
create table if not exists public.smed_docs (
  coll       text        not null,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint smed_docs_pkey primary key (coll, id)
);

comment on table  public.smed_docs      is 'SMED: mỗi dòng là 1 document jsonb (changeover, model, sop, kaizen, auditlog tháng, config)';
comment on column public.smed_docs.coll is 'Tên collection; config dùng coll=''smed'' và id=''config''';
comment on column public.smed_docs.data is 'Document đầy đủ (đã lồng nhau: checklist, activities, trials, revisions...)';

create index if not exists smed_docs_coll_idx on public.smed_docs (coll);

-- ---------------------------------------------------------------------
-- 2. Hợp nhất jsonb đệ quy.
--    Ứng dụng gọi Store.update(patch) và mong đợi "merge sâu":
--      ví dụ auditlog.entries[<id>] = {...} phải GIỮ các entry cũ.
--    Object → merge từng khóa; mảng / scalar / null → thay thế.
-- ---------------------------------------------------------------------
create or replace function public.smed_jsonb_merge(base jsonb, patch jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  k   text;
  v   jsonb;
  out jsonb;
begin
  if base  is null then return patch; end if;
  if patch is null then return base;  end if;

  -- Không phải cả hai đều là object → ghi đè
  if jsonb_typeof(base) <> 'object' or jsonb_typeof(patch) <> 'object' then
    return patch;
  end if;

  out := base;
  for k, v in select key, value from jsonb_each(patch) loop
    if jsonb_typeof(out -> k) = 'object' and jsonb_typeof(v) = 'object' then
      out := jsonb_set(out, array[k], public.smed_jsonb_merge(out -> k, v), true);
    else
      out := jsonb_set(out, array[k], v, true);
    end if;
  end loop;
  return out;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. RPC cho Store.update(): upsert + merge sâu trong 1 câu lệnh
--    (atomic, không có race giữa 2 người cùng sửa 1 changeover)
-- ---------------------------------------------------------------------
create or replace function public.smed_patch(p_coll text, p_id text, p_patch jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.smed_docs (coll, id, data, updated_at)
  values (p_coll, p_id, coalesce(p_patch, '{}'::jsonb), now())
  on conflict on constraint smed_docs_pkey do update
    set data       = public.smed_jsonb_merge(public.smed_docs.data, excluded.data),
        updated_at = now();
$$;

-- ---------------------------------------------------------------------
-- 4. Quyền
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.smed_docs to anon, authenticated;
grant execute on function public.smed_jsonb_merge(jsonb, jsonb) to anon, authenticated;
grant execute on function public.smed_patch(text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Realtime (bắt buộc để nhiều máy thấy thay đổi của nhau)
-- ---------------------------------------------------------------------
do $$
begin
  -- Tạo publication nếu project chưa có (Supabase tạo sẵn, nhưng phòng trường hợp bị xoá).
  -- Dùng EXECUTE để chắc chắn hợp lệ với DDL trong PL/pgSQL.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'create publication supabase_realtime';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname    = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'smed_docs'
  ) then
    execute 'alter publication supabase_realtime add table public.smed_docs';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. RLS
--
--    ⚠️  CHẾ ĐỘ THÍ ĐIỂM (đang bật bên dưới): mọi người có URL + anon key
--        đều ĐỌC VÀ GHI được toàn bộ dữ liệu. Phù hợp cho pilot nội bộ
--        với URL không công khai, KHÔNG phù hợp dữ liệu sản xuất thật.
--
--    Khi chuyển sang Supabase Auth (phương án B), đổi sang khối "KHOÁ"
--    ở cuối file: chỉ user đã đăng nhập mới đọc/ghi.
-- ---------------------------------------------------------------------
alter table public.smed_docs enable row level security;

drop policy if exists smed_docs_read   on public.smed_docs;
drop policy if exists smed_docs_insert on public.smed_docs;
drop policy if exists smed_docs_update on public.smed_docs;
drop policy if exists smed_docs_delete on public.smed_docs;

create policy smed_docs_read   on public.smed_docs for select to anon, authenticated using (true);
create policy smed_docs_insert on public.smed_docs for insert to anon, authenticated with check (true);
create policy smed_docs_update on public.smed_docs for update to anon, authenticated using (true) with check (true);
create policy smed_docs_delete on public.smed_docs for delete to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- 7. (Tuỳ chọn) KHOÁ — chỉ dùng sau khi đã làm Supabase Auth
-- ---------------------------------------------------------------------
-- drop policy if exists smed_docs_read   on public.smed_docs;
-- drop policy if exists smed_docs_insert on public.smed_docs;
-- drop policy if exists smed_docs_update on public.smed_docs;
-- drop policy if exists smed_docs_delete on public.smed_docs;
--
-- create policy smed_docs_read   on public.smed_docs for select to authenticated using (true);
-- create policy smed_docs_insert on public.smed_docs for insert to authenticated with check (true);
-- create policy smed_docs_update on public.smed_docs for update to authenticated using (true) with check (true);
-- create policy smed_docs_delete on public.smed_docs for delete to authenticated using (true);
--
-- -- Sau đó bỏ quyền của anon:
-- revoke all on public.smed_docs from anon;
-- revoke execute on function public.smed_patch(text, text, jsonb) from anon;

-- ---------------------------------------------------------------------
-- 8. Tự kiểm tra cấu hình (dùng cho supabase/verify.mjs)
--    Trả về: bảng tồn tại? realtime bật? RLS bật? mấy policy?
-- ---------------------------------------------------------------------
create or replace function public.smed_selfcheck()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'table',    to_regclass('public.smed_docs') is not null,
    'rows',     (select count(*) from public.smed_docs),
    'realtime', exists (
                  select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime'
                    and schemaname = 'public'
                    and tablename = 'smed_docs'
                ),
    'rls',      (select relrowsecurity from pg_class where oid = to_regclass('public.smed_docs')),
    'policies', (select count(*) from pg_policies
                 where schemaname = 'public' and tablename = 'smed_docs'),
    'patch',    to_regprocedure('public.smed_patch(text,text,jsonb)') is not null
  );
$$;

grant execute on function public.smed_selfcheck() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 9. Ví dụ query (thử trong SQL Editor)
-- ---------------------------------------------------------------------
-- -- Dashboard: đổi trạng thái + đếm + tính tổng internal time
-- select
--   data ->> 'status' as status,
--   data ->> 'plannedStart' as planned_start,
--   data ->> 'targetMin' as target_min,
--   data ->> 'modelA' as model_a,
--   data ->> 'modelB' as model_b,
--   data ->> 'owner' as owner,
--   data ->> 'lineId' as line_id,
--   data ->> 'orderRef' as order_ref,
--   data ->> 'qty' as qty
-- from public.smed_docs
-- where coll = 'changeovers'
--   and (data ->> 'lineId') = 'L01'
-- order by (data ->> 'plannedStart') desc;
--
-- -- Prep: checklist của changeover
-- select
--   data ->> 'status' as co_status,
--   data ->> 'plannedStart' as planned_start,
--   data ->> 'modelA' as model_a,
--   data ->> 'modelB' as model_b,
--   d.value ->> 'status' as task_status,
--   d.value ->> 'ownerRole' as owner_role,
--   d.value ->> 'critical' as critical
-- from public.smed_docs,
--      jsonb_array_elements(data -> 'checklist') as d(value)
-- where coll = 'changeovers'
--   and (data ->> 'lineId') = 'L01'
--   and (data ->> 'status') in ('Planned','Preparing','Ready');
--
-- -- Quality: trials + defects
-- select
--   data ->> 'status' as co_status,
--   d1.value ->> 'seq' as trial_seq,
--   d1.value ->> 'decision' as trial_decision,
--   d2.value ->> 'code' as defect_code,
--   d2.value ->> 'severity' as defect_severity,
--   d2.value ->> 'qty' as defect_qty
-- from public.smed_docs,
--      jsonb_array_elements(data -> 'trials') as d1(value),
--      jsonb_array_elements((d1.value -> 'defects') ->*) as d2(value)
-- where coll = 'changeovers'
--   and (data ->> 'lineId') = 'L01'
--   and (data ->> 'status') in ('AwaitingQuality','Rework');
--
-- select public.smed_selfcheck();
-- select coll, count(*) from public.smed_docs group by coll order by coll;
