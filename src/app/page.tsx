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
import { Loader2, StopCircle } from "lucide-react";

const formSchema = z.object({
  ingredients: z.string().min(1, "Ingredients are required"),
  steps: z.string().min(1, "Steps are required"),
  tone: z.string({
    required_error: "Please select a tone",
  }),
});

const STORAGE_KEY = "recipe-form-data";

type Recipe = {
  name: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  instructions: string[];
};

export default function RecipeForm() {
  const [isMac, setIsMac] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

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
      tone: "neutral", // Set default tone
    },
  });

  // Load saved form data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      form.reset(parsedData);
    }
  }, [form]);

  // Save form data on change
  useEffect(() => {
    const subscription = form.watch((data) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleClear = useCallback(() => {
    form.reset({
      ingredients: "",
      steps: "",
      tone: "neutral",
    });
    setRecipe(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [form]);

  const handleStop = useCallback(() => {
    if (controller) {
      controller.abort();
      setController(null);
      setIsLoading(false);
    }
  }, [controller]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    // Create new abort controller
    const abortController = new AbortController();
    setController(abortController);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        signal: abortController.signal,
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setRecipe(data);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setError("Generation stopped");
      } else {
        setError("Failed to generate recipe. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setController(null);
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isLoading) {
        e.preventDefault();
        form.handleSubmit(onSubmit)();
      }
    },
    [form, isLoading]
  );

  return (
    <div className="container mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                    disabled={isLoading}
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

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Recipe
                    {!isMobile && (
                      <span className="ml-2 text-sm opacity-70">
                        {isMac ? "⌘" : "Ctrl"} + Enter
                      </span>
                    )}
                  </>
                )}
              </Button>
              {isLoading ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleStop}
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={isLoading}
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>

      <div className="border rounded-lg p-6">
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {recipe && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">{recipe.name}</h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Servings:</strong> {recipe.servings}
              </div>
              <div>
                <strong>Prep Time:</strong> {recipe.prepTime} mins
              </div>
              <div>
                <strong>Cook Time:</strong> {recipe.cookTime} mins
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">Ingredients:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {recipe.ingredients.map((ingredient, i) => (
                  <li key={i}>{ingredient}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2">Instructions:</h3>
              <ol className="list-decimal pl-5 space-y-2">
                {recipe.instructions.map((instruction, i) => (
                  <li key={i}>{instruction}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
        {!recipe && !error && !isLoading && (
          <div className="text-center text-gray-500">
            Generated recipe will appear here
          </div>
        )}
      </div>
    </div>
  );
}
