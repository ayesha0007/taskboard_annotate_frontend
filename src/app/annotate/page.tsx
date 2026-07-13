"use client";

import { useEffect } from "react";

import { AnnotationCanvas } from "@/components/annotate/AnnotationCanvas";
import { AnnotationStats } from "@/components/annotate/AnnotationStats";
import { AnnotationToolbar } from "@/components/annotate/AnnotationToolbar";
import { ImageCarousel } from "@/components/annotate/ImageCarousel";
import { OnboardingTutorial } from "@/components/annotate/OnboardingTutorial";
import { PolygonList } from "@/components/annotate/PolygonList";
import { AuthGuard } from "@/components/ui/AuthGuard";
import { Navbar } from "@/components/ui/Navbar";
import { useAnnotationStore } from "@/store/annotationStore";

export default function AnnotatePage() {
  const fetchImages = useAnnotationStore((state) => state.fetchImages);
  const fetchClasses = useAnnotationStore((state) => state.fetchClasses);
  const error = useAnnotationStore((state) => state.error);

  useEffect(() => {
    fetchImages();
    fetchClasses();
  }, [fetchImages, fetchClasses]);

  return (
    <AuthGuard>
      <Navbar />
      <OnboardingTutorial />
      <main className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between animate-fade-in">
          <h1 className="font-display font-bold text-xl text-ink">Image Annotation</h1>
        </div>

        <AnnotationStats />

        {error && <p className="text-sm text-danger animate-fade-in">{error}</p>}

        <ImageCarousel />
        <AnnotationToolbar />

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <AnnotationCanvas />
          <PolygonList />
        </div>
      </main>
    </AuthGuard>
  );
}
