"use client"

import * as React from "react"
import { Menu, X } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

import { ScrollArea } from "@/components/ui/scroll-area";

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"

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
      <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-gray-900 text-white">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>
            <VisuallyHidden>Chapter Menu</VisuallyHidden>
          </SheetTitle>
          <SheetDescription>
            <VisuallyHidden>A list of chapters to navigate through the presentation.</VisuallyHidden>
          </SheetDescription>
          <h2 className="text-lg font-semibold">Chapters</h2>
        </SheetHeader>
        <div className="mt-8">
          <ScrollArea className="h-[calc(100vh-10rem)]">
            <ul className="space-y-2">
              {viewSequence.map((view, index) => (
                <li key={view}>
                  <a
                    href="#"
                    onClick={() => handleChapterClick(index)}
                  className={`flex items-center rounded-md px-4 py-2 text-lg font-medium transition-colors
                    ${
                      currentViewIndex === index
                        ? "bg-gray-700 text-white"
                        : "hover:bg-gray-800"
                    }`}
                  >
                    <span className="text-lg font-medium">{viewTitles[view]}</span>
                    <span className="ml-auto text-sm text-gray-400">{index + 1}</span>
                  </a>
                </li>
              ))}
              <li>
                <a href="/chapters" className={`flex items-center rounded-md px-4 py-2 text-lg font-medium transition-colors hover:bg-gray-800`}>
                    <span className="text-lg font-medium">3D Viewers</span>
                </a>
              </li>
            </ul>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
