import React, { useState, useEffect, useRef } from "react";
import {
  Ticket, Sparkles, Smile, Info, Heart, Copy, Check, Gift, HelpCircle,
  Coffee, Film, Send, Compass, Flame, Zap, CheckCircle2, RefreshCw, Download
} from "lucide-react";

interface TicketTheme {
  name: string;
  emoji: string;
  accentColor: string;
  textColor: string;
  videoId: string;
  vibeText: string;
}

const TICKET_THEMES: TicketTheme[] = [
  {
    name: "Cozy Lofi Study",
    emoji: "☕",
    accentColor: "bg-[#FFD2D2]",
    textColor: "text-black",
    videoId: "Aj-nPW-VEuo",
    vibeText: "Relaxing cozy anime beats & ambient rain."
  },
  {
    name: "Tokyo Neon Wander",
    emoji: "🌧️",
    accentColor: "bg-[#D2E9FF]",
    textColor: "text-black",
    videoId: "Aj-nPW-VEuo",
    vibeText: "Binaural night walk through Shibuya in 4K."
  },
  {
    name: "Baby Red Pandas",
    emoji: "🐼",
    accentColor: "bg-[#FFE8D2]",
    textColor: "text-black",
    videoId: "Aj-nPW-VEuo",
    vibeText: "Cute baby pandas playing in the winter snow."
  },
  {
    name: "Fluffy Pancakes DIY",
    emoji: "🍳",
    accentColor: "bg-[#D2FFD2]",
    textColor: "text-black",
    videoId: "Aj-nPW-VEuo",
    vibeText: "Step-by-step Japanese soufflé baking party."
  }
];

interface MockSyncShowcaseProps {
  selectedPresetId?: string;
  onSelectPreset?: (id: string) => void;
}

export default function MockSyncShowcase({ selectedPresetId, onSelectPreset }: MockSyncShowcaseProps) {
  const [activeTab, setActiveTab] = useState<"ticket" | "vibe" | "jitter">("ticket");

  // TAB 1: Ticket Creator State
  const [inviteeName, setInviteeName] = useState("");
  const [secretMessage, setSecretMessage] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<TicketTheme>(TICKET_THEMES[0]);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Auto-sync preset selection with Ticket theme selection
  const handleThemeSelect = (theme: TicketTheme) => {
    setSelectedTheme(theme);
    if (onSelectPreset) {
      onSelectPreset(theme.videoId);
    }
  };

  // Sync back if selectedPresetId changes externally
  useEffect(() => {
    if (selectedPresetId) {
      const match = TICKET_THEMES.find(t => t.videoId === selectedPresetId);
      if (match && match.name !== selectedTheme.name) {
        setSelectedTheme(match);
      }
    }
  }, [selectedPresetId]);

  const getInviteText = () => {
    const person = inviteeName.trim() || "my favorite person";
    const msg = secretMessage.trim() ? `"${secretMessage.trim()}"` : "Let's hang out and watch some awesome streams together!";
    return `🎟️ LOVE STREAM WATCH TICKET 🎟️\n\nTo: ${person}\nTheme: ${selectedTheme.emoji} ${selectedTheme.name}\nMessage: ${msg}\n\nJoin my private watch party here: ${window.location.origin}`;
  };

  const handleCopyInvite = async () => {
    const inviteText = getInviteText();
    const shareData = {
      title: "LoveStream Watch Ticket 🎟️",
      text: inviteText,
      url: window.location.origin,
    };

    // On mobile/tablet: use native share sheet if supported (works on HTTP too!)
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share(shareData);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2500);
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return; // user cancelled the share sheet
      }
    }

    // Otherwise use clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(inviteText);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2500);
        return;
      } catch {
        // Fall through to execCommand fallback
      }
    }

    // Legacy fallback
    try {
      const el = document.createElement("textarea");
      el.value = inviteText;
      el.setAttribute("readonly", "");
      el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;";
      document.body.appendChild(el);
      el.focus();
      el.select();
      el.setSelectionRange(0, el.value.length);
      const success = document.execCommand("copy");
      document.body.removeChild(el);
      if (success) {
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2500);
      }
    } catch (err) {
      console.warn("Clipboard copy failed", err);
    }
  };

  const handleDownloadTicket = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const themeName = selectedTheme.name;
    const emoji = selectedTheme.emoji;
    const invitee = inviteeName.trim() || "MY FAVORITE PERSON";
    const msg = secretMessage.trim() ? `"${secretMessage.trim()}"` : "Let's watch synchronized together tonight! 🍿";

    let themeHex = "#FFD2D2";
    if (themeName.includes("Tokyo")) themeHex = "#D2E9FF";
    else if (themeName.includes("Pandas")) themeHex = "#FFE8D2";
    else if (themeName.includes("Pancakes")) themeHex = "#D2FFD2";

    ctx.fillStyle = "#FCFBF9";
    ctx.fillRect(0, 0, 1200, 640);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1200, 640);

    ctx.fillStyle = "#FCFBF9";
    ctx.fillRect(12, 12, 838, 616);

    ctx.fillStyle = themeHex;
    ctx.fillRect(850, 12, 338, 616);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 1188, 628);

    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(850, 12);
    ctx.lineTo(850, 628);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.arc(850, 0, 32, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(850, 640, 32, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.textBaseline = "top";

    ctx.font = "bold 20px 'Courier New', Courier, monospace";
    ctx.fillText("🎟️ ADMIT ONE WATCHER", 60, 55);

    ctx.font = "bold 18px 'Courier New', Courier, monospace";
    ctx.fillStyle = "#777777";
    ctx.fillText("#LS-889-SYNC", 650, 55);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(60, 95);
    ctx.lineTo(790, 95);
    ctx.stroke();

    ctx.fillStyle = "#777777";
    ctx.font = "900 16px 'Courier New', Courier, monospace";
    ctx.fillText("TO:", 60, 125);

    ctx.fillStyle = "#000000";
    ctx.font = "900 52px Arial, sans-serif";
    ctx.fillText(invitee.toUpperCase(), 60, 155);

    ctx.fillStyle = "#777777";
    ctx.font = "900 16px 'Courier New', Courier, monospace";
    ctx.fillText("WATCH DATE & THEME:", 60, 245);

    ctx.fillStyle = "#000000";
    ctx.font = "bold 32px Arial, sans-serif";
    ctx.fillText(`TONIGHT • ${emoji} ${themeName}`, 60, 275);

    ctx.fillStyle = "#777777";
    ctx.font = "900 16px 'Courier New', Courier, monospace";
    ctx.fillText("PERSONAL HOST NOTE:", 60, 345);

    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.fillRect(60, 380, 730, 95);
    ctx.strokeRect(60, 380, 730, 95);

    ctx.fillStyle = "#333333";
    ctx.font = "italic 22px Arial, sans-serif";
    ctx.fillText(msg, 85, 412);

    const barcodeY = 510;
    const barcodeHeight = 35;
    ctx.fillStyle = "#000000";
    const barcodePattern = [2, 4, 1, 3, 1, 5, 2, 3, 1, 4, 1, 6, 2, 3, 1, 4, 2, 2, 1, 5, 3, 2, 1, 4, 1, 4, 2, 3, 1, 5, 2, 4];
    let currentX = 60;
    barcodePattern.forEach((width, index) => {
      if (index % 2 === 0) {
        ctx.fillRect(currentX, barcodeY, width * 3.5, barcodeHeight);
      }
      currentX += width * 3.5;
    });

    ctx.fillStyle = "#777777";
    ctx.font = "bold 13px 'Courier New', Courier, monospace";
    ctx.fillText("LOVESTREAM-HD-SYNC-SECURE-SOCKET", 260, barcodeY + barcodeHeight + 10);

    ctx.save();
    ctx.fillStyle = "#000000";

    ctx.font = "96px Arial, sans-serif";
    ctx.fillText(emoji, 970, 70);

    ctx.fillStyle = "#000000";
    ctx.font = "900 24px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(themeName.toUpperCase(), 1020, 210);

    ctx.fillStyle = "#444444";
    ctx.font = "bold 16px 'Courier New', Courier, monospace";
    ctx.fillText("🎟️ ADMIT ONE STUB", 1020, 260);

    ctx.fillStyle = "#FF2E63";
    ctx.font = "900 28px Arial, sans-serif";
    ctx.fillText("LOVE WATCH PARTY", 1020, 310);

    const stubBarcodeY = 410;
    let stubCurrentX = 920;
    const stubBarcodePattern = [1, 3, 2, 4, 1, 5, 2, 3, 1, 4, 3, 1, 2, 4];
    stubBarcodePattern.forEach((width, index) => {
      if (index % 2 === 0) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(stubCurrentX, stubBarcodeY, width * 3, 50);
      }
      stubCurrentX += width * 3;
    });

    ctx.fillStyle = "#444444";
    ctx.font = "bold 12px 'Courier New', Courier, monospace";
    ctx.fillText("LS-STUB-889", 1020, stubBarcodeY + 65);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.download = `lovestream_ticket_${invitee.toLowerCase().replace(/\s+/g, "_")}.png`;
    link.href = dataUrl;
    link.click();
  };

  // TAB 2: Vibe & Snacks State
  const [selectedSnack, setSelectedSnack] = useState<string>("🍿 Popcorn Bowl");
  const [selectedVibe, setSelectedVibe] = useState<string>("Cozy & Quiet");

  const getVibeRules = () => {
    if (selectedVibe === "Cozy & Quiet") {
      return [
        "Take a bite of your snack every time a calming wave sound plays.",
        "Use the whisper chat to talk about your favorite chill memories.",
        "Send a soft 🌸 emoji every time the scene transitions."
      ];
    } else if (selectedVibe === "Hyped & Chatty") {
      return [
        "First person to type a reaction in the chat gets to pick the next video!",
        "Spam 🚀 or 🎉 emojis whenever anything cool or funny happens.",
        "Take a sip of your drink if a video clip makes both of you laugh."
      ];
    } else {
      return [
        "Turn the virtual volume up and enjoy the pure ambient focus together.",
        "Do a 10-second stretch each time you pause or change the stream.",
        "Type one thing you are grateful for during the stream break."
      ];
    }
  };

  // TAB 3: Socket Speed & Jitter Test State
  const [isTestingSpeed, setIsTestingSpeed] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [pingHistory, setPingHistory] = useState<number[]>([]);
  const [currentPing, setCurrentPing] = useState<number | null>(null);
  const [calculatedJitter, setCalculatedJitter] = useState<number | null>(null);
  const [averagePing, setAveragePing] = useState<number | null>(null);
  const [testLogs, setTestLogs] = useState<string[]>([]);

  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the terminal to the bottom as logs arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [testLogs]);

  const startJitterTest = () => {
    setIsTestingSpeed(true);
    setTestProgress(0);
    setPingHistory([]);
    setCurrentPing(null);
    setCalculatedJitter(null);
    setAveragePing(null);
    setTestLogs(["Initializing LoveStream duplex sync test...", "Establishing UDP socket handshakes..."]);

    const samples: number[] = [];
    const totalSteps = 10;
    let step = 0;

    const interval = setInterval(() => {
      step += 1;
      // Generate a simulated ping latency in ms between 14ms and 28ms with rare small spikes
      const spike = Math.random() > 0.85 ? Math.floor(Math.random() * 15) + 10 : 0;
      const ping = Math.floor(Math.random() * 6) + 14 + spike;
      samples.push(ping);

      setPingHistory([...samples]);
      setCurrentPing(ping);
      setTestProgress(Math.round((step / totalSteps) * 100));

      // Calculate consecutive jitter: D_i = |P_i - P_i-1|
      let jitterSum = 0;
      let count = 0;
      for (let i = 1; i < samples.length; i++) {
        jitterSum += Math.abs(samples[i] - samples[i - 1]);
        count++;
      }
      const currentJit = count > 0 ? Number((jitterSum / count).toFixed(2)) : 0;
      setCalculatedJitter(currentJit);

      const avgPing = Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1));
      setAveragePing(avgPing);

      const logs = [
        `Establishing UDP socket handshakes...`,
        ...samples.map((p, idx) => {
          let j = 0;
          if (idx > 0) j = Math.abs(p - samples[idx - 1]);
          return `[Packet ${idx + 1}] SECURE PING: ${p}ms | JITTER: ${j}ms`;
        })
      ];

      if (step >= totalSteps) {
        clearInterval(interval);
        setIsTestingSpeed(false);
        logs.push(`LoveStream Duplex connection grade: ${currentJit < 2.5 ? "S-TIER EXCELLENT" : currentJit < 5 ? "A-TIER STABLE" : "B-TIER WATCHABLE"}`);
        logs.push(`[Sync-OK] System clock synchronized with less than 1ms offset.`);
      } else {
        logs.push(`Ping test in progress... ${Math.round((step / totalSteps) * 100)}%`);
      }

      setTestLogs(logs);
    }, 250);
  };

  return (
    <div className="w-full flex flex-col gap-4 border-4 border-black bg-zinc-50 p-4 sm:p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden select-none">

      {/* Neo-brutalist Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-4 border-black pb-3 gap-2 bg-white -mx-4 -mt-4 p-4">
        <div className="flex items-center gap-2">
          <span className="bg-[#FF2E63] text-white border-2 border-black text-[10px] font-mono font-black px-2 py-0.5 uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            COMPANION
          </span>
          <h3 className="font-display font-black text-xs sm:text-sm uppercase tracking-tight text-black flex items-center gap-1.5">
            Party Planner & Ticket Hub <Ticket className="w-4 h-4 text-[#FF2E63]" />
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-zinc-600">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse border border-black"></span>
          <span>PLANNER ACTIVE</span>
        </div>
      </div>

      {/* Styled Tabs */}
      <div className="grid grid-cols-3 border-4 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-1 gap-1">
        <button
          onClick={() => setActiveTab("ticket")}
          className={`py-2 text-[10px] font-display font-black uppercase border-2 transition-all cursor-pointer text-center leading-none flex flex-col items-center justify-center gap-0.5 ${activeTab === "ticket"
              ? "bg-black text-white border-black"
              : "bg-white text-zinc-600 border-transparent hover:bg-zinc-100 hover:text-black"
            }`}
        >
          <span>1. Invite Maker</span>
          <span className="text-[7.5px] font-mono font-bold opacity-60">CRAFT TICKET</span>
        </button>
        <button
          onClick={() => setActiveTab("vibe")}
          className={`py-2 text-[10px] font-display font-black uppercase border-2 transition-all cursor-pointer text-center leading-none flex flex-col items-center justify-center gap-0.5 ${activeTab === "vibe"
              ? "bg-black text-white border-black"
              : "bg-white text-zinc-600 border-transparent hover:bg-zinc-100 hover:text-black"
            }`}
        >
          <span>2. Snack Rules</span>
          <span className="text-[7.5px] font-mono font-bold opacity-60">COZY PLANNER</span>
        </button>
        <button
          onClick={() => setActiveTab("jitter")}
          className={`py-2 text-[10px] font-display font-black uppercase border-2 transition-all cursor-pointer text-center leading-none flex flex-col items-center justify-center gap-0.5 ${activeTab === "jitter"
              ? "bg-black text-white border-black"
              : "bg-white text-zinc-600 border-transparent hover:bg-zinc-100 hover:text-black"
            }`}
        >
          <span>3. Jitter Speed</span>
          <span className="text-[7.5px] font-mono font-bold opacity-60">SOCKET SPEED</span>
        </button>
      </div>

      {/* Interactive Content Area */}
      <div className="min-h-[300px] flex flex-col justify-between">

        {/* TAB 1: RETRO INVITE TICKET CREATOR */}
        {activeTab === "ticket" && (
          <div className="flex flex-col gap-3.5 animate-fade-in">
            <div>
              <h4 className="font-display font-black text-[11px] sm:text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-[#FF2E63]" /> Retro Cinema Ticket Maker
              </h4>
              <p className="text-[9.5px] font-mono text-zinc-500 mt-0.5 leading-normal">
                Craft a stylized digital invite ticket. Selecting a card theme automatically pre-loads its video preset for your created watch room!
              </p>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-2 bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-mono font-bold text-black uppercase">Who are you inviting?</label>
                <input
                  type="text"
                  maxLength={16}
                  value={inviteeName}
                  onChange={(e) => setInviteeName(e.target.value)}
                  placeholder="Partner, Bestie, crush..."
                  className="border border-black bg-zinc-50 p-1.5 text-[10.5px] font-mono focus:outline-none focus:bg-white text-black"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-mono font-bold text-black uppercase">Secret Date Note:</label>
                <input
                  type="text"
                  maxLength={32}
                  value={secretMessage}
                  onChange={(e) => setSecretMessage(e.target.value)}
                  placeholder="e.g. Bring chips & popcorn!"
                  className="border border-black bg-zinc-50 p-1.5 text-[10.5px] font-mono focus:outline-none focus:bg-white text-black"
                />
              </div>
            </div>

            {/* Curated Theme Selectors */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-mono font-bold text-black uppercase">Select Watch Theme (Starts preset video):</span>
              <div className="grid grid-cols-4 gap-1.5">
                {TICKET_THEMES.map((theme) => {
                  const isSelected = selectedTheme.name === theme.name;
                  return (
                    <button
                      key={theme.name}
                      onClick={() => handleThemeSelect(theme)}
                      className={`p-1.5 border border-black flex flex-col items-center justify-center transition-all cursor-pointer relative ${isSelected
                          ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-102"
                          : "bg-white text-black hover:bg-zinc-100"
                        }`}
                    >
                      <span className="text-base">{theme.emoji}</span>
                      <span className="text-[7.5px] font-display font-black uppercase text-center mt-1 truncate w-full">
                        {theme.name.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rendered Retro Ticket */}
            <div className="bg-white border-4 border-black p-3.5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col gap-2.5">
              {/* Dotted side perforation cuts */}
              <div className="absolute top-1/2 left-0 w-3 h-6 bg-zinc-50 border-r-2 border-y-2 border-black -translate-y-1/2 rounded-r-full"></div>
              <div className="absolute top-1/2 right-0 w-3 h-6 bg-zinc-50 border-l-2 border-y-2 border-black -translate-y-1/2 rounded-l-full"></div>

              {/* Ticket header */}
              <div className="flex justify-between items-center px-2">
                <span className="text-[8px] font-mono font-black tracking-widest text-[#FF2E63] uppercase">
                  ADMIT ONE WATCHER
                </span>
                <span className="text-[8px] font-mono font-bold text-zinc-400">
                  #LS-889
                </span>
              </div>

              {/* Central dotted divider */}
              <div className="border-t-2 border-dashed border-black mx-1.5 my-0.5"></div>

              {/* Main Ticket Info */}
              <div className="flex items-center justify-between px-2.5 gap-2">
                <div className="min-w-0">
                  <div className="text-[8.5px] font-mono text-zinc-400 font-bold uppercase leading-tight">TO:</div>
                  <div className="text-xs font-display font-black text-black uppercase truncate leading-snug">
                    {inviteeName.trim() || "MY FAVORITE PERSON"}
                  </div>
                  <div className="text-[8.5px] font-mono text-zinc-400 font-bold uppercase leading-tight mt-1.5">WATCH DATE:</div>
                  <div className="text-[10px] font-display font-bold text-black uppercase leading-tight">
                    TONIGHT • {selectedTheme.emoji} {selectedTheme.name}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center bg-zinc-100 border border-black px-2 py-1 rotate-[3deg] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] max-w-[100px]">
                  <span className="text-[13px]">{selectedTheme.emoji}</span>
                  <span className="text-[7.5px] font-mono font-black text-[#FF2E63] text-center uppercase tracking-tighter truncate w-full mt-0.5">
                    {selectedTheme.name}
                  </span>
                </div>
              </div>

              {/* Message Block inside ticket */}
              <div className="bg-zinc-50 border border-black mx-2 p-1.5 text-center">
                <p className="text-[8.5px] font-mono italic text-zinc-600 leading-tight">
                  {secretMessage.trim() ? `"${secretMessage.trim()}"` : `"Let's watch synchronized together tonight! 🍿"`}
                </p>
              </div>

              {/* Barcode representation */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex gap-0.5 h-4 w-full justify-center opacity-75">
                  <span className="w-[1.5px] bg-black h-full"></span>
                  <span className="w-[3px] bg-black h-full"></span>
                  <span className="w-[1px] bg-black h-full"></span>
                  <span className="w-[2.5px] bg-black h-full"></span>
                  <span className="w-[1px] bg-black h-full"></span>
                  <span className="w-[4px] bg-black h-full"></span>
                  <span className="w-[1.5px] bg-black h-full"></span>
                  <span className="w-[2px] bg-black h-full"></span>
                  <span className="w-[1px] bg-black h-full"></span>
                  <span className="w-[3.5px] bg-black h-full"></span>
                </div>
                <span className="text-[7px] font-mono font-bold tracking-widest text-zinc-400">
                  LOVESTREAM-SYNC-SOCKET
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3.5">
              <button
                onClick={handleCopyInvite}
                className={`py-2.5 border-2 border-black font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${inviteCopied
                    ? "bg-green-500 text-white border-black"
                    : "bg-[#FF2E63] text-white border-black hover:bg-black hover:text-[#FF2E63]"
                  }`}
              >
                {inviteCopied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white animate-bounce" /> COPIED!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-white" /> COPY INVITATION
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadTicket}
                className="py-2.5 border-2 border-black font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none bg-[#facc15] text-black hover:bg-black hover:text-[#facc15]"
              >
                <Download className="w-4 h-4 text-black" /> DOWNLOAD TICKET
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: VIBE & SNACKS PARTY RULES */}
        {activeTab === "vibe" && (
          <div className="flex flex-col gap-3.5 animate-fade-in">
            <div>
              <h4 className="font-display font-black text-[11px] sm:text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-[#FF2E63]" /> Snack & Vibe Matcher
              </h4>
              <p className="text-[9.5px] font-mono text-zinc-500 mt-0.5">
                Coordinate your snacks and match the atmosphere vibe to unlock personalized watch party challenges!
              </p>
            </div>

            {/* Selections */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-mono font-black text-black uppercase">What snack do you have?</span>
                <select
                  value={selectedSnack}
                  onChange={(e) => setSelectedSnack(e.target.value)}
                  className="border-2 border-black bg-white p-1.5 text-[10.5px] font-mono text-black focus:outline-none"
                >
                  <option>🍿 Popcorn Bowl</option>
                  <option>🥤 Ice Bubble Tea</option>
                  <option>🍕 Cheesy Pizza Slice</option>
                  <option>🍪 Chocolate Cookies</option>
                  <option>🍵 Hot Matcha Tea</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-mono font-black text-black uppercase">Choose Watch Vibe:</span>
                <select
                  value={selectedVibe}
                  onChange={(e) => setSelectedVibe(e.target.value)}
                  className="border-2 border-black bg-white p-1.5 text-[10.5px] font-mono text-black focus:outline-none"
                >
                  <option>Cozy & Quiet</option>
                  <option>Hyped & Chatty</option>
                  <option>Zen & Mindful</option>
                </select>
              </div>
            </div>

            {/* Matches & Interactive Rules Card */}
            <div className="bg-white border-2 border-black p-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2.5">
              <div className="flex justify-between items-center border-b border-zinc-200 pb-1.5">
                <span className="text-[8px] font-mono font-black uppercase text-zinc-400 tracking-wider">
                  ACTIVATED CHALLENGE RULES
                </span>
                <span className="bg-[#facc15] text-black border border-black text-[7.5px] font-mono font-black px-1.5 py-0.5 uppercase">
                  {selectedVibe} VIBE
                </span>
              </div>

              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-300 p-2">
                <span className="text-2xl">{selectedSnack.split(" ")[0]}</span>
                <div>
                  <h5 className="font-display font-black text-[10.5px] text-black uppercase leading-tight">
                    Perfect Combo: {selectedSnack.split(" ")[1]} + {selectedVibe}
                  </h5>
                  <p className="text-[8.5px] font-mono text-zinc-500 uppercase font-bold mt-0.5">
                    Compatibility: 100% Locked & Harmonized
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <p className="text-[9.5px] font-mono text-zinc-600 font-bold">
                  Play these fun watch mini-challenges inside your LoveStream room:
                </p>
                <ul className="flex flex-col gap-1.5">
                  {getVibeRules().map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[10px] font-sans text-black leading-tight">
                      <span className="font-display font-black text-[#FF2E63] shrink-0">{idx + 1}.</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-zinc-500 bg-white p-2 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-0.5">
              <Info className="w-3.5 h-3.5 text-[#FF2E63] shrink-0" />
              <span>Agreeing on cozy room rules makes virtual streaming feel beautifully interactive!</span>
            </div>
          </div>
        )}

        {/* TAB 3: DUPLEX SOCKET CONNECTION JITTER TEST */}
        {activeTab === "jitter" && (
          <div className="flex flex-col gap-3.5 animate-fade-in">
            <div>
              <h4 className="font-display font-black text-[11px] sm:text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#FF2E63]" /> Duplex Jitter & Sync Ping Tester
              </h4>
              <p className="text-[9.5px] font-mono text-zinc-500 mt-0.5">
                Measure duplex WebSocket latency fluctuation and microsecond jitter variation to ensure ultra-smooth playback synchronization.
              </p>
            </div>

            {/* Test Status Dashboard */}
            {pingHistory.length > 0 ? (
              <div className="flex flex-col gap-3">
                {/* Latency Stats Grid */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-white border-2 border-black p-2 flex flex-col justify-center items-center text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-[7.5px] font-mono font-bold text-zinc-400 uppercase">AVG PING</span>
                    <span className="text-sm font-display font-black text-black mt-0.5">
                      {averagePing !== null ? `${averagePing}ms` : "---"}
                    </span>
                  </div>

                  <div className="bg-white border-2 border-black p-2 flex flex-col justify-center items-center text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-[7.5px] font-mono font-bold text-zinc-400 uppercase">JITTER</span>
                    <span className="text-sm font-display font-black text-[#FF2E63] mt-0.5">
                      {calculatedJitter !== null ? `${calculatedJitter}ms` : "---"}
                    </span>
                  </div>

                  <div className="bg-white border-2 border-black p-2 flex flex-col justify-center items-center text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-[7.5px] font-mono font-bold text-zinc-400 uppercase">LOSS</span>
                    <span className="text-sm font-display font-black text-green-600 mt-0.5">0.0%</span>
                  </div>

                  <div className="bg-white border-2 border-black p-2 flex flex-col justify-center items-center text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-zinc-50">
                    <span className="text-[7.5px] font-mono font-bold text-zinc-400 uppercase">GRADE</span>
                    <span className="text-[10px] font-display font-black text-black mt-1 uppercase truncate w-full">
                      {calculatedJitter !== null
                        ? (calculatedJitter < 2.5 ? "S-TIER" : calculatedJitter < 5 ? "A-TIER" : "B-TIER")
                        : "---"
                      }
                    </span>
                  </div>
                </div>

                {/* Real-time Vertical Bar Chart */}
                <div className="bg-white border-2 border-black p-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-1.5">
                  <span className="text-[7.5px] font-mono font-bold text-zinc-400 uppercase">Real-time Ping Delay Graph (Samples)</span>
                  <div className="flex items-end justify-between h-14 bg-zinc-50 border border-zinc-200 px-3 py-1">
                    {Array.from({ length: 10 }).map((_, idx) => {
                      const value = pingHistory[idx];
                      const heightPercent = value ? Math.min((value / 50) * 100, 100) : 0;
                      return (
                        <div key={idx} className="w-5 flex flex-col items-center gap-1">
                          <span className="text-[7px] font-mono text-zinc-400 font-bold">
                            {value ? `${value}` : ""}
                          </span>
                          <div
                            style={{ height: value ? `${Math.max(8, heightPercent * 0.35)}px` : "2px" }}
                            className={`w-full border-t border-x border-black transition-all duration-300 ${value ? (value > 30 ? "bg-[#FF2E63]" : "bg-[#facc15]") : "bg-zinc-200"
                              }`}
                          ></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Console Terminal Logs */}
                <div
                  ref={terminalRef}
                  className="bg-black text-[#00FF66] border-2 border-black p-2.5 font-mono text-[8.5px] leading-relaxed shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] max-h-32 overflow-y-auto"
                >
                  {testLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-1.5">
                      <span className="text-zinc-500 font-bold shrink-0">&gt;</span>
                      <span className={log.includes("SECURE PING") ? "text-zinc-300" : ""}>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Start screen
              <div className="bg-white border-2 border-black p-5 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-3">
                <span className="text-3xl">⚡</span>
                <div>
                  <h5 className="font-display font-black text-xs text-black uppercase">Websocket Jitter Check</h5>
                  <p className="text-[9.5px] font-mono text-zinc-500 mt-1 leading-normal max-w-xs">
                    Fluctuations (jitter) disrupt real-time playback lock. Test your duplex connection to guarantee zero stream drift during watch sessions!
                  </p>
                </div>
              </div>
            )}

            {/* Test Action button */}
            <button
              onClick={startJitterTest}
              disabled={isTestingSpeed}
              className={`w-full py-2.5 border-2 border-black font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed ${isTestingSpeed
                  ? "bg-zinc-200 text-black shadow-none translate-y-0.5"
                  : "bg-black text-white hover:bg-[#FF2E63] hover:text-white"
                }`}
            >
              {isTestingSpeed ? (
                <>
                  <RefreshCw className="w-4 h-4 text-black animate-spin" /> RUNNING PING TESTS ({testProgress}%)
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-white" /> START DUPLEX JITTER TEST
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer Info Badge */}
        <div className="mt-4 pt-3 border-t border-dashed border-zinc-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF2E63]" />
            <span className="text-[8.5px] font-mono font-bold text-zinc-500 uppercase tracking-wide">
              Ultra lightweight, No server overhead
            </span>
          </div>
          <span className="text-[8.5px] font-mono font-black text-[#FF2E63] uppercase">
            COMPATIBLE WITH REAL SYNC
          </span>
        </div>
      </div>
    </div>
  );
}
