"use client";

import { IconChevronDown } from "@/components/icons";
import { cn } from "@/lib/cn";
import * as SelectPrimitive from "@radix-ui/react-select";
import type { ComponentProps, ReactNode } from "react";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "inline-flex h-10 w-full min-w-[7.5rem] items-center justify-between gap-2 rounded-md border border-border bg-bg-primary px-3 text-body-sm text-text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bias-right",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "data-[placeholder]:text-text-secondary",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <IconChevronDown size={16} className="shrink-0 text-text-secondary" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          "z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-bg-primary text-text-primary shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn("px-2 py-1.5 text-caption text-text-secondary", className)}
      {...props}
    />
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-body-sm text-text-primary outline-none",
        "focus:bg-surface data-[highlighted]:bg-surface",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

type LabeledSelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  triggerClassName?: string;
  children: ReactNode;
};

/** Convenience wrapper: caption label + shadcn Select trigger/content. */
export function LabeledSelect({
  label,
  value,
  onValueChange,
  placeholder,
  "aria-label": ariaLabel,
  className,
  triggerClassName,
  children,
}: LabeledSelectProps) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1 text-caption text-text-secondary", className)}>
      <span className="truncate">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={ariaLabel ?? label} className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </label>
  );
}
