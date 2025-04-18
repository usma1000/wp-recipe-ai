"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";

const formSchema = z.object({
  ingredients: z.string().min(1, "Ingredients are required"),
  steps: z.string().min(1, "Steps are required"),
  tone: z.string({
    required_error: "Please select a tone",
  }),
});

export default function RecipeForm() {
  const [isMac, setIsMac] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIsMac(/Mac/.test(userAgent));
    setIsMobile(
      /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent)
    );
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ingredients: "",
      steps: "",
      tone: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    alert("Form submitted successfully!");
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        form.handleSubmit(onSubmit)();
      }
    },
    [form]
  );

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">WP Recipe Generator</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="ingredients"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ingredients</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter your ingredients list..."
                    className="min-h-[150px]"
                    onKeyDown={handleKeyDown}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="steps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Steps</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter your recipe steps..."
                    className="min-h-[200px]"
                    onKeyDown={handleKeyDown}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tone</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger onKeyDown={handleKeyDown}>
                      <SelectValue placeholder="Select a tone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="concise">Concise</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            Generate Recipe
            {!isMobile && (
              <span className="ml-2 text-sm opacity-70">
                {isMac ? "⌘" : "Ctrl"} + Enter
              </span>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
