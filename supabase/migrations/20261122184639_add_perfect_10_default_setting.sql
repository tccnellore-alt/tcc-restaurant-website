insert into public.tcc_store_settings(setting_key,setting_value)
values ('perfect_10_enabled','false'::jsonb)
on conflict (setting_key) do nothing;
