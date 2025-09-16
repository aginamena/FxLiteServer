import { openai } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import "dotenv/config";
import express from "express";
import nodeCron from "node-cron";
import { z } from "zod";

import db from "./firebase.js";
import { formatterSystemPrompt, jpyPrompt, usdPrompt } from "./prompts.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Schedule task to run at 12 PM and 6 PM from Monday to Friday
nodeCron.schedule("0 12,18 * * 1-5", () => {
  [
    { code: "usd", prompt: usdPrompt },
    { code: "jpy", prompt: jpyPrompt },
  ].map(async ({ code, prompt }) => {
    const { text } = await generateText({
      model: openai.responses("gpt-4o-mini"),
      prompt,
      tools: {
        web_search_preview: openai.tools.webSearch({}),
      },
    });

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      system: formatterSystemPrompt,
      schema: z.object({
        indicators: z.object({
          summary: z
            .string()
            .describe(
              "Detailed summary of key economic indicators, ensuring all important information is included."
            ),
          values: z.array(
            z.object({
              title: z
                .string()
                .describe("The heading or title of the section."),
              text: z
                .string()
                .describe(
                  "A detailed explanation or summary of the content under the heading."
                ),
              url: z
                .string()
                .optional()
                .describe(
                  "Optional source URL for the information. Exclude if not provided."
                ),
            })
          ),
        }),

        trends: z.object({
          summary: z
            .string()
            .describe(
              "Detailed summary of market trends, ensuring no important information is excluded."
            ),
          values: z.array(
            z.object({
              title: z
                .string()
                .describe("The heading or title of the section."),
              text: z
                .string()
                .describe(
                  "A detailed explanation or summary of the content under the heading."
                ),
              url: z
                .string()
                .optional()
                .describe(
                  "Optional source URL for the information. Exclude if not provided."
                ),
            })
          ),
        }),

        policies: z.object({
          summary: z
            .string()
            .describe(
              "Detailed summary of monetary and fiscal policies, ensuring all important details are included."
            ),
          values: z.array(
            z.object({
              title: z
                .string()
                .describe("The heading or title of the section."),
              text: z
                .string()
                .describe(
                  "A detailed explanation or summary of the content under the heading."
                ),
              url: z
                .string()
                .optional()
                .describe(
                  "Optional source URL for the information. Exclude if not provided."
                ),
            })
          ),
        }),

        forecasts: z.object({
          summary: z
            .string()
            .describe(
              "Detailed summary of analyst forecasts and trade implications for USD, ensuring all important details are included."
            ),
          values: z.array(
            z.object({
              title: z
                .string()
                .describe("The heading or title of the section."),
              text: z
                .string()
                .describe(
                  "A detailed explanation or summary of the content under the heading."
                ),
              url: z
                .string()
                .optional()
                .describe(
                  "Optional source URL for the information. Exclude if not provided."
                ),
            })
          ),
        }),
      }),
      prompt: `Format the given text ${text}`,
    });

    await db.collection("countries").doc(code).set(object);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
