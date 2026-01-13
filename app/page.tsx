"use client";

import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";

type Deck = {
  id: string;
  title: string;
  pageCount: number;
  pages: Array<{
    pageNumber: number;
    imageUrl: string;
    width?: number;
    height?: number;
  }>;
  audioUrl?: string;
  durationMs?: number;
};

type SubtitleChunk = {
  id: string;
  text: string;
  startMs?: number;
  endMs?: number;
};

type SubtitleGroup = {
  pageNumber: number;
  shortTitle: string;
  chunks: SubtitleChunk[];
};

type PlayerState = {
  activePage: number;
  currentTimeMs: number;
  isPlaying: boolean;
  playbackRate: number;
  activeChunkId?: string;
};

const subtitleGroups: SubtitleGroup[] = [
  {
    pageNumber: 1,
    shortTitle: "Intro & Agenda",
    chunks: [
      { id: "1-1", text: "Welcome to the demo deck overview." },
      { id: "1-2", text: "We will walk through the player experience." },
    ],
  },
  {
    pageNumber: 2,
    shortTitle: "Context",
    chunks: [
      { id: "2-1", text: "This deck ships as a nine-page PDF." },
      { id: "2-2", text: "Subtitles are grouped per page for clarity." },
    ],
  },
  {
    pageNumber: 3,
    shortTitle: "Problem",
    chunks: [
      { id: "3-1", text: "Video can be hard to skim or reference quickly." },
      { id: "3-2", text: "Slides alone miss narrative continuity." },
    ],
  },
  {
    pageNumber: 4,
    shortTitle: "Insight",
    chunks: [
      { id: "4-1", text: "Reading-first layouts keep the story accessible." },
      { id: "4-2", text: "Sync must be deterministic between pages and text." },
    ],
  },
  {
    pageNumber: 5,
    shortTitle: "Solution",
    chunks: [
      { id: "5-1", text: "Each page owns one subtitle disclosure." },
      { id: "5-2", text: "Only the active page stays expanded." },
    ],
  },
  {
    pageNumber: 6,
    shortTitle: "Flow",
    chunks: [
      { id: "6-1", text: "Swiping the slide updates the subtitle list." },
      { id: "6-2", text: "Tapping a collapsed row jumps to that page." },
    ],
  },
  {
    pageNumber: 7,
    shortTitle: "Details",
    chunks: [
      { id: "7-1", text: "Active chunks highlight with subtle blue." },
      { id: "7-2", text: "Controls stay thumb-friendly at the bottom." },
    ],
  },
  {
    pageNumber: 8,
    shortTitle: "Next Steps",
    chunks: [
      { id: "8-1", text: "Audio can be added later without changing UX." },
      { id: "8-2", text: "Index panel is reserved for future scope." },
    ],
  },
  {
    pageNumber: 9,
    shortTitle: "Q&A",
    chunks: [
      { id: "9-1", text: "Thanks for reviewing the demo deck." },
      { id: "9-2", text: "Questions and feedback are welcome." },
    ],
  },
];

const SLIDE_FALLBACK_WIDTH = 1200;
const SLIDE_FALLBACK_HEIGHT = 800;
const PDF_SCALE = 1.4;

const deck: Deck = {
  id: "demo",
  title: "Demo PDF Deck",
  pageCount: 9,
  pages: Array.from({ length: 9 }, (_, index) => {
    const pageNumber = index + 1;
    return {
      pageNumber,
      imageUrl: "",
      width: SLIDE_FALLBACK_WIDTH,
      height: SLIDE_FALLBACK_HEIGHT,
    };
  }),
  audioUrl: undefined,
  durationMs: undefined,
};

function PagePill({
  value,
  tone = "muted",
}: {
  value: number;
  tone?: "muted" | "primary";
}) {
  const styles =
    tone === "primary"
      ? "bg-[#2f80ff] text-white shadow-sm"
      : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-flex min-w-[30px] items-center justify-center rounded-xl px-2 py-1 text-xs font-semibold ${styles}`}
    >
      {value}
    </span>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.8"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.8"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.8"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
    </svg>
  );
}

function TriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M19 12a1 1 0 0 1-.46.84l-10 6.25A1 1 0 0 1 7 18.25V5.75a1 1 0 0 1 1.54-.84l10 6.25a1 1 0 0 1 .46.84Z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M8 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Zm8 0a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function SkipBackIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="m11 5 9 7-9 7V5ZM4 5h2v14H4V5Z" />
    </svg>
  );
}

function SkipForwardIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M13 5v14l9-7-9-7ZM4 5h2v14H4V5Z" />
    </svg>
  );
}

function IndexIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M7 6h10M7 12h7M7 18h4" />
    </svg>
  );
}

function SlideViewer({
  pages,
  activePage,
  onChangePage,
  title,
  pageCount,
}: {
  pages: Deck["pages"];
  activePage: number;
  onChangePage: (page: number) => void;
  title: string;
  pageCount: number;
}) {
  const startX = useRef<number | null>(null);

  const activePageData = useMemo(
    () => pages.find((page) => page.pageNumber === activePage) ?? pages[0],
    [activePage, pages]
  );

  const preloadPages = useMemo(() => {
    const neighbors = [activePage - 1, activePage + 1];
    return pages.filter((page) => neighbors.includes(page.pageNumber));
  }, [activePage, pages]);
  const slideWidth = activePageData?.width ?? SLIDE_FALLBACK_WIDTH;
  const slideHeight = activePageData?.height ?? SLIDE_FALLBACK_HEIGHT;

  const handleStart = (clientX: number) => {
    startX.current = clientX;
  };

  const handleEnd = (clientX: number) => {
    if (startX.current === null) return;
    const deltaX = clientX - startX.current;
    const threshold = 48;
    if (deltaX > threshold) {
      onChangePage(Math.max(1, activePage - 1));
    } else if (deltaX < -threshold) {
      onChangePage(Math.min(pages.length, activePage + 1));
    }
    startX.current = null;
  };

  return (
    <div
      className="relative w-full min-h-[220px]"
      style={{ aspectRatio: `${slideWidth} / ${slideHeight}` }}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchEnd={(e) => handleEnd(e.changedTouches[0].clientX)}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseUp={(e) => handleEnd(e.clientX)}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-[#eef1f7]">
        {activePageData?.imageUrl ? (
          <img
            src={activePageData.imageUrl}
            alt={`Slide ${activePage}`}
            width={slideWidth}
            height={slideHeight}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-slate-200" />
        )}
      </div>
      <button
        type="button"
        className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
        aria-label="Previous page"
        onClick={() => onChangePage(Math.max(1, activePage - 1))}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
        aria-label="Next page"
        onClick={() => onChangePage(Math.min(pageCount, activePage + 1))}
      />
      {preloadPages
        .filter((page) => page.imageUrl)
        .map((page) => (
          <div className="sr-only" aria-hidden key={page.pageNumber}>
            <img
              src={page.imageUrl}
              alt=""
              width={page.width ?? SLIDE_FALLBACK_WIDTH}
              height={page.height ?? SLIDE_FALLBACK_HEIGHT}
            />
          </div>
        ))}
    </div>
  );
}

function SlideSeekBar({
  activePage,
  pageCount,
  onChangePage,
}: {
  activePage: number;
  pageCount: number;
  onChangePage: (page: number) => void;
}) {
  const progress =
    pageCount > 1 ? ((activePage - 1) / (pageCount - 1)) * 100 : 0;
  return (
    <div className="flex items-center gap-4 border-b border-slate-200 px-5 py-3">
      <input
        type="range"
        min={1}
        max={pageCount}
        step={1}
        value={activePage}
        onChange={(event) => onChangePage(Number(event.target.value))}
        className="page-seek flex-1 appearance-none rounded-full"
        aria-label="Slide page seek"
        style={{ "--seek-progress": `${progress}%` } as React.CSSProperties}
      />
      <span className="rounded-full bg-[#4b5360] px-3 py-1 text-xs font-semibold text-white">
        {activePage}/{pageCount}
      </span>
    </div>
  );
}

function SubtitleHeader({
  headerRef,
}: {
  headerRef: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={headerRef}
      className="mb-3 flex items-center justify-between px-1"
    >
      <h2 className="text-lg font-semibold text-slate-900">Subtitle</h2>
      <button
        type="button"
        className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
      >
        <IndexIcon className="h-4 w-4 text-slate-500" />
        <span>Index</span>
      </button>
    </div>
  );
}

function SubtitleList({
  groups,
  activePage,
  activeChunkId,
  onSelectPage,
  onSelectChunk,
  groupRefs,
}: {
  groups: SubtitleGroup[];
  activePage: number;
  activeChunkId?: string;
  onSelectPage: (pageNumber: number) => void;
  onSelectChunk: (chunkId: string) => void;
  groupRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
}) {
  const setGroupRef =
    (pageNumber: number) => (element: HTMLDivElement | null) => {
      groupRefs.current[pageNumber] = element;
    };

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isActive = group.pageNumber === activePage;

        if (!isActive) {
          return (
            <div
              key={group.pageNumber}
              ref={setGroupRef(group.pageNumber)}
              className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:-translate-y-[1px]"
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => onSelectPage(group.pageNumber)}
              >
                <PagePill value={group.pageNumber} />
                <div className="flex-1 truncate text-[15px] font-semibold text-slate-900">
                  {group.shortTitle}
                </div>
                <ChevronRightIcon className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          );
        }

        return (
          <div
            key={group.pageNumber}
            ref={setGroupRef(group.pageNumber)}
            className="rounded-2xl border border-[#d9e7ff] bg-white shadow-[0_14px_36px_rgba(47,128,255,0.18)]"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <PagePill value={group.pageNumber} tone="primary" />
              <div className="flex-1 text-[15px] font-semibold text-slate-900">
                {group.shortTitle}
              </div>
              <ChevronUpIcon className="h-5 w-5 text-[#2f80ff]" />
            </div>
            <div className="divide-y divide-slate-100">
              {group.chunks.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500">
                  No subtitles available for this page.
                </div>
              ) : (
                group.chunks.map((chunk) => {
                  const isActiveChunk = chunk.id === activeChunkId;
                  return (
                    <button
                      key={chunk.id}
                      type="button"
                      onClick={() => onSelectChunk(chunk.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                        isActiveChunk
                          ? "bg-[#eaf2ff] ring-1 ring-[#bcd5ff]"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1 h-10 w-1 rounded-full ${
                          isActiveChunk ? "bg-[#2f80ff]" : "bg-transparent"
                        }`}
                      />
                      <PagePill
                        value={group.pageNumber}
                        tone={isActiveChunk ? "primary" : "muted"}
                      />
                      <p
                        className={`flex-1 text-[14px] leading-6 ${
                          isActiveChunk
                            ? "font-semibold text-slate-900"
                            : "text-slate-700"
                        }`}
                      >
                        {chunk.text}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BottomControls({
  state,
  hasAudio,
  durationMs,
  onSeek,
  onPlayPause,
  onPrevPage,
  onNextPage,
  onChangeRate,
}: {
  state: PlayerState;
  hasAudio: boolean;
  durationMs?: number;
  onSeek: (value: number) => void;
  onPlayPause: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onChangeRate: () => void;
}) {
  const disabledSeek = !hasAudio || !durationMs;
  const sliderValue = disabledSeek
    ? 0
    : Math.min(durationMs ?? 0, state.currentTimeMs);
  const displayRate =
    Number.isInteger(state.playbackRate) && state.playbackRate % 1 === 0
      ? `${state.playbackRate.toFixed(1)}x`
      : `${state.playbackRate}x`;

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-5 pb-5 pt-3">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={durationMs ?? 0}
          step={500}
          value={sliderValue}
          disabled={disabledSeek}
          onChange={(event) => onSeek(Number(event.target.value))}
          className={`flex-1 ${disabledSeek ? "opacity-50" : ""}`}
        />
        <button
          type="button"
          onClick={onChangeRate}
          className="text-xs font-semibold text-slate-600"
        >
          {displayRate}
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevPage}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-inner transition hover:bg-slate-200"
        >
          <SkipBackIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onPlayPause}
          disabled={!hasAudio}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_16px_30px_rgba(47,128,255,0.3)] transition ${
            hasAudio
              ? "bg-[#2f80ff] hover:bg-[#2467d6]"
              : "bg-slate-300 text-slate-600"
          }`}
          aria-label={state.isPlaying ? "Pause" : "Play"}
        >
          {state.isPlaying ? (
            <PauseIcon className="h-7 w-7" />
          ) : (
            <TriangleIcon className="h-7 w-7 translate-x-[1px]" />
          )}
        </button>
        <button
          type="button"
          onClick={onNextPage}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-inner transition hover:bg-slate-200"
        >
          <SkipForwardIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState<PlayerState>({
    activePage: 1,
    currentTimeMs: 0,
    isPlaying: false,
    playbackRate: 1,
  });
  const [pages, setPages] = useState<Deck["pages"]>(deck.pages);
  const [pageCount, setPageCount] = useState(deck.pageCount);

  const listRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const groupRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        const loadingTask = pdfjsLib.getDocument("/demo.pdf");
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const totalPages = pdf.numPages;
        setPageCount(totalPages);

        const renderedPages = await Promise.all(
          Array.from({ length: totalPages }, (_, index) =>
            pdf.getPage(index + 1).then(async (page) => {
              const viewport = page.getViewport({ scale: PDF_SCALE });
              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              if (!context) return null;
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({
                canvasContext: context,
                viewport,
                canvas,
              }).promise;
              return {
                pageNumber: index + 1,
                imageUrl: canvas.toDataURL("image/png"),
                width: viewport.width,
                height: viewport.height,
              };
            })
          )
        );

        if (cancelled) return;

        const filledPages = Array.from({ length: totalPages }, (_, index) => {
          const pageNumber = index + 1;
          const rendered = renderedPages.find(
            (page) => page?.pageNumber === pageNumber
          );
          return (
            rendered ?? {
              pageNumber,
              imageUrl: "",
              width: SLIDE_FALLBACK_WIDTH,
              height: SLIDE_FALLBACK_HEIGHT,
            }
          );
        });

        setPages(filledPages);
      } catch (error) {
        console.error("Failed to render PDF slides", error);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = listRef.current;
    const activeGroup = groupRefs.current[state.activePage];
    if (!container || !activeGroup) return;
    const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
    const top = activeGroup.offsetTop - headerHeight - 10;
    container.scrollTo({
      top: top >= 0 ? top : 0,
      behavior: "smooth",
    });
  }, [state.activePage]);

  const hasAudio = Boolean(deck.audioUrl);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > pageCount) return;
    setState((prev) => ({
      ...prev,
      activePage: pageNumber,
      activeChunkId: undefined,
    }));
  };

  const handleChunkSelect = (chunkId: string) => {
    setState((prev) => ({
      ...prev,
      activeChunkId: chunkId,
    }));
  };

  const handlePlayToggle = () => {
    if (!hasAudio) return;
    setState((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  };

  const handleSeek = (value: number) => {
    setState((prev) => ({
      ...prev,
      currentTimeMs: value,
    }));
  };

  const handleChangeRate = () => {
    const cycle = [1, 1.25, 1.5, 2];
    const currentIndex = cycle.indexOf(state.playbackRate);
    const nextRate = cycle[(currentIndex + 1) % cycle.length];
    setState((prev) => ({ ...prev, playbackRate: nextRate }));
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-10 bg-white">
        <SlideViewer
          title={deck.title}
          pages={pages}
          pageCount={pageCount}
          activePage={state.activePage}
          onChangePage={handlePageChange}
        />
        <SlideSeekBar
          activePage={state.activePage}
          pageCount={pageCount}
          onChangePage={handlePageChange}
        />
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto bg-white px-5 pb-28 pt-4"
      >
        <SubtitleHeader headerRef={headerRef} />
        <SubtitleList
          groups={subtitleGroups}
          activePage={state.activePage}
          activeChunkId={state.activeChunkId}
          onSelectPage={handlePageChange}
          onSelectChunk={handleChunkSelect}
          groupRefs={groupRefs}
        />
      </div>
      <BottomControls
        state={state}
        hasAudio={hasAudio}
        durationMs={deck.durationMs}
        onSeek={handleSeek}
        onPlayPause={handlePlayToggle}
        onPrevPage={() => handlePageChange(Math.max(1, state.activePage - 1))}
        onNextPage={() =>
          handlePageChange(Math.min(pageCount, state.activePage + 1))
        }
        onChangeRate={handleChangeRate}
      />
    </div>
  );
}
