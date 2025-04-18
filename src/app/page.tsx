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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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

function LoadingRecipe() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-3/4" />
        <Separator className="my-4" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-4 w-4 mt-1" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold mb-2 text-center">
          WP Recipe Generator
        </h1>
        <p className="text-muted-foreground mb-8 text-center">
          Transform your ingredients and steps into a beautifully formatted
          recipe
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recipe Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="ingredients"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ingredients</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your ingredients list..."
                            className="min-h-[150px] resize-none"
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
                            className="min-h-[200px] resize-none"
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

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isLoading}
                    >
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
                        className="px-3"
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Recipe</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="text-destructive mb-4 p-4 rounded-lg bg-destructive/10">
                  {error}
                </div>
              )}
              {isLoading && <LoadingRecipe />}
              {recipe && !isLoading && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">{recipe.name}</h2>
                    <Separator className="my-4" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Servings</p>
                      <p className="font-medium">{recipe.servings}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Prep Time</p>
                      <p className="font-medium">{recipe.prepTime} mins</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Cook Time</p>
                      <p className="font-medium">{recipe.cookTime} mins</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-3">Ingredients</h3>
                    <ul className="list-disc pl-5 space-y-2 marker:text-primary">
                      {recipe.ingredients.map((ingredient, i) => (
                        <li key={i} className="pl-2">
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-lg mb-3">Instructions</h3>
                    <ol className="list-decimal pl-5 space-y-3">
                      {recipe.instructions.map((instruction, i) => (
                        <li key={i} className="pl-2">
                          {instruction}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
              {!recipe && !error && !isLoading && (
                <div className="text-center text-muted-foreground py-8">
                  Your generated recipe will appear here
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
