"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Brain,
  Eye,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";

import { PalaceStage } from "@/components/palace-stage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { normalizeItem, type PalaceRoute } from "@/lib/palace-schema";
import { cn } from "@/lib/utils";

type AppPhase = "input" | "route" | "recall" | "results";

type ImageRecord = {
  error: string | null;
  imageDataUrl: string | null;
  locationId: string;
  status: "pending" | "ready" | "failed" | "skipped";
  step: number;
  updatedAt: string;
};

type ImageBatchResponse = {
  createdAt: string;
  images: ImageRecord[];
  isProcessing: boolean;
  requestId: string;
  updatedAt: string;
};

const ITEM_OPTIONS = [3, 4, 5, 6, 7, 8];
const DEFAULT_COUNT = 5;

function createItemFields(count: number, previous: string[] = []) {
  return Array.from({ length: count }, (_, index) => previous[index] ?? "");
}

function getScore(route: PalaceRoute, answers: string[]) {
  return route.stops.reduce((score, stop, index) => {
    return score + Number(normalizeItem(answers[index] ?? "") === normalizeItem(stop.item));
  }, 0);
}

export function MemoryPalaceApp() {
  const [phase, setPhase] = useState<AppPhase>("input");
  const [itemCount, setItemCount] = useState(DEFAULT_COUNT);
  const [items, setItems] = useState(() => createItemFields(DEFAULT_COUNT));
  const deferredItems = useDeferredValue(items);
  const [route, setRoute] = useState<PalaceRoute | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [imageBatch, setImageBatch] = useState<ImageBatchResponse | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const answerInputRef = useRef<HTMLInputElement>(null);

  const currentStop = route ? route.stops[answers.length] : undefined;
  const correctCount = route ? getScore(route, answers) : 0;
  const imageRecords = imageBatch?.images ?? [];
  const readyCount = imageRecords.filter((image) => image.status === "ready").length;
  const failedCount = imageRecords.filter((image) => image.status === "failed").length;
  const pendingCount = imageRecords.filter((image) => image.status === "pending").length;
  const recallProgress = route ? (answers.length / route.stops.length) * 100 : 0;

  useEffect(() => {
    if (phase === "recall") {
      answerInputRef.current?.focus();
    }
  }, [phase, answers.length]);

  const pollBatch = useEffectEvent(async (requestId: string) => {
    const response = await fetch(
      `/api/palace-images?requestId=${encodeURIComponent(requestId)}`,
      {
        cache: "no-store",
      },
    );
    const payload = (await response.json()) as ImageBatchResponse | { error?: string };

    if (!response.ok) {
      if ("error" in payload && payload.error) {
        setErrorMessage(payload.error);
      }
      return;
    }

    setImageBatch(payload as ImageBatchResponse);
  });

  useEffect(() => {
    if (!imageBatch?.requestId) {
      return;
    }

    if (!imageBatch.images.some((image) => image.status === "pending")) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void pollBatch(imageBatch.requestId);
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [imageBatch?.images, imageBatch?.requestId]);

  async function startImageBatch(nextRoute: PalaceRoute, retryFailed = false) {
    const response = await fetch("/api/palace-images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId: retryFailed ? imageBatch?.requestId : undefined,
        retryFailed,
        routeMood: nextRoute.routeMood,
        scenes: nextRoute.stops,
      }),
    });

    const payload = (await response.json()) as ImageBatchResponse | { error?: string };

    if (!response.ok) {
      throw new Error(
        "error" in payload && payload.error
          ? payload.error
          : "Unable to generate scene images.",
      );
    }

    setImageBatch(payload as ImageBatchResponse);
  }

  async function generateRoute() {
    const trimmedItems = items.map((item) => item.trim());

    if (trimmedItems.some((item) => !item)) {
      setErrorMessage("Fill every stop before you build the route.");
      return;
    }

    setErrorMessage(null);
    setImageBatch(null);
    setAnswers([]);
    setCurrentAnswer("");

    const response = await fetch("/api/palace-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: trimmedItems,
      }),
    });

    const payload = (await response.json()) as PalaceRoute | { error?: string };

    if (!response.ok) {
      throw new Error(
        "error" in payload && payload.error
          ? payload.error
          : "Unable to build a memory route.",
      );
    }

    const nextRoute = payload as PalaceRoute;

    setRoute(nextRoute);
    setSelectedStopId(nextRoute.stops[0]?.locationId ?? null);
    setPhase("route");

    try {
      await startImageBatch(nextRoute);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Route ready, but scene images failed.",
      );
    }
  }

  function handleCountChange(nextCount: number) {
    setItemCount(nextCount);
    setItems((currentItems) => createItemFields(nextCount, currentItems));
  }

  function handleSubmitCurrentAnswer() {
    if (!route || !currentStop || !currentAnswer.trim()) {
      return;
    }

    const nextAnswers = [...answers, currentAnswer.trim()];

    setAnswers(nextAnswers);
    setCurrentAnswer("");

    if (nextAnswers.length === route.stops.length) {
      setPhase("results");
      return;
    }
  }

  function handleRecallReset() {
    setAnswers([]);
    setCurrentAnswer("");
    setPhase("recall");
    setReferenceOpen(false);
  }

  function handleRestart() {
    setPhase("input");
    setItemCount(DEFAULT_COUNT);
    setItems(createItemFields(DEFAULT_COUNT));
    setRoute(null);
    setSelectedStopId(null);
    setImageBatch(null);
    setAnswers([]);
    setCurrentAnswer("");
    setErrorMessage(null);
    setReferenceOpen(false);
  }

  const phaseLabel = {
    input: "Build",
    recall: "Recall",
    results: "Result",
    route: "Study",
  }[phase];

  return (
    <div className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,rgba(250,230,202,0.14),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(135,86,54,0.14),transparent_28%),linear-gradient(180deg,#080707,#11100e_38%,#090807)] text-stone-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1560px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between rounded-full border border-white/10 bg-black/18 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(247,226,196,0.18),rgba(199,140,77,0.2))]">
              <Brain className="h-[18px] w-[18px] text-[#e3bd88]" />
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.3em] text-stone-500">
                Memory Palace
              </p>
              <p className="text-sm text-stone-300">AI route memory game</p>
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.3em] text-stone-300">
            {phaseLabel}
          </div>
        </header>

        <main className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.18fr)_420px]">
          <PalaceStage
            answers={answers}
            currentStop={currentStop}
            images={imageRecords}
            itemCount={itemCount}
            items={deferredItems}
            onSelectStop={setSelectedStopId}
            phase={phase}
            route={route}
            selectedStopId={selectedStopId}
          />

          <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%),linear-gradient(180deg,rgba(19,17,15,0.96),rgba(10,10,9,0.98))] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.28)]">
            <div className="space-y-3 border-b border-white/8 pb-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[0.68rem] uppercase tracking-[0.28em] text-stone-400">
                <Sparkles className="h-3.5 w-3.5 text-[#d8ad73]" />
                One route. One run.
              </p>
              <div className="space-y-2">
                <h1 className="font-display text-[2.65rem] leading-none text-stone-50">
                  Walk it once. Keep it.
                </h1>
                <p className="max-w-sm text-sm leading-6 text-stone-400">
                  Turn a short sequence into one vivid path, study it, then replay
                  the items in order.
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pt-5">
              {phase === "input" ? (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <p className="text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                      How many items
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {ITEM_OPTIONS.map((option) => (
                        <Button
                          className={cn(
                            "justify-center rounded-2xl",
                            itemCount === option &&
                              "border-[#d7ad77] bg-[linear-gradient(180deg,rgba(223,182,127,0.18),rgba(255,255,255,0.05))] text-stone-50",
                          )}
                          key={option}
                          onClick={() => handleCountChange(option)}
                          size="sm"
                          type="button"
                          variant={itemCount === option ? "outline" : "ghost"}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                        Enter in order
                      </p>
                      <p className="text-xs text-stone-500">{itemCount} stops</p>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div className="flex items-center gap-2" key={`item-${index + 1}`}>
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/4 text-sm text-stone-400">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <Input
                            onChange={(event) => {
                              const value = event.target.value;
                              setItems((currentItems) =>
                                currentItems.map((entry, entryIndex) =>
                                  entryIndex === index ? value : entry,
                                ),
                              );
                            }}
                            placeholder={`Item ${index + 1}`}
                            value={item}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full justify-between rounded-2xl px-5"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await generateRoute().catch((error) => {
                          setErrorMessage(
                            error instanceof Error
                              ? error.message
                              : "Unable to build a memory route.",
                          );
                        });
                      })
                    }
                    type="button"
                  >
                    <span>{isPending ? "Building route" : "Build palace"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}

              {phase === "route" && route ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                      Route
                    </p>
                    <div>
                      <h2 className="font-display text-3xl text-stone-50">
                        {route.routeTitle}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-stone-400">
                        {route.routeMood}
                      </p>
                    </div>
                  </div>

                  {selectedStopId ? (
                    <div className="rounded-[26px] border border-white/10 bg-white/4 p-4">
                      {route.stops
                        .filter((stop) => stop.locationId === selectedStopId)
                        .map((stop) => (
                          <div className="space-y-4" key={stop.locationId}>
                            <div>
                              <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#d6ac76]">
                                {stop.locationLabel}
                              </p>
                              <p className="mt-2 text-lg text-stone-100">
                                {stop.sceneTitle}
                              </p>
                            </div>
                            <p className="text-sm leading-6 text-stone-400">
                              {stop.mnemonicCue}
                            </p>
                            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                              {stop.transitionHint}
                            </p>
                          </div>
                        ))}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                        Scene load
                      </p>
                      <p className="text-xs text-stone-500">
                        {readyCount}/{route.stops.length} ready
                      </p>
                    </div>
                    <Progress value={(readyCount / route.stops.length) * 100} />
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>{pendingCount} pending</span>
                      <span>{failedCount} failed</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 justify-between rounded-2xl"
                      onClick={() => {
                        setAnswers([]);
                        setCurrentAnswer("");
                        setPhase("recall");
                      }}
                      type="button"
                    >
                      <span>Start recall</span>
                      <Brain className="h-4 w-4" />
                    </Button>
                    <Button
                      className="rounded-2xl"
                      disabled={!failedCount}
                      onClick={() => {
                        void startImageBatch(route, true).catch((error) => {
                          setErrorMessage(
                            error instanceof Error
                              ? error.message
                              : "Unable to retry failed images.",
                          );
                        });
                      }}
                      type="button"
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {phase === "recall" && route && currentStop ? (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                        Recall
                      </p>
                      <p className="text-xs text-stone-500">
                        {answers.length + 1}/{route.stops.length}
                      </p>
                    </div>
                    <Progress value={recallProgress} />
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/4 p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[#d6ac76]">
                      {currentStop.locationLabel}
                    </p>
                    <p className="mt-2 text-lg text-stone-100">{currentStop.sceneTitle}</p>
                    <p className="mt-3 text-sm leading-6 text-stone-400">
                      Type the original item for this stop.
                    </p>
                  </div>

                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSubmitCurrentAnswer();
                    }}
                  >
                    <Input
                      onChange={(event) => setCurrentAnswer(event.target.value)}
                      placeholder="Type the item"
                      ref={answerInputRef}
                      value={currentAnswer}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 justify-between rounded-2xl"
                        disabled={!currentAnswer.trim()}
                        type="submit"
                      >
                        <span>
                          {answers.length + 1 === route.stops.length
                            ? "Finish run"
                            : "Next stop"}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>

                      <Dialog.Root onOpenChange={setReferenceOpen} open={referenceOpen}>
                        <Dialog.Trigger asChild>
                          <Button className="rounded-2xl" type="button" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/68 backdrop-blur-sm" />
                          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,880px)] -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-white/10 bg-[#11100e] p-5 shadow-[0_50px_160px_rgba(0,0,0,0.45)]">
                            <div className="flex items-start justify-between gap-6">
                              <div>
                                <Dialog.Title className="font-display text-3xl text-stone-50">
                                  {route.routeTitle}
                                </Dialog.Title>
                                <Dialog.Description className="mt-2 max-w-xl text-sm leading-6 text-stone-400">
                                  {route.routeMood}
                                </Dialog.Description>
                              </div>
                              <Dialog.Close asChild>
                                <Button type="button" variant="ghost">
                                  Close
                                </Button>
                              </Dialog.Close>
                            </div>
                            <div className="mt-5 grid gap-3 md:grid-cols-2">
                              {route.stops.map((stop) => {
                                const image = imageRecords.find(
                                  (record) => record.locationId === stop.locationId,
                                );

                                return (
                                  <div
                                    className="rounded-[24px] border border-white/8 bg-white/4 p-4"
                                    key={stop.locationId}
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                                        Stop {String(stop.step).padStart(2, "0")}
                                      </p>
                                      <p className="text-xs text-stone-500">
                                        {image?.status ?? "pending"}
                                      </p>
                                    </div>
                                    <p className="mt-3 text-sm text-stone-100">
                                      {stop.locationLabel}
                                    </p>
                                    <p className="mt-1 text-xs text-stone-500">
                                      {stop.mnemonicCue}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </div>
                  </form>
                </div>
              ) : null}

              {phase === "results" && route ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                      Score
                    </p>
                    <div className="flex items-end gap-3">
                      <p className="font-display text-6xl leading-none text-stone-50">
                        {correctCount}
                      </p>
                      <p className="pb-2 text-stone-400">/ {route.stops.length}</p>
                    </div>
                    <p className="text-sm leading-6 text-stone-400">
                      {correctCount === route.stops.length
                        ? "Perfect route retention."
                        : "Run it again and tighten the weak stops."}
                    </p>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/4 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[0.68rem] uppercase tracking-[0.28em] text-stone-500">
                        Accuracy
                      </p>
                      <p className="text-sm text-stone-300">
                        {Math.round((correctCount / route.stops.length) * 100)}%
                      </p>
                    </div>
                    <div className="mt-3">
                      <Progress
                        value={(correctCount / route.stops.length) * 100}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 justify-between rounded-2xl"
                      onClick={handleRecallReset}
                      type="button"
                    >
                      <span>Retry recall</span>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      className="rounded-2xl"
                      onClick={handleRestart}
                      type="button"
                      variant="outline"
                    >
                      Restart
                    </Button>
                  </div>
                </div>
              ) : null}

              {errorMessage ? (
                <div className="mt-5 rounded-2xl border border-rose-400/18 bg-rose-400/8 px-4 py-3 text-sm leading-6 text-rose-100">
                  {errorMessage}
                </div>
              ) : null}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
