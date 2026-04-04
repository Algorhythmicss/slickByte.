import React from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import analyzedImg from "@assets/analyzed_1775110441952.png";
import { Button } from "@/components/ui/button";

const BERRY_BOWL_URL =
  "https://images.unsplash.com/photo-1511690078903-71dc5a49f5e3?w=700&auto=format&q=80";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full font-sans bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full px-8 py-4">
          <div className="flex items-center gap-12">
            <span className="font-epilogue tracking-tight text-2xl font-bold text-primary">SlickByte</span>
            <div className="hidden md:flex items-center gap-8 font-epilogue tracking-tight">
              <a className="text-primary font-semibold border-b-2 border-primary pb-1" href="#">Explore</a>
              <a className="text-muted-foreground hover:text-primary transition-colors" href="#">Diary</a>
              <a className="text-muted-foreground hover:text-primary transition-colors" href="#">Analytics</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/analyze")}
              className="hidden sm:flex rounded-full font-epilogue font-semibold tracking-tight"
            >
              Upload Meal
            </Button>
            <button className="p-2 hover:bg-muted rounded-full transition-all">
              <span className="material-symbols-outlined text-muted-foreground">account_circle</span>
            </button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden whispr-flow-bg pb-20 pt-10">
          <div className="max-w-7xl mx-auto px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Content */}
            <div className="lg:col-span-6 space-y-8 z-10 relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-widest"
              >
                <span className="w-2 h-2 rounded-full bg-primary" />
                Nutrition Redefined
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-epilogue text-6xl md:text-8xl font-extrabold text-foreground leading-[0.95] -tracking-[0.04em]"
              >
                Your Plate, <br />
                <span className="text-primary italic">Decoded.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl md:text-2xl text-muted-foreground max-w-xl leading-relaxed"
              >
                Snap a photo, and within seconds know exactly what you're eating — calories, macros, health score, and more.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="pt-4 flex flex-col gap-4 max-w-md"
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-10 py-8 rounded-full font-epilogue font-bold text-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex gap-3"
                  onClick={() => navigate("/analyze")}
                >
                  <span className="material-symbols-outlined text-2xl">photo_camera</span>
                  Analyze My Meal
                </Button>
                <p className="text-sm text-muted-foreground pl-2">
                  Free · No sign-up required · Results in seconds
                </p>
              </motion.div>
            </div>

            {/* Right Visuals — Berry Bowl */}
            <div className="lg:col-span-6 relative flex justify-center lg:justify-end min-h-[500px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="relative w-full max-w-lg"
              >
                <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl -rotate-2 border-8 border-white">
                  <img
                    src={BERRY_BOWL_URL}
                    alt="Healthy berry bowl"
                    className="w-full h-auto object-cover aspect-[4/5]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 glass-card p-6 rounded-2xl">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-primary text-xs tracking-widest uppercase font-bold">Decoded Analysis</p>
                        <h3 className="font-epilogue font-bold text-2xl mt-1">Avocado Tacos</h3>
                      </div>
                      <div className="text-right">
                        <span className="font-epilogue font-extrabold text-4xl">420</span>
                        <span className="text-xs uppercase font-bold block opacity-70">kcal</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-12 -right-8 w-48 h-48 bg-secondary/50 rounded-full blur-3xl -z-10" />
                <div className="absolute -bottom-12 -left-8 w-64 h-64 bg-accent/40 rounded-full blur-3xl -z-10" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Bento */}
        <section className="py-32 bg-surface">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
              <h2 className="font-epilogue text-4xl md:text-5xl font-bold tracking-tight">One snap, endless wisdom.</h2>
              <p className="text-lg text-muted-foreground font-sans">Experience the SlickByte Flow — a seamless transition from sight to insight.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:h-[600px]">
              <div className="md:col-span-8 bg-muted rounded-[2.5rem] p-12 flex flex-col justify-between group hover:bg-muted/80 transition-all border border-border/50">
                <div className="max-w-md">
                  <span className="material-symbols-outlined text-5xl text-primary mb-6">photo_camera</span>
                  <h3 className="font-epilogue text-3xl font-bold mb-4">Snap with Intent</h3>
                  <p className="text-muted-foreground leading-relaxed">Our computer vision doesn't just see pixels — it understands ingredients. Simply point your camera and let SlickByte recognize every element of your culinary masterpiece.</p>
                </div>
              </div>

              <div className="md:col-span-4 bg-secondary/30 rounded-[2.5rem] p-10 flex flex-col justify-center border border-secondary/20">
                <span className="material-symbols-outlined text-4xl text-purple-600 mb-6">psychology</span>
                <h3 className="font-epilogue text-2xl font-bold mb-3">Process Instantly</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Real-time nutritional mapping that converts images into data. No manual entry, no stress.</p>
              </div>

              <div className="md:col-span-4 bg-accent/30 rounded-[2.5rem] p-10 flex flex-col justify-center border border-accent/20">
                <span className="material-symbols-outlined text-4xl text-orange-600 mb-6">insights</span>
                <h3 className="font-epilogue text-2xl font-bold mb-3">Deep Insights</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Go beyond calories. Understand macros, health score, and get AI-powered tips for your goals.</p>
              </div>

              <div className="md:col-span-8 bg-card rounded-[2.5rem] p-10 flex items-center gap-12 overflow-hidden border border-border shadow-sm">
                <div className="flex-1">
                  <span className="material-symbols-outlined text-4xl text-primary mb-6">timeline</span>
                  <h3 className="font-epilogue text-2xl font-bold mb-3">Effortless Tracking</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Your journey visualized in a beautiful dashboard that celebrates progress over perfection.</p>
                </div>
                <div className="hidden lg:block w-1/2">
                  <img src={analyzedImg} alt="Analysis Example" className="rounded-2xl shadow-xl rotate-3 scale-110 translate-x-10 translate-y-10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24 bg-card overflow-hidden">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16 space-y-3">
              <h2 className="font-epilogue text-4xl md:text-5xl font-bold tracking-tight">Three steps to clarity.</h2>
              <p className="text-lg text-muted-foreground">No app download needed. Works right in your browser.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: "01", icon: "add_photo_alternate", title: "Upload your photo", desc: "Take a picture of any meal or upload from your gallery. The clearer the photo, the better the analysis." },
                { step: "02", icon: "auto_awesome", title: "AI decodes it", desc: "Gemini 2.5 Flash identifies ingredients, estimates portions, and calculates nutritional values in seconds." },
                { step: "03", icon: "insights", title: "Get smart insights", desc: "See your macros, health score, and ask follow-up questions like 'Good for fat loss?' or 'Make it healthier'." },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} className="relative p-8 bg-muted/40 rounded-[2rem] border border-border/50 space-y-4">
                  <span className="font-epilogue text-7xl font-extrabold text-primary/10 absolute top-4 right-6 leading-none">{step}</span>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-primary">{icon}</span>
                  </div>
                  <h3 className="font-epilogue text-xl font-bold">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Philosophy */}
        <section className="py-24 bg-background overflow-hidden">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-col lg:flex-row items-center gap-20">
              <div className="lg:w-1/2 space-y-8">
                <h2 className="font-epilogue text-5xl font-bold leading-tight -tracking-tight">
                  Designed for the <br /><span className="text-primary">Mindful Eater.</span>
                </h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary">auto_awesome</span>
                    </div>
                    <div>
                      <h4 className="font-epilogue font-bold text-lg mb-1">Gemini 2.5 Flash Vision</h4>
                      <p className="text-muted-foreground">State-of-the-art vision AI that sees the nuances in your meals — even Indian food portions.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-purple-800">palette</span>
                    </div>
                    <div>
                      <h4 className="font-epilogue font-bold text-lg mb-1">No Calorie Counting Dread</h4>
                      <p className="text-muted-foreground">Tracking your health should feel beautiful. Every element crafted for calm focus.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="aspect-square bg-muted rounded-[3rem] p-12 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 whispr-flow-bg opacity-50" />
                  <div className="relative z-10 text-center space-y-6">
                    <span className="material-symbols-outlined text-6xl text-primary opacity-50">format_quote</span>
                    <h3 className="font-epilogue text-3xl font-bold leading-relaxed">"SlickByte builds a bridge between hunger and true nourishment."</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-surface">
          <div className="max-w-5xl mx-auto px-8">
            <div className="bg-primary/5 rounded-[3rem] p-16 text-center space-y-8 relative overflow-hidden border border-primary/10">
              <div className="absolute top-0 left-0 w-full h-full whispr-flow-bg opacity-40 -z-10" />
              <h2 className="font-epilogue text-4xl md:text-5xl font-extrabold -tracking-tight">
                Ready to hear what <br />your food has to say?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                No sign-up. No app download. Just snap and know.
              </p>
              <Button
                size="lg"
                className="rounded-full px-12 py-8 font-epilogue font-bold text-xl shadow-xl hover:scale-105 transition-transform"
                onClick={() => navigate("/analyze")}
              >
                Try It Now — It's Free
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-muted py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-epilogue font-bold text-primary text-2xl">SlickByte</span>
            <p className="text-sm text-muted-foreground">© 2025 SlickByte. Powered by Gemini 2.5 Flash.</p>
          </div>
          <div className="flex gap-8">
            <a className="text-sm text-muted-foreground hover:text-primary transition-colors font-bold" href="#">Privacy</a>
            <a className="text-sm text-muted-foreground hover:text-primary transition-colors font-bold" href="#">Terms</a>
            <a className="text-sm text-muted-foreground hover:text-primary transition-colors font-bold" href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
