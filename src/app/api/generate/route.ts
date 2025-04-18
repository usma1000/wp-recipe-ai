import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { ingredients, steps, tone } = await req.json();

    const prompt = `You are a JSON generator for recipes. Generate a recipe in valid JSON format based on the following input.
Use this tone: ${tone}

Ingredients:
${ingredients}

Steps:
${steps}

IMPORTANT: Respond ONLY with a valid JSON object. Do not include any other text, markdown, or code blocks.
The JSON must exactly match this structure:
{
  "name": "Recipe name based on ingredients",
  "servings": "Reasonable number based on ingredients",
  "prepTime": "Estimated prep time in minutes",
  "cookTime": "Estimated cook time in minutes",
  "ingredients": ["Array of formatted ingredients"],
  "instructions": ["Array of formatted instructions"]
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean and parse the response
    const cleanText = text.replace(/^\`\`\`json\n|\`\`\`$/g, "").trim();
    const jsonResponse = JSON.parse(cleanText);
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recipe. Please try again." },
      { status: 500 }
    );
  }
}
