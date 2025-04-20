import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_IP = 20; // Maximum requests per IP per hour
const MAX_TOKENS = 30000; // Maximum tokens per request to prevent very large generations

// Store IP addresses and their request counts
const ipRequests = new Map<string, { count: number; timestamp: number }>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequests.entries()) {
    if (now - data.timestamp > RATE_LIMIT_WINDOW) {
      ipRequests.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const requestData = ipRequests.get(ip);

  if (!requestData) {
    // First request from this IP
    ipRequests.set(ip, { count: 1, timestamp: now });
    return false;
  }

  if (now - requestData.timestamp > RATE_LIMIT_WINDOW) {
    // Reset counter if window has passed
    ipRequests.set(ip, { count: 1, timestamp: now });
    return false;
  }

  if (requestData.count >= MAX_REQUESTS_PER_IP) {
    return true;
  }

  // Increment counter
  requestData.count++;
  return false;
}

function validateInput(ingredients: string, steps: string): string | null {
  if (!ingredients.trim() || !steps.trim()) {
    return "Ingredients and steps are required.";
  }

  // Check combined length to estimate token count (rough estimate)
  const combinedLength = ingredients.length + steps.length;
  if (combinedLength > MAX_TOKENS) {
    return "Input is too long. Please reduce the length of ingredients or steps.";
  }

  return null;
}

export async function POST(req: Request) {
  try {
    // Get client IP
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown";

    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const { ingredients, steps, tone } = await req.json();

    // Validate input
    const validationError = validateInput(ingredients, steps);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const prompt = `Generate a recipe in JSON format based on these ingredients and steps.

IMPORTANT: You must respond with ONLY valid JSON. No other text or explanation.
The JSON must exactly match this structure:
{
  "name": "Recipe name (make it catchy and SEO-friendly)",
  "titleVariations": [
    "Original title",
    "SEO-optimized variation 1",
    "Social media friendly variation 2",
    "Question-based variation 3",
    "How-to variation 4"
  ],
  "servings": "number of servings as string",
  "prepTime": "prep time in minutes as string",
  "cookTime": "cook time in minutes as string",
  "ingredients": [
    "formatted ingredient 1",
    "formatted ingredient 2",
    ...etc
  ],
  "instructions": [
    "formatted step 1",
    "formatted step 2",
    ...etc
  ]
}

Use ${tone} tone for instructions.

Ingredients:
${ingredients}

Steps:
${steps}`;

    console.log("Sending prompt to Gemini:", prompt);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("Raw response from Gemini:", text);

    let cleanText = "";
    try {
      // Clean the response text
      cleanText = text
        .replace(/```json\n?|\n?```/g, "") // Remove code blocks
        .replace(/^[\s\n]*\{/, "{") // Clean start
        .replace(/\}[\s\n]*$/, "}") // Clean end
        .trim();

      console.log("Cleaned text:", cleanText);

      const recipe = JSON.parse(cleanText);

      // Validate the response has the required fields
      const requiredFields = [
        "name",
        "titleVariations",
        "servings",
        "prepTime",
        "cookTime",
        "ingredients",
        "instructions",
      ];
      const missingFields = requiredFields.filter((field) => !recipe[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      // Ensure arrays have content
      if (
        !Array.isArray(recipe.titleVariations) ||
        recipe.titleVariations.length === 0
      ) {
        throw new Error("titleVariations must be a non-empty array");
      }
      if (
        !Array.isArray(recipe.ingredients) ||
        recipe.ingredients.length === 0
      ) {
        throw new Error("ingredients must be a non-empty array");
      }
      if (
        !Array.isArray(recipe.instructions) ||
        recipe.instructions.length === 0
      ) {
        throw new Error("instructions must be a non-empty array");
      }

      return NextResponse.json(recipe);
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.error("Attempted to parse:", cleanText);
      return NextResponse.json(
        {
          error: `Invalid recipe format: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate recipe",
      },
      { status: 500 }
    );
  }
}
