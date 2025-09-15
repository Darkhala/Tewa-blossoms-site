import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ Replace with your Supabase project details
const supabaseUrl = "https://arcyvagzgpciljoxjago.supabase.co";  
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyY3l2YWd6Z3BjaWxqb3hqYWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MDQ3NjIsImV4cCI6MjA3MjI4MDc2Mn0.RL3fgUAaNm6fLq3BROOMOLio-Wjzc6--XGn8qax3mWw";  
const supabase = createClient(supabaseUrl, supabaseKey);

const uploadForm = document.getElementById("upload-form");

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Collect form values
  const name = document.getElementById("name").value.trim();
  const originalPrice = parseFloat(document.getElementById("original_price").value);
  const newPrice = parseFloat(document.getElementById("new_price").value);
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value;
  const productType = document.getElementById("product_type").value;
  const imageFile = document.getElementById("image").files[0];

  if (!imageFile) {
    alert("❌ Please select an image!");
    return;
  }

  // ✅ Auto-calculate % off
  const percentOff = Math.round(((originalPrice - newPrice) / originalPrice) * 100);

  try {
    console.log("⏳ Uploading image...");

    // ✅ Upload image directly to root of bucket (remove `uploads/`)
    const fileName = `${Date.now()}-${imageFile.name}`;
    const { error: imageError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (imageError) {
      console.error("❌ Image upload error:", imageError);
      alert("❌ Image upload failed: " + imageError.message);
      return;
    }

    console.log("✅ Image uploaded:", fileName);

    // ✅ Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from("product-images")
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;
    console.log("🌐 Public URL:", imageUrl);

    // ✅ Insert into database
    console.log("⏳ Inserting product into DB...");
    const { error: dbError } = await supabase.from("products").insert([
      {
        name,
        description,
        category,
        type: productType,
        original_price: originalPrice,
        new_price: newPrice,
        percent_off: percentOff,
        image_url: imageUrl,
        created_at: new Date(),
      },
    ]);

    if (dbError) {
      console.error("❌ DB insert error:", dbError);
      alert("❌ Database insert failed: " + dbError.message);
      return;
    }

    alert("✅ Product uploaded successfully!");
    uploadForm.reset();

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    alert("❌ Upload failed: " + err.message);
  }
});
