// SAMPLE DATA. Every niche, caption, creator and handle here is fictional and hand-written for the
// prototype. Nothing is pulled from Instagram, YouTube or any real account.

export type Hook = "POV" | "Cold open" | "Hot take" | "Question" | "Number list" | "Day N series" | "Slow intro";
export type Format = "Skit" | "Tutorial" | "Talking head" | "Meme edit" | "Before/after" | "Text on b-roll" | "Vlog";
export type Audio = "Trending sound" | "Original audio" | "Voiceover" | "Remix";

export type Niche = { id: string; label: string; effect: number; hue: number };

export const NICHES: Niche[] = [
  { id: "comedy", label: "Comedy", effect: 0.35, hue: 2 },
  { id: "food", label: "Food", effect: 0.2, hue: 24 },
  { id: "pets", label: "Pets", effect: 0.3, hue: 38 },
  { id: "cricket", label: "Cricket", effect: 0.25, hue: 140 },
  { id: "money", label: "Money", effect: 0.15, hue: 160 },
  { id: "beauty", label: "Beauty", effect: 0.1, hue: 330 },
  { id: "dance", label: "Dance", effect: 0.1, hue: 290 },
  { id: "travel", label: "Travel", effect: 0.05, hue: 195 },
  { id: "gym", label: "Fitness", effect: 0, hue: 12 },
  { id: "tech", label: "Tech", effect: -0.05, hue: 215 },
  { id: "music", label: "Music", effect: -0.1, hue: 260 },
  { id: "study", label: "Study", effect: -0.15, hue: 50 },
];

export const HOOK_EFFECT: Record<Hook, number> = {
  "Cold open": 0.25, POV: 0.2, "Hot take": 0.15, "Number list": 0.05, Question: 0, "Day N series": -0.05, "Slow intro": -0.35,
};
export const FORMAT_EFFECT: Record<Format, number> = {
  Skit: 0.35, "Meme edit": 0.25, "Before/after": 0.2, Tutorial: 0.1, "Text on b-roll": 0, "Talking head": -0.15, Vlog: -0.25,
};
export const AUDIO_EFFECT: Record<Audio, number> = {
  "Trending sound": 0.15, Remix: 0.1, "Original audio": 0.05, Voiceover: 0,
};
export const LENGTH_BUCKETS = [
  { label: "≤10s", max: 10, effect: 0.15 },
  { label: "11–20s", max: 20, effect: 0.2 },
  { label: "21–35s", max: 35, effect: 0 },
  { label: "36–60s", max: 60, effect: -0.25 },
  { label: "60s+", max: 999, effect: -0.4 },
];
export const lengthBucket = (s: number) => LENGTH_BUCKETS.find((b) => s <= b.max)!;

type C = [caption: string, hook: Hook, format: Format];

export const CAPTIONS: Record<string, C[]> = {
  comedy: [
    ["POV: your mom finds the Swiggy bill", "POV", "Skit"],
    ["Every group trip has this one friend", "Cold open", "Skit"],
    ["When the boss says 'quick call'", "POV", "Skit"],
    ["Ranking office excuses, worst to best", "Number list", "Talking head"],
    ["Day 12 of acting like my dad until he notices", "Day N series", "Skit"],
    ["So here's a story about my landlord", "Slow intro", "Talking head"],
  ],
  food: [
    ["2-minute noodles, restaurant style", "Cold open", "Tutorial"],
    ["Street-style chole at home, no pressure cooker", "Number list", "Tutorial"],
    ["Hot take: filter coffee beats every cold brew", "Hot take", "Talking head"],
    ["Rating every chai stall on one road", "Day N series", "Vlog"],
    ["What ₹100 gets you at a dhaba", "Question", "Vlog"],
    ["The ghee trick nobody tells you", "Cold open", "Before/after"],
  ],
  pets: [
    ["POV: you said the word 'walk' by accident", "POV", "Skit"],
    ["Rescue pup, day 1 vs day 60", "Cold open", "Before/after"],
    ["My cat reviews my outfits", "Cold open", "Meme edit"],
    ["3 signs your dog is bored", "Number list", "Tutorial"],
    ["Is my dog smarter than a toddler?", "Question", "Vlog"],
  ],
  cricket: [
    ["Every gully cricket umpire ever", "POV", "Skit"],
    ["That last-over finish, frame by frame", "Cold open", "Meme edit"],
    ["Hot take: Test cricket is the best format", "Hot take", "Talking head"],
    ["Bowling a yorker in slow motion", "Number list", "Tutorial"],
    ["Rating every stadium snack I tried", "Day N series", "Vlog"],
  ],
  money: [
    ["Hot take: your SIP is not a personality", "Hot take", "Talking head"],
    ["3 money rules I wish I knew at 21", "Number list", "Text on b-roll"],
    ["What ₹50k salary really buys in Bengaluru", "Question", "Text on b-roll"],
    ["POV: the EMI date hits", "POV", "Skit"],
    ["Let me explain compounding slowly", "Slow intro", "Talking head"],
  ],
  beauty: [
    ["Drugstore vs luxury, same face", "Cold open", "Before/after"],
    ["3 kajal tricks for hooded eyes", "Number list", "Tutorial"],
    ["Hot take: 10-step skincare is a scam", "Hot take", "Talking head"],
    ["Wedding guest look in 60 seconds", "Cold open", "Before/after"],
    ["Day 30 of no makeup at work", "Day N series", "Vlog"],
  ],
  dance: [
    ["The hook step everyone gets wrong", "Cold open", "Tutorial"],
    ["POV: the DJ plays your song at the sangeet", "POV", "Skit"],
    ["Learning one trend a day, day 9", "Day N series", "Vlog"],
    ["Same choreo, three speeds", "Cold open", "Meme edit"],
    ["Is this the hardest step of the year?", "Question", "Tutorial"],
  ],
  travel: [
    ["The ₹3,000 weekend nobody talks about", "Cold open", "Text on b-roll"],
    ["POV: the overnight train has Wi-Fi", "POV", "Skit"],
    ["5 hill towns without the crowds", "Number list", "Text on b-roll"],
    ["Hot take: Goa is better in the monsoon", "Hot take", "Talking head"],
    ["So we missed our flight, here's what happened", "Slow intro", "Vlog"],
  ],
  gym: [
    ["Gym crush notices you, part 3", "POV", "Skit"],
    ["Push-up form, fixed in 10 seconds", "Cold open", "Before/after"],
    ["Hot take: you don't need protein powder", "Hot take", "Talking head"],
    ["Day 45 of 100 pull-ups a day", "Day N series", "Vlog"],
    ["4 exercises for desk-job backs", "Number list", "Tutorial"],
  ],
  tech: [
    ["This phone setting saves 2 hours a day", "Cold open", "Tutorial"],
    ["POV: you explain Wi-Fi to your parents", "POV", "Skit"],
    ["Is the ₹15k phone actually enough?", "Question", "Talking head"],
    ["5 apps I deleted this year", "Number list", "Text on b-roll"],
    ["Unboxing, but slowly, with context", "Slow intro", "Vlog"],
  ],
  music: [
    ["Sitar cover of the song you hum all day", "Cold open", "Tutorial"],
    ["Same melody, five decades", "Cold open", "Meme edit"],
    ["Hot take: lo-fi killed the album", "Hot take", "Talking head"],
    ["Writing a song a day, day 21", "Day N series", "Vlog"],
    ["Let me tell you how this raga works", "Slow intro", "Talking head"],
  ],
  study: [
    ["The 25-minute trick toppers use", "Cold open", "Text on b-roll"],
    ["POV: it's the night before the exam", "POV", "Skit"],
    ["3 note-taking systems compared", "Number list", "Tutorial"],
    ["Day 60 of studying 10 hours", "Day N series", "Vlog"],
    ["Does music help you study?", "Question", "Talking head"],
  ],
};

export type Creator = { handle: string; niche: string; followers: number; blurb: string };

export const CREATORS: Creator[] = [
  { handle: "twominuteskits", niche: "comedy", followers: 1_840_000, blurb: "Office and family skits" },
  { handle: "aunty.network", niche: "comedy", followers: 92_000, blurb: "Neighbourhood gossip characters" },
  { handle: "tadkatheory", niche: "food", followers: 640_000, blurb: "Fast home recipes" },
  { handle: "dhaba.diaries", niche: "food", followers: 38_000, blurb: "Highway food reviews" },
  { handle: "indie.dog.club", niche: "pets", followers: 410_000, blurb: "Rescue dogs and their chaos" },
  { handle: "catsofthe.balcony", niche: "pets", followers: 21_000, blurb: "Two cats, one balcony" },
  { handle: "gully.replays", niche: "cricket", followers: 1_120_000, blurb: "Match edits and gully skits" },
  { handle: "nets.and.notes", niche: "cricket", followers: 54_000, blurb: "Coaching drills" },
  { handle: "paisa.plain", niche: "money", followers: 780_000, blurb: "Personal finance, no jargon" },
  { handle: "chai.and.charts", niche: "money", followers: 47_000, blurb: "Markets explained over chai" },
  { handle: "glowlab.daily", niche: "beauty", followers: 520_000, blurb: "Budget makeup tests" },
  { handle: "kajal.kit", niche: "beauty", followers: 16_000, blurb: "Eye looks for every shape" },
  { handle: "stepsquad.in", niche: "dance", followers: 2_300_000, blurb: "Trend choreography" },
  { handle: "sangeet.sessions", niche: "dance", followers: 73_000, blurb: "Wedding dance tutorials" },
  { handle: "backpack.budget", niche: "travel", followers: 330_000, blurb: "Cheap weekend trips" },
  { handle: "sleeper.class", niche: "travel", followers: 12_000, blurb: "Train journeys, start to end" },
  { handle: "deadlift.diaries", niche: "gym", followers: 270_000, blurb: "Strength and form fixes" },
  { handle: "deskjob.mobility", niche: "gym", followers: 29_000, blurb: "Stretches for office backs" },
  { handle: "gadgetghar", niche: "tech", followers: 950_000, blurb: "Phones and settings" },
  { handle: "parents.vs.wifi", niche: "tech", followers: 41_000, blurb: "Tech help for families" },
  { handle: "lofi.ragas", niche: "music", followers: 160_000, blurb: "Classical meets lo-fi" },
  { handle: "one.song.a.day", niche: "music", followers: 8_400, blurb: "Daily songwriting" },
  { handle: "topper.tactics", niche: "study", followers: 610_000, blurb: "Exam and focus tips" },
  { handle: "notes.by.night", niche: "study", followers: 19_000, blurb: "Aesthetic study vlogs" },
];

// Deep Cuts: long-tail niches where a breakout is rare. Fictional micro-creators.
export const DEEP_CUTS: { caption: string; handle: string; tag: string }[] = [
  { caption: "Restoring a 1970s transistor radio", handle: "valve.and.knob", tag: "Repair" },
  { caption: "Kathakali make-up, start to finish", handle: "green.face.studio", tag: "Craft" },
  { caption: "Rescuing a bonsai from a scrap shop", handle: "tiny.banyan", tag: "Plants" },
  { caption: "Competitive speed-folding of sarees", handle: "pleat.club", tag: "Oddly specific" },
  { caption: "Mapping every stepwell in one district", handle: "baoli.maps", tag: "History" },
  { caption: "Hand-painting truck art letters", handle: "horn.ok.please", tag: "Craft" },
  { caption: "Sound of 40 different pressure cookers", handle: "whistle.archive", tag: "ASMR" },
  { caption: "Fixing a kid's cycle with only jugaad", handle: "jugaad.garage", tag: "Repair" },
  { caption: "Origami elephants from bus tickets", handle: "ticket.fold", tag: "Craft" },
  { caption: "Cataloguing pigeon breeds of Old Delhi", handle: "kabootar.ledger", tag: "Animals" },
  { caption: "Grandma rates Gen Z slang", handle: "naani.decides", tag: "Family" },
  { caption: "A day sorting a library's lost-and-found", handle: "shelf.life.in", tag: "Slice of life" },
  { caption: "Brewing kombucha from leftover chai", handle: "ferment.lab.mumbai", tag: "Food science" },
  { caption: "Calligraphy on fallen peepal leaves", handle: "leaf.ink", tag: "Craft" },
  { caption: "Reviewing railway platform water taps", handle: "platform.critic", tag: "Oddly specific" },
  { caption: "Building a sitar from a gourd", handle: "gourd.and.string", tag: "Music" },
  { caption: "Monsoon frog chorus, 8 hours compressed", handle: "night.field.audio", tag: "Nature" },
  { caption: "Tailor explains every collar type", handle: "collar.theory", tag: "Fashion" },
];
