import React, { useState } from "react";
import { History, Award, BookOpen, PenTool } from "lucide-react";
import { Commit } from "../types";

interface CommitTimelineProps {
  onDjMessage: (msg: string) => void;
}

export default function CommitTimeline({ onDjMessage }: CommitTimelineProps) {
  const [commits, setCommits] = useState<Commit[]>([
    {
      id: "c1",
      hash: "8a4b2c1",
      date: "3 hours ago",
      message: "wip: trying to explain how the canvas works with a Batman joke",
      humanDetail: "Added an inline comment: '// I'm Batman, and this canvas is Gotham. Only I can clean up this memory leak.' The comment stayed, the bug was never resolved.",
      isSoul: true,
    },
    {
      id: "c2",
      hash: "3f9a7d2",
      date: "Yesterday",
      message: "just locked in, not lazy, just sitting low on this promise",
      humanDetail: "Scrapped a standard async throttle. Wrote 30 lines of comments detailing the specific scent of morning coffee instead. Highly illustrative, completely unoptimized.",
    },
    {
      id: "c3",
      hash: "1e5c8f4",
      date: "2 days ago",
      message: "L to U to L ritual code draft",
      humanDetail: "Configured a script that errors out if the developer didn't open their morning emails before compiling. Turning routine into an encryption key.",
    },
    {
      id: "c4",
      hash: "9b2e4a6",
      date: "Last week",
      message: "it compiles please do not blow up",
      humanDetail: "Wrote '// DO NOT REMOVE THIS LINE OR THE COMPILER STARTS SINGING IN SWEDISH'. Refused to elaborate. Submited PR at 4:18 AM.",
    },
  ]);

  const [activeCommitId, setActiveCommitId] = useState<string>("c1");
  const activeCommit = commits.find((c) => c.id === activeCommitId) || commits[0];

  const handleCommitClick = (commit: Commit) => {
    setActiveCommitId(commit.id);
    onDjMessage(
      `You are exploring the messy margins of our history. The commit '${commit.message}' represents a deeply human moment in code.`
    );
  };

  return (
    <div id="commit-timeline" className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Background visual vintage paper accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl transition-all duration-700 group-hover:bg-amber-500/10" />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-amber-500/80" />
          <span className="font-sans font-medium text-stone-200 tracking-tight text-sm">
            "Notebook Batman" Commit History
          </span>
        </div>

        {/* The timeline representation */}
        <div className="space-y-3 mb-5 max-h-56 overflow-y-auto pr-1">
          {commits.map((commit) => (
            <div
              key={commit.id}
              onClick={() => handleCommitClick(commit)}
              className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                commit.id === activeCommitId
                  ? "bg-amber-950/20 border-amber-500/40 shadow-sm"
                  : "bg-stone-950/40 border-stone-900 hover:border-stone-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[9px] text-stone-500 uppercase">
                  HASH: {commit.hash}
                </span>
                <span className="font-sans text-[9px] text-stone-400">
                  {commit.date}
                </span>
              </div>
              <p className="font-sans text-xs font-medium text-stone-300 leading-snug line-clamp-2">
                {commit.message}
              </p>

              {commit.isSoul && (
                <div className="absolute top-2 right-2 text-amber-400" title="The Soul of the Repo">
                  <Award className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Human Detail Card with sketch aesthetics */}
      <div className="bg-stone-950 border border-amber-900/15 rounded-xl p-4 relative">
        <div className="absolute top-3 right-3 text-amber-500/30">
          <PenTool className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-1 text-stone-500 font-mono text-[10px] uppercase mb-2">
          <BookOpen className="w-3.5 h-3.5 text-amber-500/50" /> Messy Margins Detail
        </div>
        <p className="font-sans text-xs text-amber-200/90 leading-relaxed italic border-l-2 border-amber-500/30 pl-3">
          "{activeCommit.humanDetail}"
        </p>
        {activeCommit.isSoul && (
          <p className="font-mono text-[9px] text-amber-500/60 uppercase tracking-wider mt-2.5 pl-3">
            ★ PINNED AS THE SOUL OF THE REPO
          </p>
        )}
      </div>
    </div>
  );
}
