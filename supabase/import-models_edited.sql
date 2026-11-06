-- =====================================================================
--  SMED — Bulk-import 11 detailed models into Supabase public.smed_docs
--  EDITED copy (original import-models.sql preserved at .sql)
--
--  Rephrased request: Use the pasted 860 JSON as the canonical detailed
--  template. MW860 V15 inherits 860's ops/QC/layout; the other 10 models
--  use the same full schema with empty routing/QC for later data entry.
--
--  Codes (exactly 11):
--    MW860 V15, MW880 V15, MW880 V16, MW880G V14 GTX,
--    MW880G V15 GTX, MWTHIER V9, MWTHIG V9 GTX, MWTTRX V2,
--    UJMP, ULDELR V3, UMDELRS V3
--
--  Strategy (idempotent, safe to re-run):
--    1. If M-7IJ04X4UY (current 860) exists, rename it in place to
--       MW860 V15 so changeovers referencing it keep working, and keep
--       its ops / QC points / layout / revision key R7IJ04H06M.
--    2. DELETE any other coll='models' row whose code/name is not in
--       the 11-code allow-list (removes 860 duplicates, U740V2,
--       MW880V16, 880, 740, and any temp rows).
--    3. If the preserved row already became MW860 V15, INSERT the
--       remaining 10 models (M-IMP-02..11). Otherwise (fresh DB or
--       860 already deleted) INSERT all 11, with M-IMP-01 containing
--       the full detail from the pasted template JSON.
--
--  How to run (pick ONE):
--    A) Supabase Dashboard → SQL Editor → paste this file → Run
--    B) node supabase/import-models_edited.mjs
--       (same SUPABASE_ACCESS_TOKEN / SUPABASE_DB_URL as setup.mjs)
--
--  Note: only coll='models' is touched. changeovers / sops / kaizen
--  / auditlog rows are never modified by this script.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Rename legacy 860 -> MW860 V15 in place (preserves history)
-- ---------------------------------------------------------------------
update public.smed_docs
set data = data || jsonb_build_object(
        'code', 'MW860 V15',
        'name', 'MW860 V15',
        'customer', 'NB',
        'status', 'Active'
      ),
    updated_at = now()
where coll = 'models'
  and id = 'M-7IJ04X4UY';

-- ---------------------------------------------------------------------
-- 2) DELETE legacy models (everything not in the 11-code allow-list)
--    The preserved M-7IJ04X4UY is now MW860 V15 so it survives.
--    Keep-list matches code OR name (case-insensitive).
-- ---------------------------------------------------------------------
delete from public.smed_docs
where coll = 'models'
  and id <> 'M-7IJ04X4UY'
  and upper(coalesce(data ->> 'code', ''))
    not in (
      'MW860 V15','MW880 V15','MW880 V16','MW880G V14 GTX',
      'MW880G V15 GTX','MWTHIER V9','MWTHIG V9 GTX','MWTTRX V2',
      'UJMP','ULDELR V3','UMDELRS V3'
    )
  and upper(coalesce(data ->> 'name', ''))
    not in (
      'MW860 V15','MW880 V15','MW880 V16','MW880G V14 GTX',
      'MW880G V15 GTX','MWTHIER V9','MWTHIG V9 GTX','MWTTRX V2',
      'UJMP','ULDELR V3','UMDELRS V3'
    );

-- ---------------------------------------------------------------------
-- 3) Insert the 11 models (branch: preserved vs fresh)
--    DO block so the MW860 V15 source is either the renamed 860 row
--    or the full template below — never both (no duplicate codes).
-- ---------------------------------------------------------------------
do $$
declare
  has_preserved boolean;
begin
  select exists (
    select 1 from public.smed_docs
    where coll = 'models' and id = 'M-7IJ04X4UY'
      and data ->> 'code' = 'MW860 V15'
  ) into has_preserved;

  if has_preserved then
    -- MW860 V15 already preserved (kept ops/QC/layout + revision).
    -- Insert only the other 10, same full schema, empty routing.
    insert into public.smed_docs (coll, id, data, updated_at) values
      ('models','M-IMP-02', '{"id":"M-IMP-02","code":"MW880 V15","name":"MW880 V15","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP02":{"key":"RIMP02","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-03', '{"id":"M-IMP-03","code":"MW880 V16","name":"MW880 V16","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP03":{"key":"RIMP03","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-04', '{"id":"M-IMP-04","code":"MW880G V14 GTX","name":"MW880G V14 GTX","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP04":{"key":"RIMP04","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-05', '{"id":"M-IMP-05","code":"MW880G V15 GTX","name":"MW880G V15 GTX","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP05":{"key":"RIMP05","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-06', '{"id":"M-IMP-06","code":"MWTHIER V9","name":"MWTHIER V9","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP06":{"key":"RIMP06","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-07', '{"id":"M-IMP-07","code":"MWTHIG V9 GTX","name":"MWTHIG V9 GTX","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP07":{"key":"RIMP07","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-08', '{"id":"M-IMP-08","code":"MWTTRX V2","name":"MWTTRX V2","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP08":{"key":"RIMP08","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-09', '{"id":"M-IMP-09","code":"UJMP","name":"UJMP","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP09":{"key":"RIMP09","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-10', '{"id":"M-IMP-10","code":"ULDELR V3","name":"ULDELR V3","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP10":{"key":"RIMP10","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-11', '{"id":"M-IMP-11","code":"UMDELRS V3","name":"UMDELRS V3","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP11":{"key":"RIMP11","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now())
    on conflict on constraint smed_docs_pkey do update
      set data = excluded.data, updated_at = now();

  else
    -- Fresh / 860 already removed: insert all 11.
    -- M-IMP-01 (MW860 V15) is the verbatim detail from the 860 template.
    insert into public.smed_docs (coll, id, data, updated_at) values
      ('models','M-IMP-01', '{"id":"M-IMP-01","code":"MW860 V15","name":"MW860 V15","status":"Active","article":"yy","customer":"NB","createdAt":1793258003380,"createdBy":"U-ADMIN","revisions":{"R7IJ04H06M":{"key":"R7IJ04H06M","ops":[{"op":"fds","seq":10,"spi":"fds","skill":"kj","needle":"fds","opCode":"fds","thread":"fds","tooling":"hgf","stitchType":"gfdg","machineType":"fds"},{"op":"fd","seq":20,"spi":"fds","skill":"kj","needle":"fds","opCode":"fsd","thread":"fd","tooling":"ghgf","stitchType":"gfd","machineType":"fds"},{"op":"sfds","seq":30,"spi":"fs","skill":"hgfhg","needle":"fds","opCode":"fds","thread":"sfds","tooling":"jh","stitchType":"gdf","machineType":"fds"}],"rev":"A","notes":"","layout":{"skill":"dsfsdfsd","version":"jg","workers":343},"status":"Draft","qcPoints":[{"id":"QC7J7LYFSI4","name":"sfhgfs","spec":"ghs","method":"jhg"},{"id":"QC7J86LI1JX","name":"hgs","spec":"hgsf","method":"jhf"}],"createdAt":1793258003380,"createdBy":"U-ADMIN","updatedAt":1793258092452,"updatedBy":"U-ADMIN"}}}'::jsonb, now()),
      ('models','M-IMP-02', '{"id":"M-IMP-02","code":"MW880 V15","name":"MW880 V15","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP02":{"key":"RIMP02","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-03', '{"id":"M-IMP-03","code":"MW880 V16","name":"MW880 V16","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP03":{"key":"RIMP03","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-04', '{"id":"M-IMP-04","code":"MW880G V14 GTX","name":"MW880G V14 GTX","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP04":{"key":"RIMP04","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-05', '{"id":"M-IMP-05","code":"MW880G V15 GTX","name":"MW880G V15 GTX","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP05":{"key":"RIMP05","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-06', '{"id":"M-IMP-06","code":"MWTHIER V9","name":"MWTHIER V9","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP06":{"key":"RIMP06","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-07', '{"id":"M-IMP-07","code":"MWTHIG V9 GTX","name":"MWTHIG V9 GTX","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP07":{"key":"RIMP07","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-08', '{"id":"M-IMP-08","code":"MWTTRX V2","name":"MWTTRX V2","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP08":{"key":"RIMP08","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-09', '{"id":"M-IMP-09","code":"UJMP","name":"UJMP","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP09":{"key":"RIMP09","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-10', '{"id":"M-IMP-10","code":"ULDELR V3","name":"ULDELR V3","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP10":{"key":"RIMP10","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
      ('models','M-IMP-11', '{"id":"M-IMP-11","code":"UMDELRS V3","name":"UMDELRS V3","customer":"NB","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP11":{"key":"RIMP11","rev":"A","status":"Draft","notes":"","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now())
    on conflict on constraint smed_docs_pkey do update
      set data = excluded.data, updated_at = now();
  end if;
end
$$;

commit;

-- ---------------------------------------------------------------------
-- Post-flight (run separately to verify): expect exactly 11 rows,
-- MW860 V15 first, no 860 / U740V2 / 880 / 740 remaining.
-- ---------------------------------------------------------------------
-- select id, data ->> 'code' as code, data ->> 'name' as name,
--        data ->> 'status' as status
-- from public.smed_docs
-- where coll = 'models'
-- order by data ->> 'code';
