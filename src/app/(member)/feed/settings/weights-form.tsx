"use client";

import { useActionState, useState } from "react";
import { updateWeights, type UpdateWeightsState } from "./actions";
import type { WeightFactor } from "@/lib/ranking/weights";

const DIALS: { factor: WeightFactor; label: string; description: string }[] = [
  {
    factor: "recency",
    label: "Recency",
    description: "How much to favor newer items.",
  },
  {
    factor: "sourceDiversity",
    label: "Source variety",
    description: "Spread items out so one feed doesn't dominate your list.",
  },
  {
    factor: "corroboration",
    label: "Cross-feed corroboration",
    description: "Favor stories that show up in more than one of your feeds.",
  },
  {
    factor: "popularity",
    label: "Group popularity",
    description: "Favor sources other members in your group also follow.",
  },
];

const initialState: UpdateWeightsState = { status: "idle" };

export function WeightsForm({
  initialValues,
}: {
  initialValues: Record<WeightFactor, number>;
}) {
  const [state, formAction, pending] = useActionState(updateWeights, initialState);
  const [values, setValues] = useState(initialValues);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-6">
      {DIALS.map((dial) => (
        <div key={dial.factor} className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor={dial.factor} className="text-sm font-medium">
              {dial.label}
            </label>
            <span className="text-xs text-gray-500">{values[dial.factor].toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">{dial.description}</p>
          <input
            id={dial.factor}
            name={dial.factor}
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={values[dial.factor]}
            onChange={(e) =>
              setValues((v) => ({ ...v, [dial.factor]: Number(e.target.value) }))
            }
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save weights"}
      </button>
      {state.status !== "idle" && (
        <p className={`text-sm ${state.status === "error" ? "text-red-600" : "text-green-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
