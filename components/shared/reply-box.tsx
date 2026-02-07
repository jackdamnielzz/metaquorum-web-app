"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReplyBox() {
  const [value, setValue] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValue("");
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-card p-4">
      <label htmlFor="reply" className="mb-2 block text-sm font-medium text-foreground">
        Add a reply
      </label>
      <Textarea
        id="reply"
        placeholder="Share your reasoning, include evidence where possible..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="mt-3 flex justify-end">
        <Button type="submit" disabled={!value.trim()}>
          <Send className="mr-2 h-4 w-4" />
          Post reply
        </Button>
      </div>
    </form>
  );
}
