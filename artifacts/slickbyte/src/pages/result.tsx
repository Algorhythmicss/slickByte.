import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetMealInsight,
  MealAnalysis,
  MealInsight,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Result() {
  const [, navigate] = useLocation();
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [insight, setInsight] = useState<MealInsight | null>(null);
  const [activeInsightType, setActiveInsightType] = useState<string | null>(null);

  const insightMutation = useGetMealInsight();

  useEffect(() => {
    const stored = localStorage.getItem("slickbyte_analysis");
    const storedImage = localStorage.getItem("slickbyte_image");
    if (!stored) {
      navigate("/analyze");
      return;
    }
    try {
      setAnalysis(JSON.parse(stored));
    } catch {
      navigate("/analyze");
    }
    if (storedImage) setImagePreview(storedImage);
  }, []);

  const fetchInsight = (type: "protein_breakdown" | "make_healthier" | "fat_loss") => {
    if (!analysis) return;
    if (activeInsightType === type && insight) {
      setActiveInsightType(null);
      setInsight(null);
      return;
    }
    setActiveInsightType(type);
    setInsight(null);
    insightMutation.mutate(
      { data: { mealAnalysis: analysis, insightType: type } },
      {
        onSuccess: (data) => setInsight(data),
      }
    );
  };

  const getConfidenceBadgeClass = (c: string) => {
    if (c === "high") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (c === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 7) return "bg-primary";
    if (score >= 5) return "bg-amber-400";
    return "bg-red-400";
  };

  if (!analysis) return null;

  return (
    <div className="min-h-screen bg-background font-sans pb-20">
      <nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="font-epilogue tracking-tight text-2xl font-bold text-primary"
          >
            SlickByte
          </button>
          <Button
            onClick={() => navigate("/analyze")}
            className="rounded-full font-semibold font-epilogue"
            size="sm"
          >
            <span className="material-symbols-outlined text-[18px] mr-1">add_photo_alternate</span>
            New Analysis
          </Button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 pt-10 space-y-6">
        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-border/40"
        >
          {imagePreview && (
            <div className="relative aspect-[16/9] overflow-hidden">
              <img src={imagePreview} alt="Your meal" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
                <div>
                  <p className="text-white/70 text-xs tracking-widest uppercase font-bold mb-1">Decoded</p>
                  <h2 className="font-epilogue font-extrabold text-3xl text-white leading-tight drop-shadow-md">
                    {analysis.foodName}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="font-epilogue font-extrabold text-6xl text-white drop-shadow-lg leading-none">
                    {analysis.calories}
                  </span>
                  <span className="text-white/80 text-sm font-bold block">kcal</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-7 space-y-6">
            {/* Top row: confidence + insight tag */}
            <div className="flex flex-wrap gap-2 items-center">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getConfidenceBadgeClass(analysis.confidence)}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                AI match: {analysis.confidence}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                {analysis.quickInsight}
              </span>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Protein", value: analysis.macros.protein, max: 50, color: "bg-primary" },
                { label: "Carbs", value: analysis.macros.carbs, max: 100, color: "bg-amber-400" },
                { label: "Fats", value: analysis.macros.fats, max: 40, color: "bg-violet-400" },
                { label: "Fiber", value: analysis.macros.fiber, max: 30, color: "bg-emerald-500" },
              ].map(({ label, value, max, color }) => (
                <div key={label} className="bg-muted/50 rounded-2xl p-4">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{label}</span>
                    <span className="font-epilogue font-bold text-lg">{value}g</span>
                  </div>
                  <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full ${color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Health Score */}
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span>Health Score</span>
                <span className="text-primary">{analysis.healthScore} / 10</span>
              </div>
              <div className="flex gap-1 h-3">
                {[...Array(10)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className={`flex-1 rounded-sm ${i < analysis.healthScore ? getHealthScoreColor(analysis.healthScore) : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>

            {/* Ingredients */}
            {analysis.ingredients?.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2">Detected Ingredients</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.ingredients.map((ing, i) => (
                    <span key={i} className="px-3 py-1 bg-muted rounded-full text-xs font-semibold">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Deep Dive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-white rounded-[2.5rem] shadow-xl border border-border/40 p-7 space-y-4"
        >
          <div>
            <h3 className="font-epilogue font-bold text-xl">Deep Dive</h3>
            <p className="text-muted-foreground text-sm mt-1">Ask AI anything specific about this meal.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { type: "protein_breakdown" as const, label: "Protein Breakdown", icon: "fitness_center" },
              { type: "make_healthier" as const, label: "Make it Healthier", icon: "eco" },
              { type: "fat_loss" as const, label: "Good for Fat Loss?", icon: "monitor_weight" },
            ].map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => fetchInsight(type)}
                disabled={insightMutation.isPending && activeInsightType !== type}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all
                  ${activeInsightType === type
                    ? "bg-primary text-white border-primary shadow-md"
                    : "bg-muted/50 border-border text-foreground hover:border-primary hover:text-primary"
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {insightMutation.isPending && activeInsightType && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 py-4 text-primary"
              >
                <span className="material-symbols-outlined animate-spin">sync</span>
                <span className="font-semibold text-sm">Generating insight...</span>
              </motion.div>
            )}
            {insight && !insightMutation.isPending && (
              <motion.div
                key="insight"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-primary/5 rounded-2xl p-5 border border-primary/10 relative overflow-hidden"
              >
                <span className="absolute top-2 right-4 font-epilogue text-7xl font-extrabold text-primary/5 select-none leading-none">AI</span>
                <h4 className="font-epilogue font-bold text-lg mb-2">{insight.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground mb-4">{insight.content}</p>
                {insight.tips?.length > 0 && (
                  <ul className="space-y-2">
                    {insight.tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-sm items-start">
                        <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 shrink-0">check_circle</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Soft Retention */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-white rounded-[2.5rem] shadow-xl border border-border/40 p-7 space-y-3"
        >
          <h3 className="font-epilogue font-bold text-lg">What's next?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl hover:bg-muted transition-all text-left">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">today</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Track today's calories</p>
                <p className="text-xs text-muted-foreground">Add to your food diary</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl hover:bg-muted transition-all text-left">
              <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-purple-600 text-[20px]">bookmark</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Save this meal</p>
                <p className="text-xs text-muted-foreground">Quick log it next time</p>
              </div>
            </button>
          </div>
          <Button
            onClick={() => navigate("/analyze")}
            variant="outline"
            className="w-full rounded-full font-epilogue font-semibold mt-2"
          >
            <span className="material-symbols-outlined text-[18px] mr-2">add_photo_alternate</span>
            Analyze Another Meal
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
