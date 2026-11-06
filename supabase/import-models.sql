-- =====================================================================
--  SMED — Import 11 detailed models into Supabase public.smed_docs
--
--  User request (rephrased): Replace the legacy Model Library rows
--  (860, U740V2, MW880V16, 880, 740 …) currently seeded in
--  public.smed_docs (coll='models') with exactly these 11 codes:
--    MW860 V15, MW880 V15, MW880 V16, MW880G V14 GTX,
--    MW880G V15 GTX, MWTHIER V9, MWTHIG V9 GTX, MWTTRX V2,
--    UJMP, ULDELR V3, UMDELRS V3
--
--  How to run (pick ONE):
--    A) Supabase Dashboard → SQL Editor → paste this file → Run
--    B) node supabase/import-models.mjs   (uses SUPABASE_ACCESS_TOKEN
--       or SUPABASE_DB_URL, same as supabase/setup.mjs)
--
--  Idempotent: re-running upserts the 11 ids and deletes any other
--  coll='models' rows. Transactions + on-conflict = safe.
--  Production changeovers / SOPs referencing old model IDs are NOT
--  touched — only the models collection is replaced.
-- =====================================================================

-- 0) Pre-flight: count current models (you should see 860, U740V2, …)
-- select id, data ->> 'code' as code, data ->> 'status' as status
-- from public.smed_docs where coll = 'models' order by code;

begin;

-- 1) DELETE legacy models (everything not in the 11-code allow-list)
--    The keep-list matches code OR name (case-insensitive) so the
--    spaced variants "MW880 V16" / "MW880G V14 GTX" … are kept.
delete from public.smed_docs
where coll = 'models'
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

-- 2) INSERT / UPDATE the 11 models as live (non-demo) rows.
--    IDs are deterministic (M-IMP-<index>) so re-runs don't duplicate.
--    Schema mirrors ModelLibrary.add(): code, name, customer, article,
--    status, createdAt, createdBy, revisions{R+id:{rev A, Draft,…}}.
--    createdBy 'U-ADMIN' matches the seed admin user in SMED_SEED.
insert into public.smed_docs (coll, id, data, updated_at) values
  ('models','M-IMP-01', '{"id":"M-IMP-01","code":"MW860 V15","name":"MW860 V15","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP01":{"key":"RIMP01","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
  ('models','M-IMP-02', '{"id":"M-IMP-02","code":"MW880 V15","name":"MW880 V15","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP02":{"key":"RIMP02","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
  ('models','M-IMP-03', '{"id":"M-IMP-03","code":"MW880 V16","name":"MW880 V16","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP03":{"key":"RIMP03","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
  ('models','M-IMP-04', '{"id":"M-IMP-04","code":"MW880G V14 GTX","name":"MW880G V14 GTX","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP04":{"key":"RIMP04","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
  ('models','M-IMP-05', '{"id":"M-IMP-05","code":"MW880G V15 GTX","name":"MW880G V15 GTX","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP05":{"key":"RIMP05","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
  ('models','M-IMP-06', '{"id":"M-IMP-06","code":"MWTHIER V9","name":"MWTHIER V9","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP06":{"key":"RIMP06","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
  ('models','M-IMP-07', '{"id":"M-IMP-07","code":"MWTHIG V9 GTX","name":"MWTHIG V9 GTX","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP07":{"key":"RIMP07","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
  ('models','M-IMP-08', '{"id":"M-IMP-08","code":"MWTTRX V2","name":"MWTTRX V2","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP08":{"key":"RIMP08","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
  ('models','M-IMP-09', '{"id":"M-IMP-09","code":"UJMP","name":"UJMP","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP09":{"key":"RIMP09","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
  ('models','M-IMP-10', '{"id":"M-IMP-10","code":"ULDELR V3","name":"ULDELR V3","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP10":{"key":"RIMP10","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now()),
  ('models','M-IMP-11', '{"id":"M-IMP-11","code":"UMDELRS V3","name":"UMDELRS V3","customer":"","article":"","status":"Active","createdAt":0,"createdBy":"U-ADMIN","revisions":{"RIMP11":{"key":"RIMP11","rev":"A","status":"Draft","ops":[],"qcPoints":[],"layout":{},"createdBy":"U-ADMIN","createdAt":0}}}'::jsonb, now())
on conflict on constraint smed_docs_pkey do update
  set data = excluded.data, updated_at = now();

commit;

-- 3) Post-flight: Model Library should now list exactly 11 rows,
--    all MW* / U* with spaces, status Active.
-- select id, data ->> 'code' as code, data ->> 'status' as status
-- from public.smed_docs where coll = 'models' order by code;
