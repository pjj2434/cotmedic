"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function parseYmd(value: string): Date | undefined {
  if (!value.trim()) return undefined
  const d = parse(value.trim(), "yyyy-MM-dd", new Date())
  return isValid(d) ? d : undefined
}

export function ReportDateField({
  value,
  onChange,
  placeholder,
  id,
  className,
}: {
  value: string
  onChange: (ymd: string) => void
  placeholder: string
  id?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = parseYmd(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-7 min-h-7 w-full min-w-0 justify-start gap-1.5 rounded-md border-zinc-200 px-2 text-xs font-normal text-zinc-700",
            !value && "text-zinc-500",
            className
          )}
        >
          <CalendarIcon className="size-3 shrink-0 opacity-70" />
          {selected ? format(selected, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            if (d) onChange(format(d, "yyyy-MM-dd"))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
