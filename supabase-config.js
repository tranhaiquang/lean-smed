/* =====================================================================
 *  SMED ⇄ Supabase — cấu hình kết nối
 *
 *  Dán 2 giá trị lấy từ Supabase Dashboard → Project Settings → API:
 *    Project URL   →  url
 *    anon public   →  anonKey      (KHÔNG dùng service_role key ở đây)
 *
 *  anonKey nằm trong file public là bình thường (Supabase thiết kế như vậy);
 *  bảo mật thật nằm ở RLS — xem supabase/schema.sql mục 6 và 7.
 *
 *  Tắt Supabase, dùng localStorage:  mở app với  ?db=local
 * ===================================================================== */
window.SMED_SUPABASE = {
  url: 'https://neotjnwkdjtxiafjbvhl.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lb3RqbndrZGp0eGlhZmpidmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NzQwNDgsImV4cCI6MjEwOTE1MDA0OH0.563XblecLrZV9mnsr0erBGgI4Gz-6L6nvOi3yL5Yf2M',
};
