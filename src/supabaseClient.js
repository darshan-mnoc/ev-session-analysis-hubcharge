import { createClient } from "@supabase/supabase-js";

// HubCharge Supabase project
const SUPABASE_URL = "https://pevtuszzrnllicxxoggr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EKgQW1NvXM93ERSe2RUkcw_AJ3XzBc7";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
