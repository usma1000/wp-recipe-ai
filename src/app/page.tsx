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
  SelectSeparator,
} from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  StopCircle,
  Copy,
  Check,
  Code2,
  Menu,
  Plus,
  Clock,
  Trash2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const formSchema = z.object({
  ingredients: z.string().min(1, "Ingredients are required"),
  steps: z.string().min(1, "Steps are required"),
  tone: z.string({
    required_error: "Please select a tone",
  }),
});

const STORAGE_KEY = "recipe-form-data";
const RECIPE_STORAGE_KEY = "generated-recipe";
const RECIPE_HISTORY_KEY = "recipe-history";

interface Recipe {
  name: string;
  titleVariations: string[];
  servings: string;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  instructions: string[];
}

interface SavedRecipe extends Recipe {
  id: string;
  createdAt: string;
}

interface WPRMIngredient {
  amount: string;
  unit: string;
  name: string;
  notes: string;
  type: "ingredient";
}

interface WPRMInstruction {
  text: string;
  type: "instruction";
  image_url: string;
}

interface WPRMNutrition {
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
  saturated_fat: number;
  cholesterol: number;
  sodium: number;
  potassium: number;
  fiber: number;
  sugar: number;
  vitamin_a: number;
  vitamin_c: number;
  calcium: number;
  iron: number;
}

interface WPRMRecipe {
  type: "food";
  name: string;
  summary: string;
  author_display: "disabled";
  servings: string;
  servings_unit: "servings";
  prep_time: string;
  cook_time: string;
  total_time: string;
  tags: {
    course: string[];
    cuisine: string[];
    keyword: string[];
    difficulty: string[];
  };
  equipment: string[];
  ingredients_flat: WPRMIngredient[];
  instructions_flat: WPRMInstruction[];
  notes: string;
  nutrition: WPRMNutrition;
}

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

function formatRecipeForWPRM(recipe: Recipe): WPRMRecipe {
  return {
    type: "food",
    name: recipe.name,
    summary: "",
    author_display: "disabled",
    servings: recipe.servings,
    servings_unit: "servings",
    prep_time: recipe.prepTime,
    cook_time: recipe.cookTime,
    total_time: (
      parseInt(recipe.prepTime) + parseInt(recipe.cookTime)
    ).toString(),
    tags: {
      course: [],
      cuisine: [],
      keyword: [],
      difficulty: [],
    },
    equipment: [],
    ingredients_flat: recipe.ingredients.map((ingredient) => ({
      amount: "",
      unit: "",
      name: ingredient,
      notes: "",
      type: "ingredient",
    })),
    instructions_flat: recipe.instructions.map((instruction) => ({
      text: instruction,
      type: "instruction",
      image_url: "",
    })),
    notes: "",
    nutrition: {
      calories: 0,
      carbohydrates: 0,
      protein: 0,
      fat: 0,
      saturated_fat: 0,
      cholesterol: 0,
      sodium: 0,
      potassium: 0,
      fiber: 0,
      sugar: 0,
      vitamin_a: 0,
      vitamin_c: 0,
      calcium: 0,
      iron: 0,
    },
  };
}

export default function RecipeForm() {
  const [isMac, setIsMac] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [copied, setCopied] = useState(false);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [recipeHistory, setRecipeHistory] = useState<SavedRecipe[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // Load saved recipe on mount
  useEffect(() => {
    const savedRecipe = localStorage.getItem(RECIPE_STORAGE_KEY);
    if (savedRecipe) {
      setRecipe(JSON.parse(savedRecipe));
    }
  }, []);

  // Save recipe when it changes
  useEffect(() => {
    if (recipe) {
      localStorage.setItem(RECIPE_STORAGE_KEY, JSON.stringify(recipe));
    }
  }, [recipe]);

  // Load recipe history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(RECIPE_HISTORY_KEY);
    if (savedHistory) {
      setRecipeHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save recipe to history only when newly generated
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

      // Create new saved recipe with ID and timestamp
      const newSavedRecipe: SavedRecipe = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      // Update history
      const updatedHistory = [newSavedRecipe, ...recipeHistory];
      setRecipeHistory(updatedHistory);
      localStorage.setItem(RECIPE_HISTORY_KEY, JSON.stringify(updatedHistory));

      // Set as current recipe
      setRecipe(newSavedRecipe);
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

  const handleCopyJson = useCallback(async () => {
    if (!recipe) return;

    const wprmJson = formatRecipeForWPRM(recipe);
    await navigator.clipboard.writeText(JSON.stringify([wprmJson], null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [recipe]);

  const loadRecipe = useCallback(
    (savedRecipe: SavedRecipe) => {
      setRecipe(savedRecipe);
      setSidebarOpen(false);

      // Update form with the loaded recipe's data
      form.reset({
        ingredients: savedRecipe.ingredients.join("\n"),
        steps: savedRecipe.instructions.join("\n"),
        tone: form.getValues("tone"), // Keep the current tone
      });
    },
    [form]
  );

  const deleteRecipe = useCallback(
    (id: string) => {
      const updatedHistory = recipeHistory.filter((r) => r.id !== id);
      setRecipeHistory(updatedHistory);
      localStorage.setItem(RECIPE_HISTORY_KEY, JSON.stringify(updatedHistory));

      // If current recipe is deleted, clear it
      if (recipe && "id" in recipe && (recipe as SavedRecipe).id === id) {
        setRecipe(null);
      }
    },
    [recipeHistory, recipe]
  );

  const startNewRecipe = useCallback(() => {
    handleClear();
    setSidebarOpen(false);
  }, [handleClear]);

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
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <Collapsible
        open={!sidebarCollapsed}
        onOpenChange={(open) => setSidebarCollapsed(!open)}
        className="relative hidden md:block h-screen"
      >
        <div
          className={`h-full flex flex-col border-r bg-muted/40 transition-all duration-300 ${
            sidebarCollapsed ? "w-[50px]" : "w-80"
          }`}
        >
          <div className="flex flex-col gap-2 p-2 border-b">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`shrink-0 w-8 h-8 p-0 transition-transform duration-200`}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            {!sidebarCollapsed ? (
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={startNewRecipe}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Recipe
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0"
                onClick={startNewRecipe}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CollapsibleContent forceMount className="flex-1">
            <div className={`${sidebarCollapsed ? "hidden" : "block"}`}>
              <ScrollArea className="flex-1 h-[calc(100vh-5rem)]">
                <div className="p-4 space-y-2">
                  {recipeHistory.map((savedRecipe) => (
                    <div
                      key={savedRecipe.id}
                      className={`p-3 rounded-lg cursor-pointer flex justify-between items-start hover:bg-muted group ${
                        recipe && "id" in recipe && recipe.id === savedRecipe.id
                          ? "bg-muted"
                          : ""
                      }`}
                      onClick={() => loadRecipe(savedRecipe)}
                    >
                      <div className="space-y-1">
                        <p className="font-medium line-clamp-1">
                          {savedRecipe.name}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {new Date(savedRecipe.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRecipe(savedRecipe.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden absolute left-4 top-4"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Recipe History</SheetTitle>
          </SheetHeader>
          <div className="p-4 border-b">
            <Button
              variant="default"
              className="w-full justify-start"
              onClick={startNewRecipe}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Recipe
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {recipeHistory.map((savedRecipe) => (
                <div
                  key={savedRecipe.id}
                  className={`p-3 rounded-lg cursor-pointer flex justify-between items-start hover:bg-muted group ${
                    recipe &&
                    "id" in recipe &&
                    (recipe as SavedRecipe).id === savedRecipe.id
                      ? "bg-muted"
                      : ""
                  }`}
                  onClick={() => loadRecipe(savedRecipe)}
                >
                  <div className="space-y-1">
                    <p className="font-medium line-clamp-1">
                      {savedRecipe.name}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {new Date(savedRecipe.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRecipe(savedRecipe.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="py-8 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="md:ml-0 ml-8">
              <h1 className="text-4xl font-bold mb-2 text-center">
                WP Recipe Generator
              </h1>
              <p className="text-muted-foreground mb-8 text-center">
                Transform your ingredients and steps into a beautifully
                formatted recipe
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="self-start">
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
                                className="min-h-[150px] resize-none border-gray-400"
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
                                className="min-h-[200px] resize-none border-gray-400"
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
                                <SelectTrigger
                                  onKeyDown={handleKeyDown}
                                  className="border-gray-400"
                                >
                                  <SelectValue placeholder="Select a tone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="neutral">Neutral</SelectItem>
                                <SelectItem value="playful">Playful</SelectItem>
                                <SelectItem value="friendly">
                                  Friendly
                                </SelectItem>
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
                                  ({isMac ? "⌘" : "Ctrl"} + Enter)
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>Generated Recipe</CardTitle>
                  {recipe && !isLoading && (
                    <Dialog
                      open={showJsonDialog}
                      onOpenChange={setShowJsonDialog}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Code2 className="h-4 w-4 mr-2" />
                          Export JSON
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>WP Recipe Maker JSON</DialogTitle>
                          <DialogDescription>
                            Click the Copy button to copy the recipe. Then, in
                            WP Recipe Maker, click the &ldquo;New Recipe&rdquo;
                            button and paste this JSON into the &ldquo;Import
                            from JSON&rdquo; field. You may have to scroll up to
                            see it.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="relative mt-4 w-full overflow-y-auto">
                          <div className="absolute right-4 top-4 z-10">
                            <Button size="sm" onClick={handleCopyJson}>
                              {copied ? (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="rounded-lg border bg-muted max-h-[60vh] overflow-y-auto">
                            <pre className="p-4 text-sm overflow-auto">
                              <code className="block">
                                {JSON.stringify(
                                  [formatRecipeForWPRM(recipe)],
                                  null,
                                  2
                                )}
                              </code>
                            </pre>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
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
                        <Select
                          value={recipe.name}
                          onValueChange={(value) => {
                            const updatedRecipe = {
                              ...recipe,
                              name: value,
                            };
                            setRecipe(updatedRecipe);

                            // Update the recipe in history
                            const updatedHistory = recipeHistory.map((r) =>
                              r.id === recipe.id ? { ...r, name: value } : r
                            );
                            setRecipeHistory(updatedHistory);
                            localStorage.setItem(
                              RECIPE_HISTORY_KEY,
                              JSON.stringify(updatedHistory)
                            );
                          }}
                        >
                          <SelectTrigger className="text-2xl font-bold min-h-[3rem] !h-auto py-2 bg-muted/70 hover:bg-muted transition-colors [&>span]:whitespace-normal data-[size=default]:!h-auto text-left justify-start w-full border border-muted-foreground/20">
                            <SelectValue placeholder="Select a title" />
                          </SelectTrigger>
                          <SelectContent className="max-w-[calc(100vw-4rem)] md:max-w-[600px]">
                            <SelectItem
                              value={recipe.name}
                              className="whitespace-normal"
                            >
                              {recipe.name}
                            </SelectItem>
                            {recipe.titleVariations?.length > 0 && (
                              <>
                                <SelectSeparator />
                                {recipe.titleVariations
                                  .filter((title) => title !== recipe.name)
                                  .map((title, i) => (
                                    <SelectItem
                                      key={i}
                                      value={title}
                                      className="whitespace-normal"
                                    >
                                      {title}
                                    </SelectItem>
                                  ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
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
                        <h3 className="font-semibold text-lg mb-3">
                          Ingredients
                        </h3>
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
                        <h3 className="font-semibold text-lg mb-3">
                          Instructions
                        </h3>
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
      </div>
    </div>
  );
}
