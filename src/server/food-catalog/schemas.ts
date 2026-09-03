import { z } from "zod";

export const foodCreateSchema = z.object({
  name: z.string().min(1).max(120),
  base_unit: z.enum(["g100", "ml100"]),
  kcal: z.coerce.number().min(0),
  protein_g: z.coerce.number().min(0),
  carb_g: z.coerce.number().min(0),
  fat_g: z.coerce.number().min(0),
  fiber_g: z.coerce.number().min(0),
  sodium_mg: z.coerce.number().min(0),
});

export const MEAL_TYPES = ["cafe_da_manha", "almoco", "jantar", "lanche"] as const;

export const mealItemSchema = z.object({
  food_id: z.string().min(1),
  portion_amount: z.coerce.number().positive(),
  portion_unit: z.enum(["g100", "ml100"]),
});

export const mealCreateSchema = z.object({
  meal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  meal_type: z.enum(MEAL_TYPES),
  items: z.array(mealItemSchema).min(1),
});

export const goalsOverrideSchema = z.object({
  kcal: z.coerce.number().min(0),
  protein_g: z.coerce.number().min(0),
  carb_g: z.coerce.number().min(0),
  fat_g: z.coerce.number().min(0),
});

export const aiIntentSchema = z.object({
  intent: z.string().trim().min(1, "O intent é obrigatório"),
});
