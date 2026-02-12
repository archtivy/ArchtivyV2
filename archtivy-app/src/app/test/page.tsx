"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Test() {
  const [msg, setMsg] = useState("Checking Supabase...");

  useEffect(() => {
    async function run() {
      const { data, error } = await supabase.from("listings").select("id").limit(1);
      if (error) setMsg("ERROR ❌ " + error.message);
      else setMsg("OK ✅ Supabase connected. rows: " + (data?.length ?? 0));
    }
    run();
  }, []);

  return <div style={{ padding: 24, fontSize: 18 }}>{msg}</div>;
}