
import { motion } from "motion/react";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  CalendarDays,
  ChartNoAxesCombined,
  Sparkles,
  Target,
  CheckCircle2,
} from "lucide-react";

import { Link } from "react-router-dom";
import { useStyle } from "../../components/ui/Style";
import Reveal from "../../components/public/Reveal";

function LandingPage() {
  const style = useStyle();
  const helixRungs = Array.from({ length: 12 }, (_, index) => {
    const x = index * 20;
    const y = 130 - 60 * Math.cos((2 * Math.PI * x) / 240);

    return `M${x} ${y} L${x} ${260 - y}`;
  }).join(" ");

  const features = [
    {
      icon: BriefcaseBusiness,
      title: "Application Tracker",
      description:
        "Organize your job applications and monitor every stage of your job search.",
    },
    {
      icon: FileText,
      title: "Resume Management",
      description:
        "Keep your resumes organized and prepare tailored versions for different opportunities.",
    },
    {
      icon: CalendarDays,
      title: "Interview Calendar",
      description:
        "Manage interview schedules, deadlines, and important career events.",
    },
    {
      icon: ChartNoAxesCombined,
      title: "Career Analytics",
      description:
        "Understand your application progress through useful statistics and insights.",
    },
    {
      icon: Sparkles,
      title: "AI Resume Analyzer",
      description:
        "Get suggestions to improve your resume and highlight relevant skills.",
    },
    {
      icon: Target,
      title: "AI Career Assistant",
      description:
        "Get career guidance and assistance throughout your job search.",
    },
  ];

  return (
    <div className={style.primaryBg}>
      {/* HOME SECTION */}
      <section
        id="home"
        className="relative isolate flex min-h-svh items-center overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-10 xl:px-16"
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 480 260"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-30 dark:opacity-20"
        >
          <defs>
            <linearGradient id="hero-helix-gradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <g className="hero-helix-track" fill="none" stroke="url(#hero-helix-gradient)">
            {[0, 240].map((offset) => (
              <g key={offset} transform={`translate(${offset} 0)`}>
                <path
                  d="M0 70 C40 70 80 190 120 190 C160 190 200 70 240 70"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M0 190 C40 190 80 70 120 70 C160 70 200 190 240 190"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={helixRungs}
                  strokeWidth="1.25"
                  strokeOpacity="0.65"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </g>
        </svg>

        <div className="relative z-10 mx-auto w-full max-w-7xl flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="min-w-0"
          >

            <h1
              className={`max-w-2xl text-4xl font-bold text-center tracking-tight sm:text-5xl md:text-6xl xl:text-7xl ${style.headingText}`}
            >
              Take control of your{" "}
              <span className="text-blue-600">
                career journey.
              </span>
            </h1>

            <p
              className={`mt-5 max-w-xl text-center text-base leading-7 sm:mt-7 sm:text-lg sm:leading-8 ${style.secondaryText}`}
            >
              Applora helps you organize job applications,
              manage resumes, prepare for interviews, and
              make smarter career decisions—all in one place.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:gap-4 items-center justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Get Started
                <ArrowRight size={18} />
              </Link>

              <a
                href="#features"
                className={`inline-flex items-center justify-center rounded-xl border px-4 py-3 font-semibold transition ${style.secondaryButton}`}
              >
                Explore Features
              </a>
            </div>

            <div
className={`mt-8 flex flex-col items-center justify-center text-center gap-3 text-sm sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-6 ${style.secondaryText}`}            >
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-blue-600" />
                All-in-one career platform
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-blue-600" />
                Organized job search
              </span>
            </div>
          </motion.div>
        </div>
      </section>

    {/* ABOUT SECTION */}
<section
  id="about"
  className={`flex min-h-[calc(100svh-var(--public-header-height))] items-center border-t px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-16 xl:px-16 ${style.border} ${style.secondaryBg}`}
>
  <div className="mx-auto w-full max-w-7xl">
    <Reveal>
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          About Applora
        </span>

        <h2
          className={`mt-4 text-3xl font-bold tracking-tight sm:mt-5 sm:text-4xl md:text-5xl ${style.headingText}`}
        >
          Built for Your Next Move.
        </h2>

        <p
          className={`mt-5 text-base leading-7 sm:mt-6 sm:text-lg sm:leading-8 ${style.secondaryText}`}
        >
          Applora was built to address the challenges of managing a job search,
          from keeping track of multiple applications to organizing resumes
          and preparing for interviews. Designed for students, fresh graduates,
          and job seekers, Applora aims to provide a centralized platform that
          simplifies career management, improves organization, and helps users
          navigate their journey toward employment with confidence.
        </p>
      </div>
    </Reveal>
  </div>
</section>

      {/* FEATURES SECTION */}
      <section
        id="features"
        className={`min-h-[calc(100svh-var(--public-header-height))] px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-16 xl:px-16 ${style.primaryBg}`}
      >
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Features
              </span>

              <h2
                className={`mt-4 text-3xl font-bold tracking-tight sm:mt-5 sm:text-4xl md:text-5xl ${style.headingText}`}
              >
               Everything in One Place.
              </h2>

              <p className={`mt-5 text-base leading-7 sm:mt-6 sm:text-lg sm:leading-8 ${style.secondaryText}`}>
                Tools designed to help you organize, manage,
                and improve every part of your job search.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid min-w-0 gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <Reveal key={feature.title} delay={index * 0.07}>
                  <div
                    className={`h-full min-w-0 rounded-2xl border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-7 ${style.card}`}
                  >
                    <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-4 text-blue-600 dark:bg-blue-950 sm:mb-6">
                      <Icon size={25} />
                    </div>

                    <h3 className={`text-lg font-bold sm:text-xl ${style.headingText}`}>
                      {feature.title}
                    </h3>

                    <p className={`mt-3 text-sm leading-6 sm:leading-7 ${style.secondaryText}`}>
                      {feature.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>

        </div>
      </section>

      {/* SIGN-UP CALL TO ACTION */}
      <section
        className={`px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24 xl:px-16  ${style.secondaryBg}`}
      >
        <div className="mx-auto w-full max-w-7xl">
          <Reveal>
            <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-6 py-10 text-white shadow-2xl shadow-blue-950/20 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-32 z-0 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-40 -left-20 z-0 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl"
              />

              <div className="relative mx-auto max-w-3xl text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Your career journey, all in one place.
                </h2>

                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-blue-50 sm:mt-5 sm:text-lg sm:leading-8">
                  Applora helps you track job applications, organize resumes,
                  prepare for interviews, and make confident next moves in your
                  career.
                </p>

                <div className="mt-7 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4">
                  <Link
                    to="/signup"
                    className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-blue-700 shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    Get Started
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href="#features"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-6 py-3.5 font-semibold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    Explore Features
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
