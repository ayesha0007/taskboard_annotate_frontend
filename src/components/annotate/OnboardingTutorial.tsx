"use client";

import {
  Check,
  HelpCircle,
  ImagePlus,
  MousePointerClick,
  Sparkles,
  SquareDashedMousePointer,
} from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";

const STORAGE_KEY = "tb_annotate_onboarded";

interface Step {
  icon: typeof Sparkles;
  gradient: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: ImagePlus,
    gradient: "from-accent to-cyan-400",
    title: "Upload your images",
    body: "Grab one image or a whole batch at once — they'll pop into your gallery as they land.",
  },
  {
    icon: SquareDashedMousePointer,
    gradient: "from-progress to-pink-400",
    title: "Pick a tool",
    body: "Box for quick rectangles, Polygon for click-by-click precision, or Pen to freehand-trace a shape.",
  },
  {
    icon: MousePointerClick,
    gradient: "from-done to-accent",
    title: "Draw on the image",
    body: "Sketch your shape right on the photo. It shows up as a dashed draft until you're happy with it.",
  },
  {
    icon: Check,
    gradient: "from-accent to-progress",
    title: "Confirm to save",
    body: "Hit \"Confirm annotation\" to lock it in — pick a class first so your shapes stay organized.",
  },
];

export function OnboardingTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) setIsOpen(true);
  }, []);

  function close() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setIsOpen(false);
  }

  function reopen() {
    setStep(0);
    setIsOpen(true);
  }

  function next() {
    if (step === STEPS.length - 1) {
      close();
      return;
    }
    setStep((current) => current + 1);
  }

  const current = STEPS[step]!;
  const Icon = current.icon;

  return (
    <>
      <button
        onClick={reopen}
        title="How annotation works"
        aria-label="Show annotation tutorial"
        className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full bg-accent text-white flex items-center justify-center shadow-glow hover:scale-105 transition-transform animate-scale-in"
      >
        <HelpCircle size={20} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-panel border border-border rounded-card overflow-hidden animate-scale-in">
            <div className={clsx("bg-gradient-to-br p-8 flex items-center justify-center", current.gradient)}>
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center animate-bounce">
                <Icon size={36} className="text-white" />
              </div>
            </div>

            <div className="p-6 flex flex-col gap-3">
              <h2 className="font-display font-bold text-lg text-ink">{current.title}</h2>
              <p className="text-sm text-muted leading-relaxed">{current.body}</p>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, index) => (
                    <span
                      key={index}
                      className={clsx(
                        "h-1.5 rounded-full transition-all",
                        index === step ? "w-5 bg-accent" : "w-1.5 bg-border"
                      )}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={close} className="text-xs text-muted hover:text-ink transition-colors">
                    Skip
                  </button>
                  <button
                    onClick={next}
                    className="text-xs px-4 py-2 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    {step === STEPS.length - 1 ? "Let's go!" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
