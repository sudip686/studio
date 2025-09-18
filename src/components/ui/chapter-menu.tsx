"use client"

import * as React from "react"
import { Menu, X } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface ChapterMenuProps {
  viewSequence: readonly string[];
  viewTitles: { [key: string]: string };
  currentViewIndex: number;
  setCurrentViewIndex: (index: number) => void;
}

export function ChapterMenu({ viewSequence, viewTitles, currentViewIndex, setCurrentViewIndex }: ChapterMenuProps) {
  const [open, setOpen] = React.useState(false)

  const handleChapterClick = (index: number) => {
    setCurrentViewIndex(index)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white bg-black bg-opacity-50 rounded-full h-12 w-12 z-50">
          <Menu />
          <span className="sr-only">Toggle Chapter Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>
            <VisuallyHidden>Chapter Menu</VisuallyHidden>
          </SheetTitle>
          <h2 className="text-lg font-semibold">Chapters</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X />
            <span className="sr-only">Close</span>
          </Button>
        </SheetHeader>
        <div className="mt-8">
          <ul className="space-y-2">
            {viewSequence.map((view, index) => (
              <li key={view}>
                <a
                  href="#"
                  onClick={() => handleChapterClick(index)}
                  className={`flex items-center rounded-md px-4 py-2 text-lg font-medium transition-colors
                    ${
                      currentViewIndex === index
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                >
                  <span className="mr-4 text-2xl font-bold">{index + 1}</span>
                  <span>{viewTitles[view]}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  )
}
