"use client";

import { LayoutTemplate } from "lucide-react";

export default function AdminMailerPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
      <div className="bg-slate-800 p-4 rounded-full mb-4">
        <LayoutTemplate size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-300">Email Marketing</h2>
      <p className="text-sm italic">Ce module est en cours de développement...</p>
    </div>
  );
}
