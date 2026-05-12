import { useState, useEffect } from "react";

// ── Persistence ───────────────────────────────────────────────────────────────
function load(key, fb) { try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function dayOfYear() { const n = new Date(); return Math.floor((n - new Date(n.getFullYear(),0,1))/(864e5))+1; }

// ── Score System ──────────────────────────────────────────────────────────────
const SCORE_CATEGORIES = [
  { id:"fitness",  label:"Fitness",  icon:"🏋", pts:25, color:"#4A9A4A", items:[
    { id:"workout",  label:"Completed workout",     pts:8 },
    { id:"water",    label:"Drank 90oz water",       pts:6 },
    { id:"protein",  label:"Hit protein goal",       pts:6 },
    { id:"sleep",    label:"In bed by 10:30 PM",     pts:5 },
  ]},
  { id:"money",    label:"Money",    icon:"💰", pts:25, color:"#C8B560", items:[
    { id:"nospend",  label:"No impulse spending",    pts:8 },
    { id:"finances", label:"Checked finances",       pts:6 },
    { id:"saved",    label:"Saved or invested",      pts:6 },
    { id:"debt",     label:"Took a debt action",     pts:5 },
  ]},
  { id:"career",   label:"Career",   icon:"💼", pts:20, color:"#5A8ACA", items:[
    { id:"learning", label:"Lunch learning block",   pts:7 },
    { id:"consult",  label:"Consulting task done",   pts:7 },
    { id:"growth",   label:"Oracle/HC IT growth",    pts:6 },
  ]},
  { id:"mindset",  label:"Mindset",  icon:"🧠", pts:15, color:"#9A7ABA", items:[
    { id:"read",     label:"Read 10+ pages",         pts:5 },
    { id:"journal",  label:"Journaled today",        pts:5 },
    { id:"gratitude",label:"Practiced gratitude",    pts:5 },
  ]},
  { id:"family",   label:"Family",   icon:"👨‍👩‍👧", pts:15, color:"#CA7A5A", items:[
    { id:"quality",  label:"Quality family moment",  pts:8 },
    { id:"intentional",label:"Intentional presence", pts:7 },
  ]},
];

function getGrade(score) {
  if (score >= 90) return { grade:"A+", label:"Elite Day",    color:"#4A9A4A" };
  if (score >= 75) return { grade:"A",  label:"Strong Day",   color:"#7AB87A" };
  if (score >= 60) return { grade:"B",  label:"Good Day",     color:"#C8B560" };
  if (score >= 40) return { grade:"C",  label:"Survive Day",  color:"#CA8A3A" };
  return               { grade:"D",  label:"Off Track",    color:"#9A4A4A" };
}

// ── Progression calculator ────────────────────────────────────────────────────
function calcProgression(w1, type) {
  if (!w1 || w1==="—") return ["—","—","—","—"];
  const lb = w1.match(/^(\d+(?:\.\d+)?)[×x](\d+)$/i);
  const sc = w1.match(/^(\d+)s$/i);
  const mn = w1.match(/^(\d+)\s*min$/i);
  const bw = w1.match(/^BW[×x](\d+)$/i);
  if (lb) {
    const [,l,r] = lb; const lbs=parseFloat(l), reps=parseInt(r);
    return type==="main"
      ? [`${lbs}×${reps}`,`${lbs}×${reps+1}`,`${lbs+5}×${reps}`,`${lbs+5}×${reps+1}`]
      : [`${lbs}×${reps}`,`${lbs}×${reps+1}`,`${lbs}×${reps+2}`,`${lbs+5}×${reps}`];
  }
  if (sc) { const s=parseInt(sc[1]); return [`${s}s`,`${s+5}s`,`${s+10}s`,`${s+15}s`]; }
  if (mn) { const m=parseInt(mn[1]); return [`${m} min`,`${m+5} min`,`${m+5} min`,`${m+10} min`]; }
  if (bw) { const r=parseInt(bw[1]); return [`BW×${r}`,`BW×${r+2}`,`BW×${r+4}`,`+DB×${r}`]; }
  return [w1,"—","—","—"];
}

// ── Static Data ───────────────────────────────────────────────────────────────
const PHASES = [
  { week:"1–2",  label:"Lock In Identity", color:"#C8B560", desc:"You are now a 5:30 AM lifter. Not trying to be — you are." },
  { week:"3–4",  label:"Build Momentum",   color:"#A8C87A", desc:"Energy improves. Strength increases. Routine starts to feel normal." },
  { week:"5–8",  label:"Visible Progress", color:"#7AB87A", desc:"Visible muscle. Confidence boost. People start noticing." },
  { week:"9–12", label:"Transformation",   color:"#4A9A4A", desc:"Noticeable physique change. Locked-in discipline. Elite status." },
];

const TAG_COLORS = {
  Mikolo:  { bg:"#E8F5E922", color:"#4A9A4A" },
  Cable:   { bg:"#E3F2FD22", color:"#5A8ACA" },
  Barbell: { bg:"#FFF3E022", color:"#C8B560"  },
  Cardio:  { bg:"#F3E5F522", color:"#9A7ABA"  },
  Mobility:{ bg:"#E0F7FA22", color:"#5A9A9A"  },
  Body:    { bg:"#FCE4EC22", color:"#CA7A8A"  },
};

const WORKOUT_SPLIT = [
  { day:"MON", label:"Push", color:"#4A9A4A",
    warmup:"5 min walking pad (3.5–4 mph) + arm circles, shoulder rolls",
    cooldown:"5–10 min walking pad (2.5 mph) + chest stretch",
    exercises:[
      { name:"Bench Press",           type:"main",      default:"65×8",  sets:4, reps:"8–10", rest:"90s", note:"Use safety bars — start light, control descent",       tag:"Mikolo" },
      { name:"Overhead Press",        type:"main",      default:"45×10", sets:3, reps:"10–12",rest:"60s", note:"Seated or standing — light to start",                  tag:"Mikolo" },
      { name:"Incline Press",         type:"main",      default:"45×8",  sets:3, reps:"10–12",rest:"60s", note:"Adjust bench to 30–45°",                               tag:"Mikolo" },
      { name:"Cable Lateral Raises",  type:"accessory", default:"—×12",  sets:3, reps:"12–15",rest:"45s", note:"Single handle, low pulley — smooth arc, control down", tag:"Cable"  },
      { name:"Cable Tricep Pushdown", type:"accessory", default:"—×12",  sets:3, reps:"12–15",rest:"45s", note:"Rope attachment, high pulley — elbows tucked",         tag:"Cable"  },
      { name:"Cable Chest Fly",       type:"accessory", default:"—×15",  sets:2, reps:"15",   rest:"45s", note:"Both pulleys mid-height — squeeze at center",          tag:"Cable"  },
    ]},
  { day:"TUE", label:"Legs", color:"#C8B560",
    warmup:"5 min stair stepper (low intensity) + bodyweight squats ×10",
    cooldown:"5 min walking pad + quad & hip flexor stretch",
    exercises:[
      { name:"Barbell Back Squat",    type:"main",      default:"45×8",  sets:4, reps:"8–10", rest:"90s", note:"Bar only to start — nail depth & form first",          tag:"Mikolo" },
      { name:"Romanian Deadlift",     type:"main",      default:"65×10", sets:3, reps:"10–12",rest:"75s", note:"Hinge at hips, soft knees — feel the hamstring",       tag:"Barbell"},
      { name:"Barbell Lunges",        type:"accessory", default:"BW×10", sets:3, reps:"10 ea",rest:"60s", note:"Step forward, bar across upper back",                  tag:"Mikolo" },
      { name:"Cable Leg Curl",        type:"accessory", default:"—×12",  sets:3, reps:"12–15",rest:"60s", note:"Ankle strap, low pulley — curl heel toward glute",     tag:"Cable"  },
      { name:"Barbell Calf Raises",   type:"accessory", default:"—×15",  sets:4, reps:"15–20",rest:"30s", note:"Pause at bottom, slow on the way down",                tag:"Mikolo" },
    ]},
  { day:"WED", label:"Recovery", color:"#5A8A8A",
    warmup:"None — ease into movement gently",
    cooldown:"Hydrate well. Prioritize sleep tonight.",
    exercises:[
      { name:"Walking Pad",           type:"cardio",    default:"20 min",sets:1, reps:"20–30 min",rest:"—", note:"Zone 2 — conversational pace, 3–4 mph",              tag:"Cardio"  },
      { name:"Full Body Stretching",  type:"cardio",    default:"10 min",sets:1, reps:"10 min",   rest:"—", note:"Hips, chest, hamstrings, lats",                       tag:"Mobility"},
      { name:"Foam Roll / Mobility",  type:"cardio",    default:"10 min",sets:1, reps:"10 min",   rest:"—", note:"Focus on sore muscles from Mon/Tue",                  tag:"Mobility"},
    ]},
  { day:"THU", label:"Pull", color:"#7A5A9A",
    warmup:"5 min walking pad + cable pull-aparts ×15",
    cooldown:"5 min walking pad + lat & bicep doorframe stretch",
    exercises:[
      { name:"Lat Pulldown",          type:"main",      default:"—×8",   sets:4, reps:"8–10", rest:"90s", note:"Long bar, high pulley — pull to upper chest, squeeze", tag:"Cable"  },
      { name:"Seated Cable Row",      type:"main",      default:"—×10",  sets:3, reps:"10–12",rest:"75s", note:"Low pulley — row to belly button, elbows back",        tag:"Cable"  },
      { name:"Landmine Row",          type:"accessory", default:"—×10",  sets:3, reps:"10–12",rest:"60s", note:"Single arm — great for mid-back thickness",            tag:"Mikolo" },
      { name:"Cable Bicep Curl",      type:"accessory", default:"—×10",  sets:3, reps:"10–12",rest:"60s", note:"Straight bar, low pulley — full range, squeeze",       tag:"Cable"  },
      { name:"Cable Hammer Curl",     type:"accessory", default:"—×12",  sets:3, reps:"12",   rest:"45s", note:"Rope, neutral grip — controlled descent",              tag:"Cable"  },
      { name:"Cable Face Pulls",      type:"accessory", default:"—×15",  sets:3, reps:"15",   rest:"45s", note:"Rope, high pulley — rear delt & rotator cuff",         tag:"Cable"  },
    ]},
  { day:"FRI", label:"Legs+Core", color:"#9A4A4A",
    warmup:"5 min stair stepper + glute bridges ×15",
    cooldown:"5 min walking pad + hamstring & glute stretch",
    exercises:[
      { name:"Barbell Deadlift",      type:"main",      default:"75×6",  sets:4, reps:"6–8",  rest:"2 min",note:"Set safeties at knee height — big breath, brace",    tag:"Barbell"},
      { name:"Barbell Sumo Squat",    type:"main",      default:"45×10", sets:3, reps:"12",   rest:"60s", note:"Wide stance, toes out — inner thigh & glutes",         tag:"Mikolo" },
      { name:"Cable Glute Kickback",  type:"accessory", default:"—×12",  sets:4, reps:"12–15",rest:"60s", note:"Ankle strap, low pulley — lean slightly forward",      tag:"Cable"  },
      { name:"Cable Woodchoppers",    type:"accessory", default:"—×12",  sets:3, reps:"12 ea",rest:"45s", note:"High to low — rotational core, controlled",            tag:"Cable"  },
      { name:"Hanging Leg Raises",    type:"accessory", default:"—×10",  sets:3, reps:"10–12",rest:"45s", note:"Mikolo pull-up bar — tuck knees, no swinging",         tag:"Mikolo" },
      { name:"Plank",                 type:"cardio",    default:"30s",   sets:3, reps:"30–45s",rest:"30s", note:"Stay rigid — breathe steadily, no sagging hips",      tag:"Body"   },
    ]},
  { day:"SAT", label:"Optional", color:"#6A6A6A",
    warmup:"5 min stair stepper (moderate)",
    cooldown:"5 min walking pad + full body stretch",
    exercises:[
      { name:"Full Body Circuit",     type:"cardio",    default:"—",     sets:3, reps:"10",   rest:"60s", note:"Squat to press, cable row, dips",                      tag:"Mikolo" },
      { name:"Stair Stepper",         type:"cardio",    default:"15 min",sets:1, reps:"15 min",rest:"—",  note:"Moderate–high effort finisher",                        tag:"Cardio" },
    ]},
  { day:"SUN", label:"Rest", color:"#3A4A3A",
    warmup:"—", cooldown:"—",
    exercises:[
      { name:"Full Rest",             type:"cardio",    default:"—",     sets:1, reps:"All day",rest:"—", note:"Muscles grow during recovery.",                        tag:"Body"   },
      { name:"Meal Prep",             type:"cardio",    default:"90 min",sets:1, reps:"60–90 min",rest:"—",note:"Cook rice, lentils, roast veggies",                   tag:"Body"   },
    ]},
];

const MISSIONS = [
  { id:"body",      icon:"🏋", label:"Body Transformation", color:"#4A9A4A",
    goal:"Gain 10–15 lbs lean muscle",
    metric:"Current weight vs target",
    tasks:[
      { id:"b1", label:"Train 5+ days per week consistently" },
      { id:"b2", label:"Hit 120g+ protein daily" },
      { id:"b3", label:"Walk pad active recovery Wednesdays" },
      { id:"b4", label:"Wholier Multi taken daily" },
      { id:"b5", label:"8 weeks no missed back-to-back days" },
    ]},
  { id:"money",     icon:"💰", label:"Financial Freedom",    color:"#C8B560",
    goal:"Reduce debt + build investing habit",
    metric:"Monthly debt reduction progress",
    tasks:[
      { id:"m1", label:"Switch to Mint Mobile (phone bill)" },
      { id:"m2", label:"Create zero-based monthly budget" },
      { id:"m3", label:"Set up automatic monthly investment" },
      { id:"m4", label:"Pay extra toward highest-interest debt" },
      { id:"m5", label:"30-day no impulse spend streak" },
    ]},
  { id:"consulting",icon:"📈", label:"First Consulting Client", color:"#5A8ACA",
    goal:"Land first paying consulting client",
    metric:"Steps to first discovery call",
    tasks:[
      { id:"c1", label:"LinkedIn profile fully optimized" },
      { id:"c2", label:"Consulting offer clearly defined" },
      { id:"c3", label:"Website or one-pager created" },
      { id:"c4", label:"10 outreach messages sent" },
      { id:"c5", label:"First discovery call completed" },
    ]},
  { id:"family",    icon:"👨‍👩‍👧", label:"Family Legacy",        color:"#CA7A5A",
    goal:"More intentional, present family life",
    metric:"Daily intentional moments tracked",
    tasks:[
      { id:"f1", label:"Phone-free family dinner 5x/week" },
      { id:"f2", label:"Weekly family activity planned" },
      { id:"f3", label:"Morning routine inspires the household" },
      { id:"f4", label:"Share your transformation journey" },
      { id:"f5", label:"90-day reflection written for family" },
    ]},
];

const BOOKS = [
  { id:"atomic",  title:"Atomic Habits",       author:"James Clear",       color:"#C8B560",
    challenges:["Lay out gym clothes tonight before bed","Stack supplements with morning coffee — same time, same place","Identify one bad habit. Name its cue, routine, reward","Make one good habit obvious: put water bottle on counter","Two-minute rule: start the workout, even if just 2 minutes"] },
  { id:"psych",   title:"Psychology of Money", author:"Morgan Housel",     color:"#5A8ACA",
    challenges:["No emotional financial decisions today","Write down one money behavior that hurts you","Calculate your real hourly rate at your job","Identify one subscription you can cut this week","Define what 'enough' means to you financially"] },
  { id:"100m",    title:"$100M Offers",        author:"Alex Hormozi",      color:"#9A4A4A",
    challenges:["Write your consulting offer in one sentence — what result do you deliver?","Identify the dream outcome your client wants most","List the pain points your healthcare IT expertise solves","Define what makes your offer 10x better than alternatives","Price your offer based on value delivered, not hours worked"] },
  { id:"consult", title:"The Consulting Bible", author:"Alan Weiss",       color:"#7A5A9A",
    challenges:["Define your consulting offer in one sentence","Identify 3 potential clients in your network","Write your value proposition — what problem do you solve?","Research one target company's pain points","Draft an outreach message to one potential client"] },
];

const SUPPLEMENTS = [
  { time:"Morning — with breakfast", color:"#C8B560", items:[
    { name:"Wholier Multi (plant-based)", dose:"2 caps — B12, D3, K2, zinc, iron, omega-3 DHA+EPA" },
  ]},
  { time:"Post-Workout", color:"#7AB87A", items:[
    { name:"Huel Complete Protein",       dose:"1–2 scoops — complete amino acid profile" },
  ]},
  { time:"💧 Hydration", color:"#5A8A8A", items:[
    { name:"Rest days",   dose:"74oz minimum" },
    { name:"Workout days",dose:"90oz minimum" },
    { name:"Drink nights",dose:"Add 16oz on top" },
  ]},
];

const MUSIC_SLOTS = [
  { id:"morning",  label:"Morning Hype",    icon:"⚡", time:"5:35 AM", desc:"Conditions your brain to train" },
  { id:"focus",    label:"Focus Flow",      icon:"💼", time:"8:30 AM", desc:"Deep work block" },
  { id:"cooldown", label:"Cool Down",       icon:"🚿", time:"6:30 AM", desc:"Post-workout recovery" },
  { id:"night",    label:"Night Wind Down", icon:"🌙", time:"9:30 PM", desc:"Shutdown mode" },
];

const DEFAULT_MUSIC = {
  spotify:{
    morning:  { url:"https://open.spotify.com/playlist/2wguJTR7eXNWsAfotPBwGR", name:"Morning Hype"    },
    focus:    { url:"https://open.spotify.com/playlist/1CVgGqDvKCXB7kqtGXnLSx", name:"Focus Flow"      },
    cooldown: { url:"https://open.spotify.com/playlist/7B7ENlo6hXW17zYE8lADRt", name:"Cool Down"       },
    night:    { url:"https://open.spotify.com/playlist/6spKwOWEJymJx1u13AxEne", name:"Night Wind Down" },
  },
  apple:{
    morning:  { url:"https://music.apple.com/us/playlist/workout/pl.u-leyl0WptbWo6oW",         name:"Workout"   },
    focus:    { url:"https://music.apple.com/us/playlist/focus-flow/pl.u-aXblCpzNkPb6e3",     name:"Focus Flow"},
    cooldown: { url:"https://music.apple.com/us/playlist/cool-down/pl.u-8aAVZAGl5z71pV",      name:"Cool Down" },
    night:    { url:"https://music.apple.com/us/playlist/sleep/pl.u-oZyll4OTMePzYY",           name:"Sleep"     },
  },
};

const TABS = [
  { key:"lockin",    label:"Lock In", icon:"🔥" },
  { key:"missions",  label:"Missions",icon:"🎯" },
  { key:"workout",   label:"Workouts",icon:"🏋" },
  { key:"progress",  label:"Progress",icon:"📈" },
  { key:"books",     label:"Books",   icon:"📚" },
  { key:"supps",     label:"Supps",   icon:"💊" },
  { key:"music",     label:"Music",   icon:"🎵" },
  { key:"calendar",  label:"Calendar",icon:"📅" },
];

const MONTHS     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]               = useState("lockin");
  const [currentPhase, setCurrentPhase] = useState(() => load("elite_phase", 0));
  const [activeDay, setActiveDay]   = useState(0);
  const [activeWeek, setActiveWeek] = useState(0);

  // Daily scores persisted by date
  const [allScores, setAllScores]   = useState(() => load("elite_scores2", {}));
  const [bodyWeight, setBodyWeight] = useState(() => load("elite_bw",      { w1:"130",w2:"",w3:"",w4:"" }));
  const [liftInputs, setLiftInputs] = useState(() => load("elite_lifts",   {}));
  const [missionProgress, setMissionProgress] = useState(() => load("elite_missions", {}));
  const [bookIdx, setBookIdx]       = useState(() => load("elite_book", 0));
  const [bookDay, setBookDay]       = useState(() => load("elite_bookday", 0));
  const [musicLinks, setMusicLinks] = useState(() => load("elite_music", DEFAULT_MUSIC));
  const [musicPlatform, setMusicPlatform] = useState("spotify");
  const [editingMusic, setEditingMusic]   = useState(null);
  const [musicEditUrl, setMusicEditUrl]   = useState("");
  const [musicEditName, setMusicEditName] = useState("");
  const [calYear, setCalYear]       = useState(new Date().getFullYear());
  const [calMonth, setCalMonth]     = useState(new Date().getMonth());
  const [selectedCalDay, setSelectedCalDay] = useState(null);
  const [calNotes, setCalNotes]     = useState(() => load("elite_calnotes", {}));
  const [noteInput, setNoteInput]   = useState("");
  const [futureWeight, setFutureWeight] = useState(() => load("elite_fwt", "142"));
  const [debtGoal, setDebtGoal]     = useState(() => load("elite_debt", ""));
  const [investPct, setInvestPct]   = useState(() => load("elite_invest", "0"));

  const TODAY = todayKey();
  const todayScores = allScores[TODAY] || {};

  useEffect(() => { save("elite_scores2",  allScores); },      [allScores]);
  useEffect(() => { save("elite_bw",       bodyWeight); },     [bodyWeight]);
  useEffect(() => { save("elite_lifts",    liftInputs); },     [liftInputs]);
  useEffect(() => { save("elite_missions", missionProgress); },[missionProgress]);
  useEffect(() => { save("elite_book",     bookIdx); },        [bookIdx]);
  useEffect(() => { save("elite_bookday",  bookDay); },        [bookDay]);
  useEffect(() => { save("elite_music",    musicLinks); },     [musicLinks]);
  useEffect(() => { save("elite_calnotes", calNotes); },       [calNotes]);
  useEffect(() => { save("elite_phase",    currentPhase); },   [currentPhase]);
  useEffect(() => { save("elite_fwt",      futureWeight); },   [futureWeight]);
  useEffect(() => { save("elite_debt",     debtGoal); },       [debtGoal]);
  useEffect(() => { save("elite_invest",   investPct); },      [investPct]);

  // Score calculation
  function toggleScore(catId, itemId, pts) {
    setAllScores(prev => {
      const day = { ...(prev[TODAY]||{}) };
      const key = `${catId}:${itemId}`;
      if (day[key]) delete day[key];
      else day[key] = pts;
      return { ...prev, [TODAY]: day };
    });
  }

  function getDayScore(dayChecks) {
    return Object.values(dayChecks||{}).reduce((a,b)=>a+b,0);
  }

  const todayScore = getDayScore(todayScores);
  const todayGrade = getGrade(todayScore);

  // Mission toggle
  function toggleMission(missionId, taskId) {
    setMissionProgress(prev => {
      const m = { ...(prev[missionId]||{}) };
      m[taskId] = !m[taskId];
      return { ...prev, [missionId]: m };
    });
  }

  function getMissionPct(missionId, tasks) {
    const done = tasks.filter(t => missionProgress[missionId]?.[t.id]).length;
    return Math.round((done/tasks.length)*100);
  }

  // Workout progression
  function getWeekTargets(dayLabel, exName, exType, exDefault) {
    const w1key = `${dayLabel}:${exName}:0`;
    const w1val = liftInputs[w1key] !== undefined ? liftInputs[w1key] : exDefault;
    return calcProgression(w1val, exType);
  }
  function getLiftKey(d, n, w) { return `${d}:${n}:${w}`; }

  // Music
  function launchMusic(url) { if(url) window.open(url,"_blank"); }

  // Calendar
  function getDaysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }
  function getFirstDay(y,m)    { return new Date(y,m,1).getDay(); }
  function dayKey(y,m,d)       { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
  function getDayStatus(key) {
    const s = getDayScore(allScores[key]||{});
    if (s===0) return "none";
    if (s>=90) return "elite";
    if (s>=60) return "good";
    return "started";
  }
  function getDayColor(status) {
    if (status==="elite")   return "#4A9A4A";
    if (status==="good")    return "#C8B560";
    if (status==="started") return "#5A4A2A";
    return "transparent";
  }

  const yearElite = Object.entries(allScores).filter(([k,v])=>k.startsWith(String(calYear))&&getDayScore(v)>=90).length;
  const dayNum = dayOfYear();
  const discipline = Math.round((yearElite/Math.max(1,dayNum))*100);

  // Projected body weight
  const bwStart = parseFloat(bodyWeight.w1)||130;
  const projectedWeight = (bwStart + (yearElite * 0.08)).toFixed(1);

  // Book challenge
  const currentBook = BOOKS[bookIdx];
  const currentChallenge = currentBook.challenges[bookDay % currentBook.challenges.length];

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:"#0A0F0A", minHeight:"100vh", color:"#E8E4D8", fontFamily:"'Georgia', serif", maxWidth:820, margin:"0 auto" }}>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(160deg,#0A120A,#141F0A,#0A120A)", padding:"20px 18px 0", borderBottom:"1px solid #1A2A1A" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:"monospace", fontSize:9, letterSpacing:5, color:"#4A6A4A", marginBottom:3 }}>90-DAY LOCK-IN MODE</div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#E8E4D8", letterSpacing:-0.5 }}>Elite Life OS</h1>
            <div style={{ fontSize:10, color:"#5A7A5A", marginTop:2 }}>Body · Money · Career · Family · Legacy</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:32, fontWeight:700, color:todayGrade.color, fontFamily:"monospace", lineHeight:1 }}>{todayScore}</div>
            <div style={{ fontSize:9, color:todayGrade.color, fontFamily:"monospace", letterSpacing:1 }}>{todayGrade.grade} · {todayGrade.label}</div>
          </div>
        </div>
        {/* Phase pills */}
        <div style={{ display:"flex", gap:5, marginBottom:12 }}>
          {PHASES.map((p,i) => (
            <button key={i} onClick={() => setCurrentPhase(i)} style={{
              flex:1, padding:"5px 3px", border:`1px solid ${i===currentPhase?p.color:"#1A2A1A"}`,
              borderRadius:6, background:i===currentPhase?p.color+"22":"transparent", cursor:"pointer"
            }}>
              <div style={{ fontSize:7, fontFamily:"monospace", color:p.color, letterSpacing:1 }}>WK {p.week}</div>
              <div style={{ fontSize:8, color:i===currentPhase?"#E8E4D8":"#4A5A4A", fontWeight:i===currentPhase?700:400 }}>{p.label}</div>
            </button>
          ))}
        </div>
        {/* Tabs */}
        <div style={{ display:"flex", overflowX:"auto", marginLeft:-18, marginRight:-18, paddingLeft:18 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flexShrink:0, padding:"9px 11px", border:"none",
              borderBottom:`3px solid ${tab===t.key?"#C8B560":"transparent"}`,
              background:"transparent", color:tab===t.key?"#C8B560":"#4A5A4A",
              cursor:"pointer", fontFamily:"monospace", fontSize:9, letterSpacing:1,
              fontWeight:tab===t.key?700:400, whiteSpace:"nowrap"
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 18px 80px" }}>

        {/* ── 🔥 LOCK IN ── */}
        {tab==="lockin" && (
          <div>
            {/* Future Self Dashboard */}
            <div style={{ background:"linear-gradient(135deg,#0F1F0F,#1A2A0F)", borderRadius:14, padding:"16px 16px", marginBottom:18, border:"1px solid #2A4A2A" }}>
              <div style={{ fontSize:9, fontFamily:"monospace", letterSpacing:3, color:"#6A8A5A", marginBottom:10 }}>🚀 FUTURE SELF — 90 DAYS FROM NOW</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[
                  { label:"Body Weight",        value:`${projectedWeight} lbs`,  icon:"🏋", color:"#4A9A4A" },
                  { label:"Discipline Score",    value:`${discipline}%`,          icon:"🔥", color:"#C8B560" },
                  { label:"Consulting Ready",    value:`${getMissionPct("consulting", MISSIONS[2].tasks)}%`, icon:"💼", color:"#5A8ACA" },
                  { label:"Financial Progress",  value:`${getMissionPct("money", MISSIONS[1].tasks)*20}%`,  icon:"💰", color:"#C8B560" },
                ].map((s,i) => (
                  <div key={i} style={{ background:"#0A120A", borderRadius:8, padding:"10px 10px", border:`1px solid ${s.color}33` }}>
                    <div style={{ fontSize:14 }}>{s.icon}</div>
                    <div style={{ fontSize:16, fontWeight:700, color:s.color, fontFamily:"monospace", marginTop:4 }}>{s.value}</div>
                    <div style={{ fontSize:9, color:"#4A5A4A", marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10, fontSize:10, color:"#5A7A5A", fontStyle:"italic", textAlign:"center" }}>
                If you maintain current pace — projected outcome
              </div>
            </div>

            {/* Daily Score Breakdown */}
            <div style={{ fontSize:9, fontFamily:"monospace", letterSpacing:3, color:"#6A8A5A", marginBottom:10 }}>TODAY'S SCORE — {todayScore}/100</div>

            {/* Score progress bar */}
            <div style={{ height:8, background:"#1A2A1A", borderRadius:4, overflow:"hidden", marginBottom:16 }}>
              <div style={{ height:"100%", width:`${todayScore}%`, background:todayGrade.color, borderRadius:4, transition:"width 0.5s ease" }}/>
            </div>

            {SCORE_CATEGORIES.map(cat => {
              const catScore = cat.items.reduce((sum,item) => sum + (todayScores[`${cat.id}:${item.id}`]||0), 0);
              return (
                <div key={cat.id} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{ fontSize:14 }}>{cat.icon}</span>
                      <span style={{ fontSize:10, fontFamily:"monospace", fontWeight:700, color:cat.color, letterSpacing:2 }}>{cat.label.toUpperCase()}</span>
                    </div>
                    <div style={{ fontFamily:"monospace", fontSize:11, color:cat.color, fontWeight:700 }}>{catScore}/{cat.pts} pts</div>
                  </div>
                  {cat.items.map(item => {
                    const key = `${cat.id}:${item.id}`;
                    const done = !!todayScores[key];
                    return (
                      <button key={item.id} onClick={() => toggleScore(cat.id, item.id, item.pts)} style={{
                        width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"12px 14px", border:`1px solid ${done?cat.color+"66":"#1A2A1A"}`,
                        borderRadius:10, background:done?cat.color+"11":"#0F170F",
                        cursor:"pointer", textAlign:"left", marginBottom:5, transition:"all 0.2s"
                      }}>
                        <span style={{ fontSize:13, color:done?"#E8E4D8":"#6A7A5A", fontWeight:done?600:400 }}>{item.label}</span>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:10, fontFamily:"monospace", color:done?cat.color:"#3A4A3A" }}>+{item.pts}pts</span>
                          <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${done?cat.color:"#2A3A2A"}`, background:done?cat.color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#0A0F0A", fontWeight:700, flexShrink:0, transition:"all 0.2s" }}>{done?"✓":""}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Grade display */}
            <div style={{ background:todayGrade.color+"22", border:`1px solid ${todayGrade.color}44`, borderRadius:12, padding:"16px 16px", textAlign:"center", marginTop:8 }}>
              <div style={{ fontSize:42, fontWeight:700, color:todayGrade.color, fontFamily:"monospace", lineHeight:1 }}>{todayGrade.grade}</div>
              <div style={{ fontSize:14, color:todayGrade.color, marginTop:6, fontWeight:700 }}>{todayGrade.label}</div>
              <div style={{ fontSize:11, color:"#6A7A5A", marginTop:4 }}>
                {todayScore>=90?"You operated at the highest level today. This is who you are."
                :todayScore>=75?"Solid execution. One more push and you're elite."
                :todayScore>=60?"Good day. Identify one category to improve tomorrow."
                :todayScore>=40?"Survive mode. Tomorrow is a reset. Show up."
                :"Restart tomorrow. One day doesn't define you. Execute."}
              </div>
            </div>
          </div>
        )}

        {/* ── 🎯 MISSIONS ── */}
        {tab==="missions" && (
          <div>
            <div style={{ fontSize:9, fontFamily:"monospace", letterSpacing:3, color:"#6A8A5A", marginBottom:14 }}>90-DAY MISSIONS</div>
            {MISSIONS.map(mission => {
              const pct = getMissionPct(mission.id, mission.tasks);
              return (
                <div key={mission.id} style={{ background:"#0F170F", borderRadius:14, overflow:"hidden", border:"1px solid #1A2A1A", marginBottom:14 }}>
                  <div style={{ background:mission.color+"22", borderLeft:`4px solid ${mission.color}`, padding:"14px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:22 }}>{mission.icon}</span>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14, color:"#E8E4D8" }}>{mission.label}</div>
                          <div style={{ fontSize:10, color:"#6A7A5A", marginTop:2 }}>{mission.goal}</div>
                        </div>
                      </div>
                      <div style={{ fontFamily:"monospace", fontSize:22, fontWeight:700, color:mission.color }}>{pct}%</div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginTop:10, height:6, background:"#0A120A", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:mission.color, borderRadius:3, transition:"width 0.4s" }}/>
                    </div>
                  </div>
                  {mission.tasks.map((task,i) => {
                    const done = !!missionProgress[mission.id]?.[task.id];
                    return (
                      <button key={task.id} onClick={() => toggleMission(mission.id, task.id)} style={{
                        width:"100%", display:"flex", alignItems:"center", gap:12,
                        padding:"13px 14px", border:"none", borderBottom:"1px solid #1A2A1A",
                        background:done?mission.color+"0D":"transparent", cursor:"pointer", textAlign:"left", transition:"all 0.2s"
                      }}>
                        <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${done?mission.color:"#2A3A2A"}`, background:done?mission.color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#0A0F0A", fontWeight:700, flexShrink:0 }}>{done?"✓":""}</div>
                        <span style={{ fontSize:13, color:done?"#E8E4D8":"#6A7A5A", fontWeight:done?600:400 }}>{task.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── 🏋 WORKOUTS ── */}
        {tab==="workout" && (
          <div>
            <div style={{ fontSize:10, color:"#6A8A5A", fontFamily:"monospace", letterSpacing:2, marginBottom:10 }}>Enter Week 1 → progression auto-calculates</div>
            <div style={{ display:"flex", gap:5, marginBottom:12, overflowX:"auto", paddingBottom:4 }}>
              {WORKOUT_SPLIT.map((d,i) => (
                <button key={i} onClick={() => setActiveDay(i)} style={{
                  flexShrink:0, padding:"8px 10px", border:`2px solid ${activeDay===i?d.color:"#1A2A1A"}`,
                  borderRadius:8, background:activeDay===i?d.color+"22":"#0F170F",
                  color:activeDay===i?d.color:"#4A5A4A", cursor:"pointer",
                  fontFamily:"monospace", fontSize:9, fontWeight:700
                }}>
                  <div>{d.day}</div><div style={{ fontSize:7, marginTop:2 }}>{d.label}</div>
                </button>
              ))}
            </div>
            {(() => {
              const d = WORKOUT_SPLIT[activeDay];
              return (
                <div style={{ background:"#0F170F", borderRadius:14, overflow:"hidden", border:"1px solid #1A2A1A" }}>
                  <div style={{ background:d.color+"22", borderLeft:`4px solid ${d.color}`, padding:"14px 14px" }}>
                    <div style={{ fontSize:9, fontFamily:"monospace", letterSpacing:3, color:d.color }}>WEEK {activeWeek+1} · BUILT FOR CONSISTENCY</div>
                    <div style={{ fontSize:17, fontWeight:700, color:"#E8E4D8", marginTop:3 }}>{d.day} — {d.label}</div>
                  </div>
                  {d.warmup && d.warmup!=="—" && (
                    <div style={{ display:"flex", gap:8, padding:"9px 14px", background:"#0A1A0A", borderBottom:"1px solid #1A2A1A" }}>
                      <div style={{ fontSize:9, fontFamily:"monospace", color:"#4A9A4A", letterSpacing:2, flexShrink:0, marginTop:1 }}>WARM-UP</div>
                      <div style={{ fontSize:11, color:"#5A8A5A" }}>{d.warmup}</div>
                    </div>
                  )}
                  <div style={{ display:"flex", borderBottom:"1px solid #1A2A1A" }}>
                    {[0,1,2,3].map(wi => (
                      <button key={wi} onClick={() => setActiveWeek(wi)} style={{
                        flex:1, padding:"8px 4px", border:"none",
                        borderBottom:`3px solid ${activeWeek===wi?d.color:"transparent"}`,
                        background:activeWeek===wi?d.color+"11":"transparent",
                        color:activeWeek===wi?d.color:"#4A5A4A", cursor:"pointer",
                        fontFamily:"monospace", fontSize:9, fontWeight:activeWeek===wi?700:400
                      }}>WK {wi+1}{wi===0?" ✎":""}</button>
                    ))}
                  </div>
                  {d.exercises.map((ex,i) => {
                    const targets = getWeekTargets(d.day, ex.name, ex.type, ex.default);
                    const isWk1 = activeWeek===0;
                    const w1key = getLiftKey(d.day, ex.name, 0);
                    const thisWeekTarget = targets[activeWeek];
                    const parsed = thisWeekTarget && thisWeekTarget.match(/^(.+)[×x](\d+)$/i);
                    const dispWeight = parsed ? parsed[1] : thisWeekTarget;
                    const tagStyle = TAG_COLORS[ex.tag] || TAG_COLORS.Body;
                    return (
                      <div key={i} style={{ padding:"12px 14px", background:i%2===0?"#0F170F":"#0A120A", borderBottom:"1px solid #1A2A1A" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8, flexWrap:"wrap" }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"#E8E4D8" }}>{ex.name}</div>
                          {ex.tag && <span style={{ background:tagStyle.bg, color:tagStyle.color, borderRadius:20, padding:"1px 8px", fontSize:8, fontFamily:"monospace", fontWeight:700, border:`1px solid ${tagStyle.color}33` }}>{ex.tag}</span>}
                        </div>
                        {isWk1 ? (
                          <div>
                            <input value={liftInputs[w1key]!==undefined?liftInputs[w1key]:ex.default}
                              onChange={e => setLiftInputs(p=>({...p,[w1key]:e.target.value}))}
                              placeholder={ex.default}
                              style={{ width:"100%", background:"#1A2A1A", border:`1px solid ${d.color}66`, borderRadius:6, padding:"8px 10px", color:"#E8E4D8", fontFamily:"monospace", fontSize:14, fontWeight:700, textAlign:"center", marginBottom:8 }}/>
                            <div style={{ display:"flex", gap:4 }}>
                              {targets.map((t,ti) => (
                                <div key={ti} style={{ flex:1, background:"#0A120A", borderRadius:5, padding:"4px 3px", textAlign:"center", border:`1px solid ${ti===0?d.color+"66":"#1A2A1A"}` }}>
                                  <div style={{ fontSize:7, color:"#3A4A3A", fontFamily:"monospace" }}>WK{ti+1}</div>
                                  <div style={{ fontSize:9, fontFamily:"monospace", color:ti===0?d.color:"#5A6A5A", fontWeight:ti===0?700:400 }}>{t}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                            <div style={{ background:"#0A120A", borderRadius:7, padding:"8px 6px", textAlign:"center", border:`1px solid ${d.color}33` }}>
                              <div style={{ fontSize:8, color:"#4A5A4A", fontFamily:"monospace", marginBottom:3 }}>SETS</div>
                              <div style={{ fontSize:15, fontWeight:700, color:d.color, fontFamily:"monospace" }}>{ex.sets||"—"}</div>
                            </div>
                            <div style={{ background:"#0A120A", borderRadius:7, padding:"8px 6px", textAlign:"center", border:`1px solid ${d.color}33` }}>
                              <div style={{ fontSize:8, color:"#4A5A4A", fontFamily:"monospace", marginBottom:3 }}>REPS</div>
                              <div style={{ fontSize:15, fontWeight:700, color:d.color, fontFamily:"monospace" }}>{ex.reps||"—"}</div>
                            </div>
                            <div style={{ background:"#0A120A", borderRadius:7, padding:"8px 6px", textAlign:"center", border:`1px solid ${d.color}44` }}>
                              <div style={{ fontSize:8, color:"#4A5A4A", fontFamily:"monospace", marginBottom:3 }}>WK{activeWeek+1} TARGET</div>
                              <div style={{ fontSize:15, fontWeight:700, color:d.color, fontFamily:"monospace" }}>{dispWeight}</div>
                            </div>
                          </div>
                        )}
                        {ex.note && <div style={{ fontSize:9, color:"#4A5A4A", marginTop:6, fontStyle:"italic" }}>{ex.note}</div>}
                        {ex.rest && !isWk1 && <div style={{ fontSize:9, color:"#3A4A3A", fontFamily:"monospace", marginTop:4 }}>rest {ex.rest}</div>}
                      </div>
                    );
                  })}
                  {d.cooldown && d.cooldown!=="—" && (
                    <div style={{ display:"flex", gap:8, padding:"9px 14px", background:"#1A0F0A", borderTop:"1px solid #1A2A1A" }}>
                      <div style={{ fontSize:9, fontFamily:"monospace", color:"#C8B560", letterSpacing:2, flexShrink:0, marginTop:1 }}>COOL-DOWN</div>
                      <div style={{ fontSize:11, color:"#7A6A4A" }}>{d.cooldown}</div>
                    </div>
                  )}
                  <div style={{ padding:"8px 14px", background:"#0A120A", borderTop:"1px solid #1A2A1A" }}>
                    <div style={{ fontSize:9, color:"#3A4A3A", fontFamily:"monospace" }}>Built for consistency, not exhaustion · Never miss twice</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── 📈 PROGRESS ── */}
        {tab==="progress" && (
          <div>
            {/* Body weight */}
            <div style={{ background:"#0F170F", borderRadius:12, padding:"14px 14px", marginBottom:14, border:"1px solid #1A2A1A" }}>
              <div style={{ fontSize:11, color:"#4A9A4A", fontFamily:"monospace", letterSpacing:2, marginBottom:10 }}>⚖ BODY WEIGHT (lbs)</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:8 }}>
                {["w1","w2","w3","w4"].map((wk,i) => (
                  <div key={wk}>
                    <div style={{ fontSize:9, color:"#4A5A4A", fontFamily:"monospace", marginBottom:4 }}>WK {i+1}</div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={bodyWeight[wk]}
                      onChange={e => {
                        const val = e.target.value;
                        setBodyWeight(prev => ({ ...prev, [wk]: val }));
                      }}
                      placeholder="e.g. 130"
                      style={{ width:"100%", background:"#1A2A1A", border:"1px solid #3A4A3A", borderRadius:6, padding:"10px 4px", color:"#E8E4D8", fontFamily:"monospace", fontSize:15, fontWeight:700, textAlign:"center", boxSizing:"border-box", WebkitAppearance:"none" }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ fontSize:10, color:"#4A5A4A" }}>Target: +0.5–1 lb/week · Same day, same time</div>
            </div>

            {/* Lift log synced */}
            <div style={{ background:"#0F170F", borderRadius:12, padding:"14px 14px", marginBottom:14, border:"1px solid #1A2A1A" }}>
              <div style={{ fontSize:11, color:"#5A8ACA", fontFamily:"monospace", letterSpacing:2, marginBottom:4 }}>🏋 LIFT LOG — SYNCED TO WORKOUTS</div>
              <div style={{ fontSize:10, color:"#4A5A4A", marginBottom:10 }}>Enter Week 1 in Workouts tab → Sets, Reps, and Target auto-calculate</div>
              <div style={{ display:"flex", gap:5, marginBottom:12, overflowX:"auto" }}>
                {WORKOUT_SPLIT.filter(d=>d.label!=="Optional"&&d.label!=="Rest").map((d) => {
                  const idx = WORKOUT_SPLIT.indexOf(d);
                  return (
                    <button key={d.day} onClick={() => setActiveDay(idx)} style={{
                      flexShrink:0, padding:"5px 10px", border:`1px solid ${idx===activeDay?d.color:"#1A2A1A"}`,
                      borderRadius:6, background:idx===activeDay?d.color+"22":"transparent",
                      color:idx===activeDay?d.color:"#4A5A4A", cursor:"pointer",
                      fontFamily:"monospace", fontSize:9, fontWeight:700
                    }}>{d.day} {d.label}</button>
                  );
                })}
              </div>
              {/* Week selector */}
              <div style={{ display:"flex", gap:0, marginBottom:10, borderBottom:"1px solid #1A2A1A" }}>
                {[0,1,2,3].map(wi => {
                  const d = WORKOUT_SPLIT[activeDay];
                  return (
                    <button key={wi} onClick={() => setActiveWeek(wi)} style={{
                      flex:1, padding:"7px 4px", border:"none",
                      borderBottom:`3px solid ${activeWeek===wi?d.color:"transparent"}`,
                      background:"transparent", color:activeWeek===wi?d.color:"#4A5A4A",
                      cursor:"pointer", fontFamily:"monospace", fontSize:9, fontWeight:activeWeek===wi?700:400
                    }}>WK {wi+1}</button>
                  );
                })}
              </div>
              {(() => {
                const d = WORKOUT_SPLIT[activeDay];
                return d.exercises.map((ex,i) => {
                  const targets = getWeekTargets(d.day, ex.name, ex.type, ex.default);
                  const thisWeekTarget = targets[activeWeek];
                  const parsed = thisWeekTarget && thisWeekTarget.match(/^(.+)[×x](\d+)$/i);
                  const dispWeight = parsed ? parsed[1] : thisWeekTarget;
                  const tagStyle = TAG_COLORS[ex.tag] || TAG_COLORS.Body;
                  return (
                    <div key={i} style={{ padding:"12px 10px", background:i%2===0?"#0F170F":"#0A120A", borderBottom:"1px solid #1A2A1A" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8, flexWrap:"wrap" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#E8E4D8" }}>{ex.name}</div>
                        {ex.tag && <span style={{ background:tagStyle.bg, color:tagStyle.color, borderRadius:20, padding:"1px 8px", fontSize:8, fontFamily:"monospace", fontWeight:700, border:`1px solid ${tagStyle.color}33` }}>{ex.tag}</span>}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                        <div style={{ background:"#0A120A", borderRadius:7, padding:"8px 6px", textAlign:"center", border:`1px solid ${d.color}33` }}>
                          <div style={{ fontSize:8, color:"#4A5A4A", fontFamily:"monospace", marginBottom:3 }}>SETS</div>
                          <div style={{ fontSize:15, fontWeight:700, color:d.color, fontFamily:"monospace" }}>{ex.sets||"—"}</div>
                        </div>
                        <div style={{ background:"#0A120A", borderRadius:7, padding:"8px 6px", textAlign:"center", border:`1px solid ${d.color}33` }}>
                          <div style={{ fontSize:8, color:"#4A5A4A", fontFamily:"monospace", marginBottom:3 }}>REPS</div>
                          <div style={{ fontSize:15, fontWeight:700, color:d.color, fontFamily:"monospace" }}>{ex.reps||"—"}</div>
                        </div>
                        <div style={{ background:"#0A120A", borderRadius:7, padding:"8px 6px", textAlign:"center", border:`1px solid ${d.color}44` }}>
                          <div style={{ fontSize:8, color:"#4A5A4A", fontFamily:"monospace", marginBottom:3 }}>WK{activeWeek+1} TARGET</div>
                          <div style={{ fontSize:15, fontWeight:700, color:d.color, fontFamily:"monospace" }}>{dispWeight}</div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* 90-day expectations */}
            <div style={{ fontSize:10, letterSpacing:3, color:"#6A8A5A", fontFamily:"monospace", marginBottom:10 }}>90-DAY EXPECTATIONS</div>
            {[
              { period:"30 Days",color:"#C8B560",items:["Routine feels normal","Strength noticeably improving","Mental resistance decreasing"] },
              { period:"60 Days",color:"#7AB87A",items:["Visible muscle development","Energy significantly up","First consulting steps taken"] },
              { period:"90 Days",color:"#4A9A4A",items:["Noticeable physique transformation","Discipline feels automatic","Income streams activated"] },
            ].map((p,i) => (
              <div key={i} style={{ display:"flex", gap:10, marginBottom:10 }}>
                <div style={{ flexShrink:0, background:p.color+"22", border:`1px solid ${p.color}44`, borderRadius:8, padding:"8px", textAlign:"center", width:58 }}>
                  <div style={{ fontSize:9, fontFamily:"monospace", fontWeight:700, color:p.color, lineHeight:1.3 }}>{p.period}</div>
                </div>
                <div style={{ background:"#0F170F", borderRadius:8, padding:"10px 12px", flex:1, border:"1px solid #1A2A1A" }}>
                  {p.items.map((item,j) => (
                    <div key={j} style={{ fontSize:11, color:"#6A7A5A", padding:"2px 0 2px 10px", position:"relative" }}>
                      <span style={{ position:"absolute", left:0, color:p.color }}>›</span>{item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 📚 BOOKS ── */}
        {tab==="books" && (
          <div>
            <div style={{ fontSize:9, fontFamily:"monospace", letterSpacing:3, color:"#6A8A5A", marginBottom:14 }}>LOCK-IN LIBRARY — BOOKS INTO ACTION</div>

            {/* Book selector */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
              {BOOKS.map((book,i) => (
                <button key={i} onClick={() => { setBookIdx(i); setBookDay(0); }} style={{
                  padding:"12px 10px", border:`2px solid ${bookIdx===i?book.color:"#1A2A1A"}`,
                  borderRadius:10, background:bookIdx===i?book.color+"22":"#0F170F",
                  cursor:"pointer", textAlign:"left", transition:"all 0.15s"
                }}>
                  <div style={{ fontSize:11, fontWeight:700, color:bookIdx===i?book.color:"#8A9A7A", lineHeight:1.3 }}>{book.title}</div>
                  <div style={{ fontSize:9, color:"#4A5A4A", marginTop:3 }}>{book.author}</div>
                </button>
              ))}
            </div>

            {/* Today's challenge */}
            <div style={{ background:`linear-gradient(135deg, ${currentBook.color}22, #0A120A)`, border:`1px solid ${currentBook.color}44`, borderRadius:14, padding:"20px 16px", marginBottom:16 }}>
              <div style={{ fontSize:9, fontFamily:"monospace", letterSpacing:3, color:currentBook.color, marginBottom:6 }}>TODAY'S CHALLENGE — {currentBook.title.toUpperCase()}</div>
              <div style={{ fontSize:20, fontWeight:700, color:"#E8E4D8", lineHeight:1.4, marginBottom:16 }}>"{currentChallenge}"</div>
              <button onClick={() => setBookDay(d => d+1)} style={{
                padding:"12px 20px", borderRadius:10, border:"none",
                background:currentBook.color, color:"#0A0F0A", cursor:"pointer",
                fontFamily:"monospace", fontSize:11, fontWeight:700, letterSpacing:1
              }}>COMPLETED → NEXT CHALLENGE</button>
            </div>

            {/* All challenges */}
            <div style={{ fontSize:9, fontFamily:"monospace", letterSpacing:3, color:"#6A8A5A", marginBottom:10 }}>ALL CHALLENGES — {currentBook.title.toUpperCase()}</div>
            {currentBook.challenges.map((ch,i) => (
              <div key={i} style={{ display:"flex", gap:12, padding:"12px 14px", background:i===bookDay%currentBook.challenges.length?currentBook.color+"11":"#0F170F", borderRadius:8, marginBottom:6, border:`1px solid ${i===bookDay%currentBook.challenges.length?currentBook.color+"44":"#1A2A1A"}` }}>
                <div style={{ fontFamily:"monospace", fontSize:11, color:currentBook.color, flexShrink:0, fontWeight:700 }}>{i+1}</div>
                <div style={{ fontSize:12, color:"#8A9A7A", lineHeight:1.5 }}>{ch}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── 💊 SUPPS ── */}
        {tab==="supps" && (
          <div>
            <div style={{ fontSize:9, fontFamily:"monospace", letterSpacing:3, color:"#6A8A5A", marginBottom:12 }}>CLEAN SUPPLEMENT SYSTEM</div>
            <div style={{ background:"#0A150A", border:"1px solid #2A4A2A", borderRadius:10, padding:"11px 13px", marginBottom:16 }}>
              <div style={{ fontSize:12, color:"#7AB87A", lineHeight:1.7 }}><strong style={{ color:"#4A9A4A" }}>Philosophy:</strong> Clean, plant-based, nothing that disrupts hormones or libido. Simple and sustainable.</div>
            </div>
            {SUPPLEMENTS.map((block,bi) => (
              <div key={bi} style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, fontFamily:"monospace", letterSpacing:3, color:block.color, marginBottom:8 }}>{block.time.toUpperCase()}</div>
                {block.items.map((item,ii) => (
                  <div key={ii} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", background:"#0F170F", borderRadius:10, marginBottom:6, border:`1px solid ${block.color}22`, borderLeft:`3px solid ${block.color}` }}>
                    <div style={{ fontWeight:600, fontSize:13, color:"#E8E4D8" }}>{item.name}</div>
                    <div style={{ background:block.color+"22", color:block.color, borderRadius:20, padding:"3px 10px", fontSize:10, fontFamily:"monospace", flexShrink:0 }}>{item.dose}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── 🎵 MUSIC ── */}
        {tab==="music" && (
          <div>
            <div style={{ fontSize:9, fontFamily:"monospace", letterSpacing:3, color:"#6A8A5A", marginBottom:14 }}>WORKOUT MUSIC LAUNCHER</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
              {["spotify","apple"].map(platform => (
                <button key={platform} onClick={() => setMusicPlatform(platform)} style={{
                  padding:"12px 8px", borderRadius:12,
                  border:`2px solid ${musicPlatform===platform?(platform==="spotify"?"#1DB954":"#FC3C44"):"#1A2A1A"}`,
                  background:musicPlatform===platform?(platform==="spotify"?"#1DB95422":"#FC3C4422"):"#0F170F",
                  cursor:"pointer", textAlign:"center"
                }}>
                  <div style={{ fontSize:11, fontFamily:"monospace", fontWeight:700, color:musicPlatform===platform?(platform==="spotify"?"#1DB954":"#FC3C44"):"#4A5A4A" }}>
                    {platform==="spotify"?"🎵 Spotify":"🍎 Apple Music"}
                  </div>
                </button>
              ))}
            </div>
            {MUSIC_SLOTS.map(slot => {
              const link = musicLinks[musicPlatform]?.[slot.id] || {};
              const hasUrl = !!link.url;
              const isEditing = editingMusic===`${musicPlatform}:${slot.id}`;
              const ac = musicPlatform==="spotify"?"#1DB954":"#FC3C44";
              return (
                <div key={slot.id} style={{ background:"#0F170F", borderRadius:12, overflow:"hidden", border:`1px solid ${hasUrl?ac+"33":"#1A2A1A"}`, marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:hasUrl?ac+"11":"transparent", borderLeft:`3px solid ${hasUrl?ac:"#2A3A2A"}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:18 }}>{slot.icon}</span>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13, color:"#E8E4D8" }}>{slot.label}</div>
                        <div style={{ fontSize:9, color:"#4A5A4A", fontFamily:"monospace" }}>{slot.time} · {slot.desc}</div>
                      </div>
                    </div>
                    {hasUrl && <div style={{ fontSize:9, fontFamily:"monospace", color:ac, background:ac+"22", borderRadius:20, padding:"2px 8px" }}>{link.name}</div>}
                  </div>
                  {hasUrl && !isEditing && (
                    <button onClick={() => launchMusic(link.url)} style={{ width:"100%", padding:"13px 14px", border:"none", background:`linear-gradient(90deg,${ac}22,${ac}11)`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:"50%", background:ac, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontWeight:700, fontSize:13, color:"#E8E4D8" }}>Open in {musicPlatform==="spotify"?"Spotify":"Apple Music"}</div>
                        <div style={{ fontSize:10, color:"#5A6A5A", marginTop:1 }}>{link.name} · Tap to launch</div>
                      </div>
                    </button>
                  )}
                  {isEditing ? (
                    <div style={{ padding:"12px 14px", borderTop:"1px solid #1A2A1A" }}>
                      {[["Playlist Name",musicEditName,setMusicEditName,"My Workout Mix"],["Link",musicEditUrl,setMusicEditUrl,musicPlatform==="spotify"?"https://open.spotify.com/playlist/...":"https://music.apple.com/..."]].map(([lbl,val,setter,ph]) => (
                        <div key={lbl} style={{ marginBottom:8 }}>
                          <div style={{ fontSize:9, color:"#4A5A4A", fontFamily:"monospace", marginBottom:4 }}>{lbl.toUpperCase()}</div>
                          <input value={val} onChange={e=>setter(e.target.value)} placeholder={ph}
                            style={{ width:"100%", background:"#0A120A", border:`1px solid ${ac}44`, borderRadius:6, padding:"8px 10px", color:"#E8E4D8", fontFamily:"monospace", fontSize:11, boxSizing:"border-box" }}/>
                        </div>
                      ))}
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => { if(musicEditUrl){ setMusicLinks(prev=>({...prev,[musicPlatform]:{...prev[musicPlatform],[slot.id]:{url:musicEditUrl,name:musicEditName||slot.label}}})); } setEditingMusic(null); }}
                          style={{ padding:"8px 16px", borderRadius:8, border:"none", background:ac, color:"#FFF", cursor:"pointer", fontFamily:"monospace", fontSize:11, fontWeight:700 }}>Save</button>
                        <button onClick={() => setEditingMusic(null)} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #2A3A2A", background:"transparent", color:"#6A7A5A", cursor:"pointer", fontFamily:"monospace", fontSize:11 }}>Cancel</button>
                        {hasUrl && <button onClick={() => { setMusicLinks(prev=>({...prev,[musicPlatform]:{...prev[musicPlatform],[slot.id]:{}}})); setEditingMusic(null); }} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #3A2A2A", background:"transparent", color:"#9A4A4A", cursor:"pointer", fontFamily:"monospace", fontSize:11 }}>Remove</button>}
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingMusic(`${musicPlatform}:${slot.id}`); setMusicEditUrl(link.url||""); setMusicEditName(link.name||""); }}
                      style={{ width:"100%", padding:"9px 14px", border:"none", borderTop:"1px solid #1A2A1A", background:"transparent", color:"#3A4A3A", cursor:"pointer", fontFamily:"monospace", fontSize:9, letterSpacing:1 }}>
                      {hasUrl?"✏ EDIT LINK":`+ ADD ${musicPlatform==="spotify"?"SPOTIFY":"APPLE MUSIC"} LINK`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── 📅 CALENDAR ── */}
        {tab==="calendar" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
              {[
                { label:`Elite Days ${calYear}`, value:yearElite, color:"#4A9A4A" },
                { label:"Active Days",            value:Object.entries(allScores).filter(([k,v])=>k.startsWith(String(calYear))&&getDayScore(v)>0).length, color:"#C8B560" },
                { label:"Discipline Rate",         value:`${discipline}%`, color:"#7A5A9A" },
              ].map((s,i) => (
                <div key={i} style={{ background:"#0F170F", borderRadius:10, padding:"12px 8px", border:"1px solid #1A2A1A", textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:700, color:s.color, fontFamily:"monospace" }}>{s.value}</div>
                  <div style={{ fontSize:8, color:"#4A5A4A", marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
              {[["#4A9A4A","Elite (90+)"],["#C8B560","Good (60–89)"],["#5A4A2A","Started"],["#1A2A1A","No data"]].map(([col,label]) => (
                <div key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:col }}/>
                  <div style={{ fontSize:9, color:"#5A6A5A" }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <button onClick={() => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}
                style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #1A2A1A", background:"#0F170F", color:"#6A7A5A", cursor:"pointer", fontFamily:"monospace", fontSize:10 }}>←</button>
              <div style={{ fontFamily:"monospace", fontSize:12, color:"#C8B560", fontWeight:700 }}>{MONTH_FULL[calMonth]} {calYear}</div>
              <button onClick={() => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}
                style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #1A2A1A", background:"#0F170F", color:"#6A7A5A", cursor:"pointer", fontFamily:"monospace", fontSize:10 }}>→</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:2 }}>
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                <div key={d} style={{ textAlign:"center", fontSize:8, fontFamily:"monospace", color:"#3A4A3A", padding:"3px 0" }}>{d}</div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:14 }}>
              {Array.from({length:getFirstDay(calYear,calMonth)}).map((_,i)=><div key={`e${i}`}/>)}
              {Array.from({length:getDaysInMonth(calYear,calMonth)}).map((_,i) => {
                const d=i+1, key=dayKey(calYear,calMonth,d);
                const status=getDayStatus(key), isToday=key===TODAY, isSel=selectedCalDay===key;
                const score = getDayScore(allScores[key]||{});
                return (
                  <button key={d} onClick={() => { setSelectedCalDay(isSel?null:key); setNoteInput(calNotes[key]||""); }} style={{
                    aspectRatio:"1/1", borderRadius:6, border:`2px solid ${isSel?"#C8B560":isToday?"#4A9A4A":"transparent"}`,
                    background:getDayColor(status)||"#0F170F", cursor:"pointer",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"
                  }}>
                    <div style={{ fontSize:10, fontFamily:"monospace", color:status==="elite"?"#E8E4D8":status==="good"?"#0A0F0A":"#6A7A5A", fontWeight:isToday?700:400 }}>{d}</div>
                    {score>0&&<div style={{ fontSize:7, fontFamily:"monospace", color:status==="elite"?"#E8E4D8":status==="good"?"#0A0F0A":"#8A9A7A" }}>{score}</div>}
                  </button>
                );
              })}
            </div>
            {selectedCalDay && (
              <div style={{ background:"#0F170F", borderRadius:12, padding:"14px 14px", border:"1px solid #2A3A2A", marginBottom:12 }}>
                <div style={{ fontSize:9, color:"#5A6A5A", fontFamily:"monospace", letterSpacing:2, marginBottom:6 }}>{selectedCalDay} · SCORE: {getDayScore(allScores[selectedCalDay]||{})}</div>
                <div style={{ fontSize:9, color:"#4A5A4A", marginBottom:5 }}>COMPLETED TASKS</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                  {SCORE_CATEGORIES.flatMap(cat => cat.items.filter(item => allScores[selectedCalDay]?.[`${cat.id}:${item.id}`])).map(item => (
                    <span key={item.id} style={{ background:"#1A2A1A", borderRadius:20, padding:"2px 8px", fontSize:9, color:"#7AB87A", fontFamily:"monospace" }}>{item.label}</span>
                  ))}
                </div>
                <textarea value={noteInput} onChange={e=>setNoteInput(e.target.value)} placeholder="Add a note for this day..."
                  style={{ width:"100%", background:"#0A120A", border:"1px solid #2A3A2A", borderRadius:8, padding:"9px 10px", color:"#E8E4D8", fontSize:12, fontFamily:"Georgia,serif", resize:"vertical", minHeight:60, boxSizing:"border-box" }}/>
                <div style={{ display:"flex", gap:8, marginTop:7 }}>
                  <button onClick={() => setCalNotes(p=>({...p,[selectedCalDay]:noteInput}))}
                    style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#4A9A4A", color:"#E8E4D8", cursor:"pointer", fontFamily:"monospace", fontSize:10, fontWeight:700 }}>Save</button>
                  {calNotes[selectedCalDay] && <button onClick={() => { setCalNotes(p=>{const n={...p};delete n[selectedCalDay];return n;}); setNoteInput(""); }}
                    style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #3A2A2A", background:"transparent", color:"#9A4A4A", cursor:"pointer", fontFamily:"monospace", fontSize:10 }}>Delete</button>}
                </div>
              </div>
            )}
            <div style={{ fontSize:9, letterSpacing:3, color:"#5A7A5A", fontFamily:"monospace", marginBottom:10 }}>FULL YEAR {calYear}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
              {MONTHS.map((month,mi) => {
                const days=getDaysInMonth(calYear,mi), firstDay=getFirstDay(calYear,mi);
                const elite=Array.from({length:days}).filter((_,i)=>getDayStatus(dayKey(calYear,mi,i+1))==="elite").length;
                return (
                  <button key={mi} onClick={() => setCalMonth(mi)} style={{ background:"#0F170F", borderRadius:10, padding:"9px 10px", border:`1px solid ${calMonth===mi?"#C8B560":"#1A2A1A"}`, cursor:"pointer", textAlign:"left" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <div style={{ fontFamily:"monospace", fontSize:9, color:calMonth===mi?"#C8B560":"#6A7A5A", fontWeight:700 }}>{month}</div>
                      <div style={{ fontSize:8, color:"#4A9A4A", fontFamily:"monospace" }}>{elite} elite</div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                      {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                      {Array.from({length:days}).map((_,i)=>{
                        const status=getDayStatus(dayKey(calYear,mi,i+1));
                        return <div key={i} style={{ height:7, borderRadius:2, background:getDayColor(status)||"#1A2A1A", opacity:status==="none"?0.3:1 }}/>;
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, maxWidth:820, margin:"0 auto", background:"#0A0F0A", borderTop:"1px solid #1A2A1A", padding:"8px 18px", textAlign:"center" }}>
        <div style={{ fontFamily:"monospace", fontSize:8, color:"#2A3A2A", letterSpacing:2 }}>EXECUTE DAILY · NOT PERFECTLY — CONSISTENTLY · YOU ALREADY WON</div>
      </div>
    </div>
  );
}
