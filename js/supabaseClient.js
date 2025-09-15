import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://arcyvagzgpciljoxjago.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyY3l2YWd6Z3BjaWxqb3hqYWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MDQ3NjIsImV4cCI6MjA3MjI4MDc2Mn0.RL3fgUAaNm6fLq3BROOMOLio-Wjzc6--XGn8qax3mWw";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Auth helpers
export async function getSession(){
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth(redirectTo = 'login.html'){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session){
    window.location.href = redirectTo;
    throw new Error('Redirecting to login');
  }
  return session;
}

export async function redirectIfAuthed(redirectTo = 'admin.html'){
  const { data: { session } } = await supabase.auth.getSession();
  if(session){ window.location.href = redirectTo; }
}

export async function signOut(redirectTo = 'login.html'){
  await supabase.auth.signOut();
  window.location.href = redirectTo;
}

const BUCKET = "products";
const TABLE_PRODUCTS = "products";

// Upload product with image & prices
export async function uploadProduct({ file, name, description, original_price, new_price, category }) {
  const ext = file.name.split('.').pop();
  const path = `prod_${Date.now()}.${ext}`;

  // Upload to storage
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (upErr) throw upErr;

  // Get public URL
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const image_url = pub.publicUrl;

  // Insert into table
  const { data, error } = await supabase
    .from(TABLE_PRODUCTS)
    .insert([{ 
      name, 
      description, 
      original_price, 
      new_price, 
      category, 
      image_url 
    }])
    .select("*")
    .single();
    
  if (error) throw error;
  return data;
}

// Fetch all products
export async function fetchProducts() {
  let { data, error } = await supabase.from(TABLE_PRODUCTS).select("*").order("id", { ascending: false });
  if (error) throw error;
  return data;
}
