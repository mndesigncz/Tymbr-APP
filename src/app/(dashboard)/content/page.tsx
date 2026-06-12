"use client";

import { Header } from "@/components/layout/Header";
import { StartWorkButton } from "@/components/layout/StartWorkButton";
import { ContentBoard } from "@/components/content/ContentBoard";

export default function ContentPage() {
  return (
    <div className="max-w-[1280px] mx-auto w-full">
      <Header
        title="Content plán"
        subtitle="Plánujte obsah na sociální sítě — od nápadu po publikaci"
        actions={<StartWorkButton />}
      />
      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        <ContentBoard />
      </div>
    </div>
  );
}
