-- Run in Supabase > SQL Editor. Replace the username with the account that should be an admin.
update public.profiles set is_admin = true where username = 'REPLACE_WITH_USERNAME';
