"use client";

import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { OverlaySlotContent, OverlaySlotKey } from "./slots";
import { OverlayLayout } from "./OverlayLayout";

type SlotEntry = { id: string; node: React.ReactNode };
type SlotMap = Record<OverlaySlotKey, SlotEntry[]>;

type OverlayContextValue = {
  registerSlot: (slot: OverlaySlotKey, id: string, node: React.ReactNode) => void;
  unregisterSlot: (slot: OverlaySlotKey, id: string) => void;
  slots: SlotMap;
};

const emptySlots = (): SlotMap => ({
  "top-left": [],
  "top-center": [],
  "top-right": [],
  "bottom-left": [],
  "bottom-center": [],
  "bottom-right": [],
});

const OverlayContext = createContext<OverlayContextValue>({
  registerSlot: () => undefined,
  unregisterSlot: () => undefined,
  slots: emptySlots(),
});

type OverlayProviderProps = {
  baseSlots?: OverlaySlotContent;
  children: React.ReactNode;
  leftOffsetPx?: number;
  rightOffsetPx?: number;
  topOffsetPx?: number;
  bottomOffsetPx?: number;
};

const isSameNode = (a: React.ReactNode, b: React.ReactNode): boolean => {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a === "string" || typeof a === "number" || typeof a === "boolean") {
    return a === b;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    const aArr = React.Children.toArray(a as React.ReactNode);
    const bArr = React.Children.toArray(b as React.ReactNode);
    if (aArr.length !== bArr.length) return false;
    return aArr.every((child, index) => isSameNode(child, bArr[index]));
  }

  if (React.isValidElement(a) && React.isValidElement(b)) {
    if (a.type !== b.type) return false;

    const { children: aChildren, ...aProps } = a.props ?? {};
    const { children: bChildren, ...bProps } = b.props ?? {};
    const keys = new Set([...Object.keys(aProps), ...Object.keys(bProps)]);
    for (const key of keys) {
      const aVal = aProps[key];
      const bVal = bProps[key];
      if (typeof aVal === "function" && typeof bVal === "function") continue;
      if (aVal !== bVal) return false;
    }
    return isSameNode(aChildren, bChildren);
  }

  return false;
};

export function OverlayProvider({
  baseSlots,
  children,
  leftOffsetPx,
  rightOffsetPx,
  topOffsetPx,
  bottomOffsetPx,
}: OverlayProviderProps) {
  const [slots, setSlots] = useState<SlotMap>(() => emptySlots());

  const registerSlot = useCallback((slot: OverlaySlotKey, id: string, node: React.ReactNode) => {
    setSlots((prev) => {
      const existingEntry = prev[slot].find((entry) => entry.id === id);
      if (existingEntry && isSameNode(existingEntry.node, node)) {
        return prev;
      }
      const nextEntries = existingEntry
        ? prev[slot].map((entry) => (entry.id === id ? { id, node } : entry))
        : [...prev[slot], { id, node }];
      return { ...prev, [slot]: nextEntries };
    });
  }, []);

  const unregisterSlot = useCallback((slot: OverlaySlotKey, id: string) => {
    setSlots((prev) => ({
      ...prev,
      [slot]: prev[slot].filter((entry) => entry.id !== id),
    }));
  }, []);

  const mergedSlots: OverlaySlotContent = useMemo(() => {
    const normalize = (node?: React.ReactNode) => {
      if (!node) return [] as React.ReactNode[];
      return Array.isArray(node) ? node : [node];
    };

    const merge = (slot: OverlaySlotKey) => {
      const baseNodes = normalize(baseSlots?.[slot]).map((node, index) => (
        <React.Fragment key={`base-${slot}-${index}`}>{node}</React.Fragment>
      ));
      const registry = slots[slot].map((entry) => (
        <React.Fragment key={entry.id}>{entry.node}</React.Fragment>
      ));
      if (baseNodes.length === 0 && registry.length === 0) return undefined;
      return [...baseNodes, ...registry];
    };

    return {
      "top-left": merge("top-left"),
      "top-center": merge("top-center"),
      "top-right": merge("top-right"),
      "bottom-left": merge("bottom-left"),
      "bottom-center": merge("bottom-center"),
      "bottom-right": merge("bottom-right"),
    };
  }, [baseSlots, slots]);

  const value = useMemo(
    () => ({ registerSlot, unregisterSlot, slots }),
    [registerSlot, unregisterSlot, slots]
  );

  return (
    <OverlayContext.Provider value={value}>
      <OverlayLayout
        topLeft={mergedSlots["top-left"]}
        topCenter={mergedSlots["top-center"]}
        topRight={mergedSlots["top-right"]}
        bottomLeft={mergedSlots["bottom-left"]}
        bottomCenter={mergedSlots["bottom-center"]}
        bottomRight={mergedSlots["bottom-right"]}
        leftOffsetPx={leftOffsetPx}
        rightOffsetPx={rightOffsetPx}
        topOffsetPx={topOffsetPx}
        bottomOffsetPx={bottomOffsetPx}
      />
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlaySlots() {
  return useContext(OverlayContext).slots;
}

export function useOverlaySlot(slot: OverlaySlotKey, node: React.ReactNode) {
  const id = useId();
  const { registerSlot, unregisterSlot } = useContext(OverlayContext);
  const previousNode = useRef<React.ReactNode>();

  useEffect(() => {
    if (!isSameNode(previousNode.current, node)) {
      registerSlot(slot, id, node);
      previousNode.current = node;
    }
  }, [slot, id, node, registerSlot]);

  useEffect(() => {
    return () => unregisterSlot(slot, id);
  }, [slot, id, unregisterSlot]);
}

export function OverlaySlot({
  slot,
  children,
  wrapperClassName,
}: {
  slot: OverlaySlotKey;
  children: React.ReactNode;
  wrapperClassName?: string;
}) {
  const wrapped = wrapperClassName ? (
    <div className={wrapperClassName}>{children}</div>
  ) : (
    children
  );
  useOverlaySlot(slot, wrapped);
  return null;
}